import "server-only";
import { prisma } from "@/lib/db";

/**
 * Phase 1 — Matter Task Template.
 *
 * When a LegalMatter is created from a LegalService, we clone a set of
 * MatterTask records derived from:
 *   - The LegalProcedure's `remoteSteps` (each step → one task, lawyer-responsible)
 *   - The LegalProcedure's `physicalPresenceSteps` (each → one task, requiresPhysicalPresence=true)
 *   - A standard set of phase-1 tasks (intake → documents → review → filing → delivery)
 */
export interface TaskTemplate {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  responsibleRole: "client" | "lawyer" | "authority" | "platform";
  requiresPhysicalPresence: boolean;
  sortOrder: number;
}

const STANDARD_TASKS: TaskTemplate[] = [
  {
    titleAr: "استكمال البيانات الأولية للقضية",
    titleEn: "Complete initial matter intake",
    descriptionAr: "تأكيد بيانات الموكل والوقائع والمتطلبات.",
    descriptionEn: "Confirm client details, facts, and requirements.",
    responsibleRole: "platform",
    requiresPhysicalPresence: false,
    sortOrder: 0,
  },
  {
    titleAr: "تجميع وتحميل المستندات المطلوبة",
    titleEn: "Gather and upload required documents",
    descriptionAr: "رفع جميع المستندات المطلوبة إلى ملف القضية.",
    descriptionEn: "Upload all required documents to the matter file.",
    responsibleRole: "client",
    requiresPhysicalPresence: false,
    sortOrder: 1,
  },
  {
    titleAr: "مراجعة المستندات والتأكد من اكتمالها",
    titleEn: "Review documents for completeness",
    descriptionAr: "مراجعة المحامي للمستندات والتأكد من مطابقتها للمتطلبات.",
    descriptionEn: "Lawyer reviews documents for completeness and compliance.",
    responsibleRole: "lawyer",
    requiresPhysicalPresence: false,
    sortOrder: 2,
  },
  {
    titleAr: "تسليم النتيجة النهائية للموكل",
    titleEn: "Deliver final outcome to client",
    descriptionAr: "تسليم الوثيقة النهائية أو تأكيد الإنجاز.",
    descriptionEn: "Hand over the final document or confirm completion.",
    responsibleRole: "lawyer",
    requiresPhysicalPresence: false,
    sortOrder: 99,
  },
];

export async function cloneTasksForMatter(matterId: string, legalServiceId: string | null): Promise<number> {
  if (!legalServiceId) {
    for (const t of STANDARD_TASKS) {
      await prisma.matterTask.create({
        data: {
          matterId,
          titleAr: t.titleAr, titleEn: t.titleEn,
          descriptionAr: t.descriptionAr ?? null, descriptionEn: t.descriptionEn ?? null,
          responsibleRole: t.responsibleRole,
          requiresPhysicalPresence: t.requiresPhysicalPresence,
          sortOrder: t.sortOrder,
        },
      });
    }
    return STANDARD_TASKS.length;
  }

  const service = await prisma.legalService.findUnique({
    where: { id: legalServiceId },
    include: { procedures: true },
  });

  const tasks: TaskTemplate[] = [...STANDARD_TASKS];

  if (service && service.procedures[0]) {
    const procedure = service.procedures[0];
    // NOTE: In PostgreSQL these are native Json arrays, not strings.
    // Use `as unknown as` to satisfy TypeScript across both SQLite (string)
    // and PostgreSQL (Json) Prisma clients.
    const remoteSteps = (procedure.remoteSteps as unknown as { ar: string; en: string }[]) ?? [];
    const physicalSteps = (procedure.physicalPresenceSteps as unknown as { ar: string; en: string }[]) ?? [];

    tasks.push(
      ...remoteSteps.map((s, i): TaskTemplate => ({
        titleAr: s.ar, titleEn: s.en,
        descriptionAr: `خطوة عن بُعد ضمن إجراء: ${procedure.nameAr}`,
        descriptionEn: `Remote step of procedure: ${procedure.nameEn}`,
        responsibleRole: "lawyer",
        requiresPhysicalPresence: false,
        sortOrder: 10 + i,
      })),
      ...physicalSteps.map((s, i): TaskTemplate => ({
        titleAr: s.ar, titleEn: s.en,
        descriptionAr: `خطوة تتطلب حضوراً شخصياً ضمن إجراء: ${procedure.nameAr}`,
        descriptionEn: `In-person step of procedure: ${procedure.nameEn}`,
        responsibleRole: "client",
        requiresPhysicalPresence: true,
        sortOrder: 50 + i,
      })),
    );
  }

  tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const t of tasks) {
    await prisma.matterTask.create({
      data: {
        matterId,
        titleAr: t.titleAr, titleEn: t.titleEn,
        descriptionAr: t.descriptionAr ?? null, descriptionEn: t.descriptionEn ?? null,
        responsibleRole: t.responsibleRole,
        requiresPhysicalPresence: t.requiresPhysicalPresence,
        sortOrder: t.sortOrder,
      },
    });
  }
  return tasks.length;
}

/**
 * Recompute matter progressPercent from MatterTask completion.
 * Completed = completed, Skipped = counts as done.
 */
export async function recomputeMatterProgress(matterId: string): Promise<number> {
  const tasks = await prisma.matterTask.findMany({
    where: { matterId },
    select: { status: true },
  });
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
  const pct = Math.round((done / tasks.length) * 100);
  await prisma.legalMatter.update({ where: { id: matterId }, data: { progressPercent: pct } });
  return pct;
}

/**
 * Add a timeline event to a matter.
 */
export async function addTimelineEvent(args: {
  matterId: string;
  eventType: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  actorId?: string | null;
  actorRole?: "client" | "lawyer" | "admin" | "system";
  metadata?: unknown;
}) {
  return prisma.matterTimelineEvent.create({
    data: {
      matterId: args.matterId,
      eventType: args.eventType,
      titleAr: args.titleAr,
      titleEn: args.titleEn,
      descriptionAr: args.descriptionAr ?? null,
      descriptionEn: args.descriptionEn ?? null,
      actorId: args.actorId ?? null,
      actorRole: args.actorRole ?? "system",
      metadata: args.metadata ? (args.metadata as object) : undefined,
    },
  });
}
