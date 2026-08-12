import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/legal/matters/[id]/messages — get matter conversation + messages.
 * POST /api/legal/matters/[id]/messages — send a message in the matter conversation.
 *   Body: { body: string }
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, lawyerId: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isClient = matter.clientId === session.id;
    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isClient && !isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let conversation = await prisma.conversation.findFirst({
      where: { matterId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          kind: "matter",
          clientUserId: matter.clientId,
          lawyerId: matter.lawyerId ?? null,
          matterId,
        },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
      });
    }

    return NextResponse.json({ conversation });
  } catch (e) {
    return handleApiError("legal-matters.messages.list", e);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

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
    const text = String(body.body ?? "").trim();
    if (text.length < 1) return NextResponse.json({ error: "body too short" }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: "body too long" }, { status: 400 });

    let conversation = await prisma.conversation.findFirst({ where: { matterId } });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { kind: "matter", clientUserId: matter.clientId, lawyerId: matter.lawyerId ?? null, matterId },
      });
    }

    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: session.id, body: text },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Notify the other party
    // NOTE: In your repo, LawyerProfile.userId is the user id of the lawyer.
    const notifyUserId = isClient ? (matter.lawyerId ? (await prisma.lawyerProfile.findUnique({ where: { id: matter.lawyerId }, select: { userId: true } }))?.userId : null) : matter.clientId;
    if (notifyUserId) {
      await prisma.notification.create({
        data: {
          userId: notifyUserId, kind: "new_message",
          title: session.role === "LAWYER" ? `رسالة جديدة في: ${matter.title}` : `New message in: ${matter.title}`,
          body: text.slice(0, 200),
          link: `/matters/${matterId}`,
          metadata: { matterId, conversationId: conversation.id } as object,
        },
      });
    }

    await addTimelineEvent({
      matterId, eventType: "message_sent",
      titleAr: "رسالة جديدة", titleEn: "New message",
      descriptionAr: text.slice(0, 200), descriptionEn: text.slice(0, 200),
      actorId: session.id, actorRole: session.role === "LAWYER" ? "lawyer" : "client",
      metadata: { messageId: message.id, conversationId: conversation.id },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return handleApiError("legal-matters.messages.send", e);
  }
}
