import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/lawyer/matters — lists matters assigned to the current lawyer.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (session.role !== "LAWYER" || !session.lawyerId) {
      return NextResponse.json({ matters: [] });
    }

    const matters = await prisma.legalMatter.findMany({
      where: { lawyerId: session.lawyerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        legalService: { select: { id: true, slug: true, nameAr: true, nameEn: true, code: true } },
        legalProcedure: { select: { remoteEligibility: true, nameAr: true, nameEn: true } },
        practiceArea: { select: { slug: true, nameAr: true, nameEn: true } },
        jurisdiction: { select: { code: true, nameAr: true, nameEn: true } },
        client: { select: { id: true, name: true, email: true, currentCountry: true, clientStatus: true } },
        _count: { select: { documents: true, tasks: true, timelineEvents: true, conversations: true } },
        tasks: {
          where: { status: { in: ["pending", "in_progress", "blocked"] } },
          select: { id: true, titleAr: true, titleEn: true, status: true, dueDate: true, requiresPhysicalPresence: true },
        },
      },
    });

    const result = matters.map((m) => ({
      ...m,
      openTaskCount: m.tasks.length,
      tasks: m.tasks.slice(0, 5),
    }));

    return NextResponse.json({ matters: result });
  } catch (e) {
    return handleApiError("lawyer-matters.list", e);
  }
}
