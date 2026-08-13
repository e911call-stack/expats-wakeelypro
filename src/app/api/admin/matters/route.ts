import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/admin/matters — ADMIN list of all matters with filters.
 * Query: ?search=&status=&service=&assigned=true|false&needsAssignment=true&from=&to=&page=&perPage=
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const status = sp.get("status") ?? "";
    const service = sp.get("service") ?? "";
    const assigned = sp.get("assigned");
    const needsAssignment = sp.get("needsAssignment") === "true";
    const from = sp.get("from") ? new Date(sp.get("from") as string) : null;
    const to = sp.get("to") ? new Date(sp.get("to") as string) : null;
    const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
    const perPage = Math.min(100, Math.max(1, Number(sp.get("perPage") ?? 25) || 25));

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        { client: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status) where.status = status;
    if (service) where.legalServiceId = service;
    if (assigned === "true") where.lawyerId = { not: null };
    else if (assigned === "false") where.lawyerId = null;
    if (needsAssignment) {
      where.lawyerId = null;
      where.status = {
        in: ["new_matter", "service_recommended", "remote_eligibility_check"],
      };
    }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [matters, total] = await Promise.all([
      prisma.legalMatter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          legalService: { select: { id: true, slug: true, nameAr: true, nameEn: true, code: true } },
          legalProcedure: { select: { id: true, nameAr: true, nameEn: true, remoteEligibility: true } },
          practiceArea: { select: { slug: true, nameAr: true, nameEn: true } },
          jurisdiction: { select: { code: true, nameAr: true, nameEn: true } },
          client: { select: { id: true, name: true, email: true, phone: true, currentCountry: true, clientStatus: true } },
          lawyer: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
          _count: { select: { documents: true, tasks: true, timelineEvents: true, conversations: true, payments: true } },
        },
      }),
      prisma.legalMatter.count({ where }),
    ]);

    return NextResponse.json({ matters, total, page, perPage });
  } catch (e) {
    return handleApiError("admin-matters.list", e);
  }
}
