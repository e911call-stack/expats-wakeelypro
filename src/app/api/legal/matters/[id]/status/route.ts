import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";
import { sendUserSms } from "@/lib/sms";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

const VALID_STATUSES = [
  "new_matter", "service_recommended", "remote_eligibility_check",
  "documents_pending", "documents_received", "lawyer_assigned",
  "in_progress", "in_review", "filing_prepared", "filed_with_authority",
  "authority_processing", "ready_for_delivery", "delivered",
  "cancelled", "closed",
  "intake", "awaiting_documents", "lawyer_requested",
  "consultation_scheduled", "active", "resolved",
];

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  new_matter: { ar: "جديدة", en: "New" },
  service_recommended: { ar: "خدمة موصى بها", en: "Service recommended" },
  remote_eligibility_check: { ar: "فحص الأهلية عن بُعد", en: "Remote eligibility check" },
  documents_pending: { ar: "بانتظار المستندات", en: "Documents pending" },
  documents_received: { ar: "تم استلام المستندات", en: "Documents received" },
  lawyer_assigned: { ar: "تم إسناد محامٍ", en: "Lawyer assigned" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress" },
  in_review: { ar: "قيد المراجعة", en: "In review" },
  filing_prepared: { ar: "تجهيز التقديم", en: "Filing prepared" },
  filed_with_authority: { ar: "مقدّمة للجهة", en: "Filed with authority" },
  authority_processing: { ar: "قيد المعالجة من الجهة", en: "Authority processing" },
  ready_for_delivery: { ar: "جاهزة للتسليم", en: "Ready for delivery" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
  closed: { ar: "مغلقة", en: "Closed" },
};

/**
 * PATCH /api/legal/matters/[id]/status — advance matter status.
 * Allowed for: assigned lawyer, admin. Notifies the client.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, title: true, clientId: true, lawyerId: true, status: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = String(body.status ?? "");
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const note = body.note ? String(body.note) : null;

    const oldStatus = matter.status;
    if (oldStatus === newStatus) return NextResponse.json({ ok: true, status: newStatus, unchanged: true });

    const closedAt = newStatus === "delivered" || newStatus === "closed" || newStatus === "cancelled" ? new Date() : null;

    await prisma.legalMatter.update({
      where: { id: matterId },
      data: { status: newStatus as never, ...(closedAt ? { closedAt } : {}) },
    });

    const labels = STATUS_LABELS[newStatus] ?? { ar: newStatus, en: newStatus };
    await addTimelineEvent({
      matterId, eventType: "status_changed",
      titleAr: `تغيير الحالة: ${labels.ar}`, titleEn: `Status changed: ${labels.en}`,
      descriptionAr: note ?? null, descriptionEn: note ?? null,
      actorId: session.id, actorRole: session.role === "LAWYER" ? "lawyer" : "admin",
      metadata: { oldStatus, newStatus, note },
    });

    await prisma.notification.create({
      data: {
        userId: matter.clientId, kind: "matter_status_changed",
        title: `Matter status updated: ${labels.en}`,
        body: note ?? `Your matter "${matter.title}" is now: ${labels.en}.`,
        link: `/matters/${matterId}`,
        metadata: { matterId, oldStatus, newStatus } as object,
      },
    });

    await sendUserSms(
      matter.clientId,
      `Expats WakeelyPro: You matter "${matter.title}" is now "${labels.en}".`,
    );

    return NextResponse.json({ ok: true, status: newStatus, oldStatus });
  } catch (e) {
    return handleApiError("legal-matters.status", e);
  }
}
