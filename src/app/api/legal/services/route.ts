import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/legal/services
 * Returns all active legal services, bilingual, with procedure + fee breakdown.
 */
export async function GET() {
  try {
    const services = await prisma.legalService.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        practiceArea: { select: { slug: true, nameAr: true, nameEn: true } },
        procedures: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { documentRequirements: true } },
      },
    });

    const result = services.map((s) => ({
      id: s.id, slug: s.slug, code: s.code,
      nameAr: s.nameAr, nameEn: s.nameEn,
      shortAr: s.shortAr, shortEn: s.shortEn,
      descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn,
      remoteEligibility: s.defaultRemoteEligibility,
      platformFeeDefault: s.platformFeeDefault,
      lawyerFeeMin: s.lawyerFeeMin, lawyerFeeMax: s.lawyerFeeMax,
      governmentFeeEstimate: s.governmentFeeEstimate,
      governmentFeeNoteAr: s.governmentFeeNoteAr, governmentFeeNoteEn: s.governmentFeeNoteEn,
      typicalDurationDays: s.typicalDurationDays,
      isFeatured: s.isFeatured, sortOrder: s.sortOrder,
      practiceArea: s.practiceArea,
      procedure: s.procedures[0] ?? null,
      documentCount: s._count.documentRequirements,
    }));

    return NextResponse.json({ services: result });
  } catch (e) {
    return handleApiError("legal-services.list", e);
  }
}
