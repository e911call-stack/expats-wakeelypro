import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { documentRequirementSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string; docId: string }>;
}

/**
 * PATCH /api/admin/services/[id]/documents/[docId] — update a document requirement.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id, docId } = await params;
    const doc = await prisma.legalDocumentRequirement.findUnique({
      where: { id: docId },
      select: { id: true, slug: true, legalServiceId: true },
    });
    if (!doc || doc.legalServiceId !== id) {
      return notFound("document_not_found");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = documentRequirementSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    if (d.slug !== doc.slug) {
      const dup = await prisma.legalDocumentRequirement.findUnique({
        where: { legalServiceId_slug: { legalServiceId: id, slug: d.slug } },
        select: { id: true },
      });
      if (dup && dup.id !== docId) {
        return NextResponse.json({ error: "slug_taken", slug: d.slug }, { status: 409 });
      }
    }

    const document = await prisma.legalDocumentRequirement.update({
      where: { id: docId },
      data: {
        slug: d.slug,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        descriptionAr: nullableText(d.descriptionAr),
        descriptionEn: nullableText(d.descriptionEn),
        isRequired: d.isRequired,
        provider: d.provider,
        stage: d.stage,
        acceptsDigital: d.acceptsDigital,
        requiresOriginal: d.requiresOriginal,
        requiresNotarization: d.requiresNotarization,
        requiresApostille: d.requiresApostille,
        sortOrder: d.sortOrder,
      },
    });

    await audit("service.document.update", "LegalDocumentRequirement", docId, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ document });
  } catch (e) {
    return handleApiError("admin-services.documents.update", e);
  }
}

/**
 * DELETE /api/admin/services/[id]/documents/[docId] — delete a document requirement.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id, docId } = await params;
    const doc = await prisma.legalDocumentRequirement.findUnique({
      where: { id: docId },
      select: { id: true, legalServiceId: true },
    });
    if (!doc || doc.legalServiceId !== id) {
      return notFound("document_not_found");
    }

    await prisma.legalDocumentRequirement.delete({ where: { id: docId } });
    await audit("service.document.delete", "LegalDocumentRequirement", docId, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError("admin-services.documents.delete", e);
  }
}
