import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/admin/payments — ADMIN list of all payments with filters.
 * Query: ?status=&kind=&search=&from=&to=
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? "";
    const kind = sp.get("kind") ?? "";
    const search = sp.get("search")?.trim() ?? "";
    const from = sp.get("from") ? new Date(sp.get("from") as string) : null;
    const to = sp.get("to") ? new Date(sp.get("to") as string) : null;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (kind) where.kind = kind;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
        { description: { contains: search, mode: "insensitive" } },
        { providerRef: { contains: search, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        matter: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ payments });
  } catch (e) {
    return handleApiError("admin-payments.list", e);
  }
}
