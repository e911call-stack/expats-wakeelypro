import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/legal/matters/[id]/assign — admin assigns a lawyer to a matter.
 * Body: { lawyerId: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id: matterId } = await params;
    const body = await req.json().catch(() => ({}));
    const lawyerId = String(body.lawyerId ?? "");
    if (!lawyerId) return NextResponse.json({ error: "lawyerId required" }, { status: 400 });

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, title: true, clientId: true, status: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const lawyer = await prisma.lawyerProfile.findUnique({
      where: { id: lawyerId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!lawyer) return NextResponse.json({ error: "lawyer_not_found" }, { status: 404 });
    if (!lawyer.verified || !lawyer.handlesRemoteMatters) {
      return NextResponse.json({ error: "lawyer not eligible (must be verified + handles remote matters)" }, { status: 400 });
    }

    const advanceFromStatuses = ["new_matter", "service_recommended", "remote_eligibility_check"];
    const newStatus = advanceFromStatuses.includes(matter.status) ? "lawyer_assigned" : matter.status;

    await prisma.legalMatter.update({
      where: { id: matterId },
      data: { lawyerId, status: newStatus },
    });

    await addTimelineEvent({
      matterId, eventType: "lawyer_assigned",
      titleAr: `تم إسناد المحامي: ${lawyer.user.name}`, titleEn: `Lawyer assigned: ${lawyer.user.name}`,
      descriptionAr: `تم إسناد المحامي ${lawyer.user.name} (رقم القيد ${lawyer.barNumber}) للقضية.`,
      descriptionEn: `Lawyer ${lawyer.user.name} (bar #${lawyer.barNumber}) has been assigned to the matter.`,
      actorId: session.id, actorRole: "admin",
      metadata: { lawyerId, lawyerName: lawyer.user.name, barNumber: lawyer.barNumber },
    });

    await prisma.notification.create({
      data: {
        userId: lawyer.user.id, kind: "lawyer_assigned",
        title: `New matter assigned: ${matter.title}`,
        body: `You have been assigned to matter "${matter.title}". Review the documents and start the tasks.`,
        link: `/matters/${matterId}`,
        metadata: { matterId, lawyerId } as object,
      },
    });
    await prisma.notification.create({
      data: {
        userId: matter.clientId, kind: "matched_lawyer",
        title: `A lawyer has been assigned to your matter`,
        body: `${lawyer.user.name} has been assigned to your matter "${matter.title}".`,
        link: `/matters/${matterId}`,
        metadata: { matterId, lawyerId, lawyerName: lawyer.user.name } as object,
      },
    });

    return NextResponse.json({ ok: true, lawyerId, status: newStatus });
  } catch (e) {
    return handleApiError("legal-matters.assign", e);
  }
}
