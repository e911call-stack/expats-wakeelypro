import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { recomputeMatterProgress, addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string; taskId: string }> }

/**
 * PATCH /api/legal/matters/[id]/tasks/[taskId]
 * Update task status. Triggers progress recompute + timeline event.
 * Body: { status: "pending"|"in_progress"|"completed"|"blocked"|"skipped" }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId, taskId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, lawyerId: true, title: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isClient = matter.clientId === session.id;
    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isClient && !isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const validStatuses = ["pending", "in_progress", "completed", "blocked", "skipped"];
    const status = String(body.status ?? "");
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const task = await prisma.matterTask.findUnique({ where: { id: taskId } });
    if (!task || task.matterId !== matterId) {
      return NextResponse.json({ error: "task_not_found" }, { status: 404 });
    }

    const updated = await prisma.matterTask.update({
      where: { id: taskId },
      data: {
        status: status as "pending" | "in_progress" | "completed" | "blocked" | "skipped",
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    const progress = await recomputeMatterProgress(matterId);

    await addTimelineEvent({
      matterId, eventType: "task_completed",
      titleAr: status === "completed" ? `تم إنجاز: ${task.titleAr}` : `تم تحديث: ${task.titleAr}`,
      titleEn: status === "completed" ? `Completed: ${task.titleEn}` : `Updated: ${task.titleEn}`,
      actorId: session.id,
      actorRole: session.role === "LAWYER" ? "lawyer" : session.role === "ADMIN" ? "admin" : "client",
      metadata: { taskId, oldStatus: task.status, newStatus: status },
    });

    return NextResponse.json({ task: updated, progress });
  } catch (e) {
    return handleApiError("legal-matters.task-update", e);
  }
}
