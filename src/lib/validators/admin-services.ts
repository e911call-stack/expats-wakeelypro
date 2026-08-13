import { z } from "zod";

export const REMOTE_ELIGIBILITY = [
  "fully_remote",
  "partially_remote",
  "in_person_required",
  "unknown",
] as const;

export const REMOTE_ELIGIBILITY_LABEL: Record<
  (typeof REMOTE_ELIGIBILITY)[number],
  { ar: string; en: string }
> = {
  fully_remote: { ar: "عن بُعد بالكامل", en: "Fully remote" },
  partially_remote: { ar: "عن بُعد جزئي", en: "Partially remote" },
  in_person_required: { ar: "يتطلب حضوراً", en: "In-person required" },
  unknown: { ar: "غير محدد", en: "Unknown" },
};

const stepSchema = z.object({
  ar: z.string(),
  en: z.string(),
});

export const procedureSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only"),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  remoteEligibility: z.enum(REMOTE_ELIGIBILITY),
  remoteEligibilityReasonAr: z.string().min(1),
  remoteEligibilityReasonEn: z.string().min(1),
  physicalPresenceSteps: z.array(stepSchema).default([]),
  remoteSteps: z.array(stepSchema).default([]),
  authorityAr: z.string().nullable().optional(),
  authorityEn: z.string().nullable().optional(),
  estimatedDurationDays: z.coerce.number().int().min(0).default(30),
  legalBasisAr: z.string().nullable().optional(),
  legalBasisEn: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
  notesEn: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const documentRequirementSchema = z.object({
  slug: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionAr: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  isRequired: z.boolean().default(true),
  provider: z.string().default("client"),
  stage: z.string().default("at_intake"),
  acceptsDigital: z.boolean().default(true),
  requiresOriginal: z.boolean().default(false),
  requiresNotarization: z.boolean().default(false),
  requiresApostille: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export const sourceLinkSchema = z.object({
  officialSourceId: z.string().min(1),
  relationType: z.string().default("primary"),
  notesAr: z.string().nullable().optional(),
  notesEn: z.string().nullable().optional(),
});

export const serviceSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only"),
  code: z.string().min(1).max(20),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  shortAr: z.string().min(1),
  shortEn: z.string().min(1),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  practiceAreaId: z.string().nullable().optional(),
  defaultRemoteEligibility: z.enum(REMOTE_ELIGIBILITY).default("partially_remote"),
  platformFeeDefault: z.coerce.number().int().min(0).default(25),
  lawyerFeeMin: z.coerce.number().int().min(0).default(150),
  lawyerFeeMax: z.coerce.number().int().min(0).default(800),
  governmentFeeEstimate: z.coerce.number().int().min(0).default(0),
  governmentFeeNoteAr: z.string().nullable().optional(),
  governmentFeeNoteEn: z.string().nullable().optional(),
  typicalDurationDays: z.coerce.number().int().min(0).default(30),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

/**
 * Partial schema for PATCH /api/admin/services/[id].
 * Absent fields stay undefined so partial updates never reset values to defaults.
 */
export const serviceUpdateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only")
    .optional(),
  code: z.string().min(1).max(20).optional(),
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  shortAr: z.string().min(1).optional(),
  shortEn: z.string().min(1).optional(),
  descriptionAr: z.string().min(1).optional(),
  descriptionEn: z.string().min(1).optional(),
  practiceAreaId: z.string().nullable().optional(),
  defaultRemoteEligibility: z.enum(REMOTE_ELIGIBILITY).optional(),
  platformFeeDefault: z.coerce.number().int().min(0).optional(),
  lawyerFeeMin: z.coerce.number().int().min(0).optional(),
  lawyerFeeMax: z.coerce.number().int().min(0).optional(),
  governmentFeeEstimate: z.coerce.number().int().min(0).optional(),
  governmentFeeNoteAr: z.string().nullable().optional(),
  governmentFeeNoteEn: z.string().nullable().optional(),
  typicalDurationDays: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
