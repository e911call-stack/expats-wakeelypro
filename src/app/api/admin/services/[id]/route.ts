import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { serviceUpdateSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id] — full detail (no nested children).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const service = await prisma.legalService.findUnique({
      where: { id },
      include: { practiceArea: { select: { id: true, slug: true, nameAr: true, nameEn: true } } },
    });
    if (!service) return notFound("service_not_found");
    return NextResponse.json({ service });
  } catch (e) {
    return handleApiError("admin-services.detail", e);
  }
}

/**
 * PATCH /api/admin/services/[id] — partial update.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = serviceUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    if (d.slug !== undefined || d.code !== undefined) {
      const dup = await prisma.legalService.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(d.slug !== undefined ? [{ slug: d.slug }] : []),
            ...(d.code !== undefined ? [{ code: d.code }] : []),
          ],
        },
        select: { slug: true, code: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: "slug_or_code_taken", slug: d.slug, code: d.code },
          { status: 409 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (d.slug !== undefined) data.slug = d.slug;
    if (d.code !== undefined) data.code = d.code;
    if (d.nameAr !== undefined) data.nameAr = d.nameAr;
    if (d.nameEn !== undefined) data.nameEn = d.nameEn;
    if (d.shortAr !== undefined) data.shortAr = d.shortAr;
    if (d.shortEn !== undefined) data.shortEn = d.shortEn;
    if (d.descriptionAr !== undefined) data.descriptionAr = d.descriptionAr;
    if (d.descriptionEn !== undefined) data.descriptionEn = d.descriptionEn;
    if (d.practiceAreaId !== undefined) data.practiceAreaId = d.practiceAreaId ?? null;
    if (d.defaultRemoteEligibility !== undefined) data.defaultRemoteEligibility = d.defaultRemoteEligibility;
    if (d.platformFeeDefault !== undefined) data.platformFeeDefault = d.platformFeeDefault;
    if (d.lawyerFeeMin !== undefined) data.lawyerFeeMin = d.lawyerFeeMin;
    if (d.lawyerFeeMax !== undefined) data.lawyerFeeMax = d.lawyerFeeMax;
    if (d.governmentFeeEstimate !== undefined) data.governmentFeeEstimate = d.governmentFeeEstimate;
    if (d.governmentFeeNoteAr !== undefined) data.governmentFeeNoteAr = nullableText(d.governmentFeeNoteAr);
    if (d.governmentFeeNoteEn !== undefined) data.governmentFeeNoteEn = nullableText(d.governmentFeeNoteEn);
    if (d.typicalDurationDays !== undefined) data.typicalDurationDays = d.typicalDurationDays;
    if (d.isActive !== undefined) data.isActive = d.isActive;
    if (d.isFeatured !== undefined) data.isFeatured = d.isFeatured;
    if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;

    const service = await prisma.legalService.update({
      where: { id },
      data: data as never,
    });

    await audit("service.update", "LegalService", id, { actorId: session.id });
    return NextResponse.json({ service });
  } catch (e) {
    return handleApiError("admin-services.update", e);
  }
}

/**
 * DELETE /api/admin/services/[id] — soft delete (isActive=false).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const existing = await prisma.legalService.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return notFound("service_not_found");

    const service = await prisma.legalService.update({
      where: { id },
      data: { isActive: false },
    });

    await audit("service.deactivate", "LegalService", id, { actorId: session.id });
    return NextResponse.json({ ok: true, service });
  } catch (e) {
    return handleApiError("admin-services.delete", e);
  }
}
