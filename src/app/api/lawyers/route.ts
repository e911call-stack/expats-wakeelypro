import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError, unauthorized } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/lawyers — lists verified lawyers who handle remote matters.
 * Used by the admin's assign-lawyer dropdown.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return unauthorized();

    const lawyers = await prisma.lawyerProfile.findMany({
      where: { verified: true, isAvailable: true, handlesRemoteMatters: true },
      orderBy: [{ rating: "desc" }, { totalReviews: "desc" }],
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        practiceAreas: {
          include: { practiceArea: { select: { slug: true, nameAr: true, nameEn: true } } },
        },
        _count: { select: { assignedMatters: true } },
      },
    });

    const result = lawyers.map((l) => ({
      id: l.id,
      barNumber: l.barNumber,
      bioAr: l.bioAr,
      bioEn: l.bioEn,
      name: l.user.name,
      email: l.user.email,
      phone: l.user.phone,
      cities: l.cities,
      specialties: l.specialties,
      languages: l.languages,
      hourlyRate: l.hourlyRate,
      yearsExperience: l.yearsExperience,
      rating: l.rating,
      totalReviews: l.totalReviews,
      activeMattersCount: l._count.assignedMatters,
      practiceAreas: l.practiceAreas.map((pa) => pa.practiceArea),
    }));

    return NextResponse.json({ lawyers: result });
  } catch (e) {
    return handleApiError("lawyers.list", e);
  }
}
