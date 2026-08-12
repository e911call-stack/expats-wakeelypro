import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/legal/matters/[id]/timeline — add a note to the timeline.
 * Allowed for: assigned lawyer, admin, client (the matter owner).
 * Body: { noteAr?, noteEn?, eventType? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, lawyerId: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    const isClient = matter.clientId === session.id;
    if (!isAssignedLawyer && !isAdmin && !isClient) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const noteAr = body.noteAr ? String(body.noteAr) : null;
    const noteEn = body.noteEn ? String(body.noteEn) : null;
    const eventType = body.eventType ? String(body.eventType) : "note_added";

    if (!noteAr && !noteEn) {
      return NextResponse.json({ error: "noteAr or noteEn required" }, { status: 400 });
    }

    const event = await addTimelineEvent({
      matterId, eventType,
      titleAr: noteAr ?? noteEn ?? "ملاحظة",
      titleEn: noteEn ?? noteAr ?? "Note",
      descriptionAr: noteAr, descriptionEn: noteEn,
      actorId: session.id,
      actorRole: session.role === "LAWYER" ? "lawyer" : session.role === "ADMIN" ? "admin" : "client",
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    return handleApiError("legal-matters.timeline-add", e);
  }
}
