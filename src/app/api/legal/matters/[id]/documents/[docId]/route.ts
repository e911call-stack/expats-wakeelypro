import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string; docId: string }> }

const VALID_REVIEW = ["pending", "approved", "rejected", "needs_resubmission"];

/**
 * PATCH /api/legal/matters/[id]/documents/[docId]
 * Lawyer reviews an uploaded document.
 * Body: { reviewStatus: "approved"|"rejected"|"needs_resubmission"|"pending", notes? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId, docId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, title: true, clientId: true, lawyerId: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const reviewStatus = String(body.reviewStatus ?? "");
    if (!VALID_REVIEW.includes(reviewStatus)) {
      return NextResponse.json({ error: "invalid reviewStatus" }, { status: 400 });
    }
    const notes = body.notes ? String(body.notes) : null;

    const doc = await prisma.matterDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.matterId !== matterId) {
      return NextResponse.json({ error: "document_not_found" }, { status: 404 });
    }

    const updated = await prisma.matterDocument.update({
      where: { id: docId },
      data: { reviewStatus, reviewedById: session.id, reviewedAt: new Date(), reviewNotes: notes },
    });

    const reviewLabels: Record<string, { ar: string; en: string }> = {
      approved: { ar: "موافق عليه", en: "approved" },
      rejected: { ar: "مرفوض", en: "rejected" },
      needs_resubmission: { ar: "يحتاج إعادة رفع", en: "needs resubmission" },
      pending: { ar: "بانتظار المراجعة", en: "pending review" },
    };
    const label = reviewLabels[reviewStatus];

    await addTimelineEvent({
      matterId, eventType: "document_uploaded",
      titleAr: `مراجعة مستند ${doc.fileName}: ${label.ar}`,
      titleEn: `Document review ${doc.fileName}: ${label.en}`,
      descriptionAr: notes ?? null, descriptionEn: notes ?? null,
      actorId: session.id, actorRole: session.role === "LAWYER" ? "lawyer" : "admin",
      metadata: { documentId: docId, fileName: doc.fileName, reviewStatus, requirementSlug: doc.requirementSlug },
    });

    await prisma.notification.create({
      data: {
        userId: matter.clientId, kind: "document_uploaded",
        title: `Document ${label.en}: ${doc.fileName}`,
        body: notes ?? `Your document "${doc.fileName}" has been ${label.en} by the lawyer.`,
        link: `/matters/${matterId}`,
        metadata: { matterId, documentId: docId, reviewStatus } as object,
      },
    });

    return NextResponse.json({ document: updated });
  } catch (e) {
    return handleApiError("legal-matters.document-review", e);
  }
}
