import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/lawyer/matters — lists matters assigned to the current lawyer,
 * with document-review + earnings summaries for the dashboard.
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
        documents: {
          where: { reviewStatus: { in: ["pending", "needs_resubmission"] } },
          select: { id: true, fileName: true, requirementSlug: true, reviewStatus: true, createdAt: true },
        },
        payments: {
          where: { kind: "lawyer_fee", status: "PAID" },
          select: { amountJOD: true },
        },
      },
    });

    const result = matters.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      remoteEligibility: m.remoteEligibility,
      clientCountry: m.clientCountry,
      clientStatus: m.clientStatus,
      progressPercent: m.progressPercent,
      createdAt: m.createdAt,
      legalService: m.legalService,
      legalProcedure: m.legalProcedure,
      practiceArea: m.practiceArea,
      jurisdiction: m.jurisdiction,
      client: m.client,
      _count: m._count,
      openTaskCount: m.tasks.length,
      tasks: m.tasks.slice(0, 5),
      documentsAwaitingReview: m.documents.length,
      documents: m.documents.slice(0, 5),
      earnedJOD: m.payments.reduce((sum, p) => sum + p.amountJOD, 0),
    }));

    const summary = {
      openMatters: matters.filter((m) => !["delivered", "cancelled", "closed", "resolved"].includes(m.status)).length,
      openTasks: matters.reduce((sum, m) => sum + m.tasks.length, 0),
      awaitingReview: matters.reduce((sum, m) => sum + m.documents.length, 0),
      earnedJOD: result.reduce((sum, m) => sum + m.earnedJOD, 0),
    };

    return NextResponse.json({ matters: result, summary });
  } catch (e) {
    return handleApiError("lawyer-matters.list", e);
  }
}
