import { describe, it, expect } from "vitest";
import {
  paymentUpdateSchema,
  userUpdateSchema,
  lawyerUpdateSchema,
  sourceSchema,
  sourceUpdateSchema,
  matterStatusSchema,
} from "@/lib/validators/admin-ops";

describe("admin-ops validators", () => {
  it("paymentUpdateSchema accepts a status + description", () => {
    expect(paymentUpdateSchema.safeParse({ status: "PAID", description: "ok" }).success).toBe(true);
  });

  it("paymentUpdateSchema rejects unknown statuses", () => {
    expect(paymentUpdateSchema.safeParse({ status: "WAT" }).success).toBe(false);
  });

  it("userUpdateSchema accepts a role change", () => {
    expect(userUpdateSchema.safeParse({ role: "LAWYER" }).success).toBe(true);
  });

  it("userUpdateSchema rejects an empty name", () => {
    expect(userUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("lawyerUpdateSchema accepts valid fields", () => {
    expect(
      lawyerUpdateSchema.safeParse({ hourlyRate: 100, yearsExperience: 5, cities: ["Amman"] }).success,
    ).toBe(true);
  });

  it("lawyerUpdateSchema rejects negative hourlyRate", () => {
    expect(lawyerUpdateSchema.safeParse({ hourlyRate: -5 }).success).toBe(false);
  });

  it("sourceSchema requires slug + bilingual names", () => {
    expect(sourceSchema.safeParse({ slug: "moj", nameAr: "وزارة", nameEn: "Ministry", authorityType: "ministry" }).success).toBe(true);
    expect(sourceSchema.safeParse({ slug: "x", nameAr: "", nameEn: "Ministry", authorityType: "ministry" }).success).toBe(false);
  });

  it("sourceUpdateSchema allows partial updates", () => {
    expect(sourceUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(sourceUpdateSchema.safeParse({ slug: "" }).success).toBe(false);
  });

  it("matterStatusSchema accepts a known status", () => {
    expect(matterStatusSchema.safeParse("in_progress").success).toBe(true);
    expect(matterStatusSchema.safeParse("not_a_status").success).toBe(false);
  });
});
