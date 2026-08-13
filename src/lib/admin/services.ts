export interface Step {
  ar: string;
  en: string;
}

/**
 * Steps are stored in the DB as a JSON-encoded string inside a Json column
 * (the existing seed writes `JSON.stringify(array)`). Consumers parse them.
 * This helper normalizes arrays or strings back to a Step[].
 */
export function parseStepsJson(value: unknown): Step[] {
  if (Array.isArray(value)) {
    return value as Step[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed as Step[];
    } catch {
      // fall through
    }
  }
  return [];
}

export function stringifySteps(steps: Step[]): string {
  return JSON.stringify(steps);
}

/** Convert "", undefined, null to null so Prisma nullable text fields store NULL. */
export function nullableText(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

export function serializeProcedure<
  T extends { physicalPresenceSteps: unknown; remoteSteps: unknown },
>(proc: T) {
  return {
    ...proc,
    physicalPresenceSteps: parseStepsJson(proc.physicalPresenceSteps),
    remoteSteps: parseStepsJson(proc.remoteSteps),
  };
}

// ─────────────────────────────────────────────────────────────
// Shared client types + labels
// ─────────────────────────────────────────────────────────────

export type RemoteEligibility =
  | "fully_remote"
  | "partially_remote"
  | "in_person_required"
  | "unknown";

export const REMOTE_LABEL: Record<RemoteEligibility, { ar: string; en: string }> = {
  fully_remote: { ar: "عن بُعد بالكامل", en: "Fully remote" },
  partially_remote: { ar: "عن بُعد جزئي", en: "Partially remote" },
  in_person_required: { ar: "يتطلب حضوراً", en: "In-person required" },
  unknown: { ar: "غير محدد", en: "Unknown" },
};

export interface PracticeAreaOption {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
}

export interface AdminService {
  id: string;
  slug: string;
  code: string;
  nameAr: string;
  nameEn: string;
  shortAr: string;
  shortEn: string;
  descriptionAr: string;
  descriptionEn: string;
  practiceAreaId: string | null;
  defaultRemoteEligibility: RemoteEligibility;
  platformFeeDefault: number;
  lawyerFeeMin: number;
  lawyerFeeMax: number;
  governmentFeeEstimate: number;
  governmentFeeNoteAr: string | null;
  governmentFeeNoteEn: string | null;
  typicalDurationDays: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  practiceArea?: { slug: string; nameAr: string; nameEn: string } | null;
  _count?: {
    procedures: number;
    documentRequirements: number;
    officialSources: number;
    matters: number;
  };
}

export interface AdminProcedure {
  id: string;
  legalServiceId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  remoteEligibility: RemoteEligibility;
  remoteEligibilityReasonAr: string;
  remoteEligibilityReasonEn: string;
  physicalPresenceSteps: Step[];
  remoteSteps: Step[];
  authorityAr: string | null;
  authorityEn: string | null;
  estimatedDurationDays: number;
  legalBasisAr: string | null;
  legalBasisEn: string | null;
  notesAr: string | null;
  notesEn: string | null;
  sortOrder: number;
}

export interface AdminDocumentRequirement {
  id: string;
  legalServiceId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isRequired: boolean;
  provider: string;
  stage: string;
  acceptsDigital: boolean;
  requiresOriginal: boolean;
  requiresNotarization: boolean;
  requiresApostille: boolean;
  sortOrder: number;
}

export interface AdminSourceLink {
  id: string;
  relationType: string;
  notesAr: string | null;
  notesEn: string | null;
  officialSource: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    url: string | null;
    authorityType: string;
  };
}

export interface OfficialSourceOption {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  url: string | null;
  authorityType: string;
}

/** Split lines of text into steps by zipping AR + EN lines. */
export function linesToSteps(arText: string, enText: string): Step[] {
  const arLines = arText.split("\n").map((s) => s.trim()).filter(Boolean);
  const enLines = enText.split("\n").map((s) => s.trim()).filter(Boolean);
  const count = Math.max(arLines.length, enLines.length);
  const steps: Step[] = [];
  for (let i = 0; i < count; i++) {
    steps.push({ ar: arLines[i] ?? "", en: enLines[i] ?? "" });
  }
  return steps.filter((s) => s.ar !== "" || s.en !== "");
}

export function stepsToLines(steps: Step[]): { ar: string; en: string } {
  return {
    ar: steps.map((s) => s.ar).join("\n"),
    en: steps.map((s) => s.en).join("\n"),
  };
}

export function fmtJOD(v: number): string {
  return `${v} JOD`;
}
