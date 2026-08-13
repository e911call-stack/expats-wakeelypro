import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { documentRequirementSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id]/documents — list document requirements of a service.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const documents = await prisma.legalDocumentRequirement.findMany({
      where: { legalServiceId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ documents });
  } catch (e) {
    return handleApiError("admin-services.documents.list", e);
  }
}

/**
 * POST /api/admin/services/[id]/documents — create a document requirement.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const service = await prisma.legalService.findUnique({ where: { id }, select: { id: true } });
    if (!service) return notFound("service_not_found");

    const body = await req.json().catch(() => ({}));
    const parsed = documentRequirementSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const existing = await prisma.legalDocumentRequirement.findUnique({
      where: { legalServiceId_slug: { legalServiceId: id, slug: d.slug } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "slug_taken", slug: d.slug }, { status: 409 });
    }

    const document = await prisma.legalDocumentRequirement.create({
      data: {
        legalServiceId: id,
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

    await audit("service.document.create", "LegalDocumentRequirement", document.id, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    return handleApiError("admin-services.documents.create", e);
  }
}
