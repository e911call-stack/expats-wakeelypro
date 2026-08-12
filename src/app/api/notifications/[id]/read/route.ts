import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * PATCH /api/notifications/[id]/read — mark a single notification as read.
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await params;

    const notif = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!notif) return NextResponse.json({ error: "notification_not_found" }, { status: 404 });
    if (notif.userId !== session.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ notification: updated });
  } catch (e) {
    return handleApiError("notifications.mark-read", e);
  }
}
