import { z } from "zod";

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export const paymentUpdateSchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  description: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  role: z.enum(["CITIZEN", "LAWYER", "ADMIN"]).optional(),
  isVerified: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

export const lawyerUpdateSchema = z.object({
  barNumber: z.string().min(1).optional(),
  bioAr: z.string().optional(),
  bioEn: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  languages: z.array(z.enum(["ar", "en"])).optional(),
  hourlyRate: z.coerce.number().int().min(0).optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
  verified: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  handlesRemoteMatters: z.boolean().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  totalReviews: z.coerce.number().int().min(0).optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const sourceSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only"),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  url: z.string().url().nullable().optional(),
  authorityType: z.string().min(1),
  country: z.string().default("Jordan"),
  region: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
  notesEn: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Partial schema for PATCH /api/admin/sources/[id].
 * Absent fields stay undefined so toggles never reset other fields.
 */
export const sourceUpdateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only")
    .optional(),
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  url: z.string().url().nullable().optional(),
  authorityType: z.string().min(1).optional(),
  country: z.string().optional(),
  region: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
  notesEn: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const matterStatusSchema = z.enum([
  "new_matter",
  "service_recommended",
  "remote_eligibility_check",
  "documents_pending",
  "documents_received",
  "lawyer_assigned",
  "in_progress",
  "in_review",
  "filing_prepared",
  "filed_with_authority",
  "authority_processing",
  "ready_for_delivery",
  "delivered",
  "cancelled",
  "closed",
  "intake",
  "awaiting_documents",
  "lawyer_requested",
  "consultation_scheduled",
  "active",
  "resolved",
]);
