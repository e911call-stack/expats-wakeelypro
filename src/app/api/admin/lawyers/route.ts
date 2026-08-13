import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/admin/lawyers — ADMIN list of all lawyer profiles.
 * Query: ?search=&verified=true|false
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const verified = sp.get("verified");

    const where: Record<string, unknown> = {};
    if (verified === "true") where.verified = true;
    else if (verified === "false") where.verified = false;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { barNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const lawyers = await prisma.lawyerProfile.findMany({
      where,
      orderBy: [{ verified: "desc" }, { rating: "desc" }],
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isVerified: true } },
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
      specialties: l.specialties,
      cities: l.cities,
      languages: l.languages,
      hourlyRate: l.hourlyRate,
      yearsExperience: l.yearsExperience,
      verified: l.verified,
      isAvailable: l.isAvailable,
      handlesRemoteMatters: l.handlesRemoteMatters,
      rating: l.rating,
      totalReviews: l.totalReviews,
      avatarUrl: l.avatarUrl,
      createdAt: l.createdAt,
      activeMattersCount: l._count.assignedMatters,
      practiceAreas: l.practiceAreas.map((pa) => pa.practiceArea),
      user: l.user,
    }));

    return NextResponse.json({ lawyers: result });
  } catch (e) {
    return handleApiError("admin-lawyers.list", e);
  }
}
