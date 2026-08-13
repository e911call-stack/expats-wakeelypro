import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { serializeProcedure, stringifySteps, nullableText } from "@/lib/admin/services";
import { procedureSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id]/procedures — list procedures of a service (steps parsed).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const procedures = await prisma.legalProcedure.findMany({
      where: { legalServiceId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ procedures: procedures.map(serializeProcedure) });
  } catch (e) {
    return handleApiError("admin-services.procedures.list", e);
  }
}

/**
 * POST /api/admin/services/[id]/procedures — create a procedure for a service.
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
    const parsed = procedureSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const existing = await prisma.legalProcedure.findUnique({ where: { slug: d.slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "slug_taken", slug: d.slug }, { status: 409 });
    }

    const procedure = await prisma.legalProcedure.create({
      data: {
        legalServiceId: id,
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

    await audit("service.procedure.create", "LegalProcedure", procedure.id, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ procedure: serializeProcedure(procedure) }, { status: 201 });
  } catch (e) {
    return handleApiError("admin-services.procedures.create", e);
  }
}
