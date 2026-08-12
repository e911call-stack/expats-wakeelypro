import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/legal/matters/[id] — full matter dashboard data.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id },
      include: {
        legalService: {
          include: {
            documentRequirements: { orderBy: { sortOrder: "asc" } },
            officialSources: { include: { officialSource: true } },
          },
        },
        legalProcedure: true,
        practiceArea: true,
        jurisdiction: true,
        client: { select: { id: true, name: true, email: true, phone: true, currentCountry: true, currentCity: true, clientStatus: true, language: true } },
        lawyer: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        documents: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { sortOrder: "asc" } },
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 50 },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
        },
        payments: { orderBy: { createdAt: "desc" } },
        intake: { select: { id: true, rawText: true, confidence: true } },
      },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    // Authorization
    const isClient = matter.clientId === session.id;
    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isClient && !isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Strip lawyer-only fields when the requester is the client
    if (isClient && !isAdmin) {
      const { lawyerNotes, ...clientSafe } = matter as typeof matter & { lawyerNotes?: string };
      void lawyerNotes;
      return NextResponse.json({ matter: clientSafe });
    }

    return NextResponse.json({ matter });
  } catch (e) {
    return handleApiError("legal-matters.detail", e);
  }
}
