import "server-only";
import { prisma } from "@/lib/db";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

/**
 * Document review completion helpers.
 *
 * A matter's "document completeness" derives from its service's
 * LegalDocumentRequirement checklist: every required requirement must have an
 * uploaded document that the lawyer approved.
 */

export interface MatterDocumentCompleteness {
  required: number;
  uploaded: number;
  approved: number;
  rejected: number;
  pending: number;
  complete: boolean;
  missingSlugs: string[];
}

/**
 * Compute how complete a matter's document set is against the service checklist.
 */
export async function getMatterDocumentCompleteness(
  matterId: string,
): Promise<MatterDocumentCompleteness> {
  const matter = await prisma.legalMatter.findUnique({
    where: { id: matterId },
    select: {
      id: true,
      legalServiceId: true,
      documents: {
        select: { requirementSlug: true, reviewStatus: true },
      },
    },
  });
  if (!matter) {
    return { required: 0, uploaded: 0, approved: 0, rejected: 0, pending: 0, complete: false, missingSlugs: [] };
  }

  let requirements: { slug: string; isRequired: boolean }[] = [];
  if (matter.legalServiceId) {
    requirements = await prisma.legalDocumentRequirement.findMany({
      where: { legalServiceId: matter.legalServiceId },
      select: { slug: true, isRequired: true },
    });
  }
  const requiredSlugs = requirements.filter((r) => r.isRequired).map((r) => r.slug);

  const approved = new Set<string>();
  let rejected = 0;
  let pending = 0;
  let uploaded = 0;

  for (const d of matter.documents) {
    if (!d.requirementSlug) continue;
    uploaded++;
    if (d.reviewStatus === "approved") approved.add(d.requirementSlug);
    else if (d.reviewStatus === "rejected" || d.reviewStatus === "needs_resubmission") rejected++;
    else pending++;
  }

  const missingSlugs = requiredSlugs.filter((s) => !approved.has(s));

  return {
    required: requiredSlugs.length,
    uploaded,
    approved: approved.size,
    rejected,
    pending,
    complete: requiredSlugs.length > 0 && missingSlugs.length === 0,
    missingSlugs,
  };
}

/**
 * After a document is reviewed, sync the matter status:
 *   - any rejected / needs_resubmission required doc → documents_pending
 *   - every required doc approved           → documents_received
 *   - otherwise (incomplete)                → documents_pending
 * No-op when the matter is already past the document phase
 * (e.g. in_progress / filed_with_authority) so we never regress work.
 */
export async function syncMatterDocumentsStatus(matterId: string): Promise<{
  changed: boolean;
  newStatus: string | null;
}> {
  const matter = await prisma.legalMatter.findUnique({
    where: { id: matterId },
    select: { id: true, status: true },
  });
  if (!matter) return { changed: false, newStatus: null };

  const pastDocumentPhase = [
    "in_progress", "in_review", "filing_prepared", "filed_with_authority",
    "authority_processing", "ready_for_delivery", "delivered", "closed", "cancelled",
  ];
  if (pastDocumentPhase.includes(matter.status)) {
    return { changed: false, newStatus: null };
  }

  const state = await getMatterDocumentCompleteness(matterId);

  let newStatus: string;
  if (state.rejected > 0 || !state.complete) {
    newStatus = "documents_pending";
  } else {
    newStatus = "documents_received";
  }

  if (newStatus === matter.status) {
    return { changed: false, newStatus: null };
  }

  await prisma.legalMatter.update({
    where: { id: matterId },
    data: { status: newStatus as never },
  });

  await addTimelineEvent({
    matterId,
    eventType: "status_changed",
    titleAr: `تحديث حالة المستندات: ${newStatus === "documents_received" ? "اكتملت المستندات" : "مستندات ناقصة"}`,
    titleEn: newStatus === "documents_received" ? "Documents complete" : "Documents incomplete",
    descriptionAr: `مكتملة ${state.approved}/${state.required} من المتطلبات المطلوبة`,
    descriptionEn: `${state.approved}/${state.required} required requirements approved`,
    actorRole: "system",
    metadata: { fromStatus: matter.status, toStatus: newStatus, completeness: state },
  });

  return { changed: true, newStatus };
}
