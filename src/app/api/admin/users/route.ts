import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/admin/users — ADMIN list of users.
 * Query: ?search=&role=
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const role = sp.get("role") ?? "";

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        lawyerProfile: { select: { id: true, verified: true, isAvailable: true, barNumber: true } },
        _count: { select: { legalMatters: true, payments: true } },
      },
    });

    const result = users.map((u) => ({
      id: u.id,
      phone: u.phone,
      email: u.email,
      name: u.name,
      role: u.role,
      language: u.language,
      isVerified: u.isVerified,
      currentCountry: u.currentCountry,
      clientStatus: u.clientStatus,
      createdAt: u.createdAt,
      lawyerProfile: u.lawyerProfile,
      mattersCount: u._count.legalMatters,
      paymentsCount: u._count.payments,
    }));

    return NextResponse.json({ users: result });
  } catch (e) {
    return handleApiError("admin-users.list", e);
  }
}
