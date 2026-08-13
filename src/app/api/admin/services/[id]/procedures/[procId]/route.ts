import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { serializeProcedure, stringifySteps, nullableText } from "@/lib/admin/services";
import { procedureSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string; procId: string }>;
}

/**
 * PATCH /api/admin/services/[id]/procedures/[procId] — update a procedure.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id, procId } = await params;
    const procedure = await prisma.legalProcedure.findUnique({
      where: { id: procId },
      select: { id: true, slug: true, legalServiceId: true },
    });
    if (!procedure || procedure.legalServiceId !== id) {
      return notFound("procedure_not_found");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = procedureSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    if (d.slug !== procedure.slug) {
      const dup = await prisma.legalProcedure.findFirst({
        where: { slug: d.slug, id: { not: procId } },
        select: { id: true },
      });
      if (dup) return NextResponse.json({ error: "slug_taken", slug: d.slug }, { status: 409 });
    }

    const updated = await prisma.legalProcedure.update({
      where: { id: procId },
      data: {
        slug: d.slug,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        remoteEligibility: d.remoteEligibility,
        remoteEligibilityReasonAr: d.remoteEligibilityReasonAr,
        remoteEligibilityReasonEn: d.remoteEligibilityReasonEn,
        physicalPresenceSteps: stringifySteps(d.physicalPresenceSteps),
        remoteSteps: stringifySteps(d.remoteSteps),
        authorityAr: nullableText(d.authorityAr),
        authorityEn: nullableText(d.authorityEn),
        estimatedDurationDays: d.estimatedDurationDays,
        legalBasisAr: nullableText(d.legalBasisAr),
        legalBasisEn: nullableText(d.legalBasisEn),
        notesAr: nullableText(d.notesAr),
        notesEn: nullableText(d.notesEn),
        sortOrder: d.sortOrder,
      },
    });

    await audit("service.procedure.update", "LegalProcedure", procId, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ procedure: serializeProcedure(updated) });
  } catch (e) {
    return handleApiError("admin-services.procedures.update", e);
  }
}

/**
 * DELETE /api/admin/services/[id]/procedures/[procId] — delete a procedure.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id, procId } = await params;
    const procedure = await prisma.legalProcedure.findUnique({
      where: { id: procId },
      select: { id: true, legalServiceId: true },
    });
    if (!procedure || procedure.legalServiceId !== id) {
      return notFound("procedure_not_found");
    }

    await prisma.legalProcedure.delete({ where: { id: procId } });
    await audit("service.procedure.delete", "LegalProcedure", procId, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError("admin-services.procedures.delete", e);
  }
}
