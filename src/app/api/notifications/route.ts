import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/notifications — list current user's notifications with unread count.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: session.id, readAt: null },
      }),
    ]);

    return NextResponse.json({ notifications: items, unreadCount });
  } catch (e) {
    return handleApiError("notifications.list", e);
  }
}
