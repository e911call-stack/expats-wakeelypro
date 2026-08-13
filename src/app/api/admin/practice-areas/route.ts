import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/admin/practice-areas — active practice areas (for form selects).
 */
export async function GET() {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const practiceAreas = await prisma.practiceArea.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, nameAr: true, nameEn: true },
    });
    return NextResponse.json({ practiceAreas });
  } catch (e) {
    return handleApiError("admin-practice-areas.list", e);
  }
}
