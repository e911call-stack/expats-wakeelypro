import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * POST /api/notifications/read-all — mark all of the current user's unread notifications as read.
 */
export async function POST() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const result = await prisma.notification.updateMany({
      where: { userId: session.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e) {
    return handleApiError("notifications.mark-all-read", e);
  }
}
