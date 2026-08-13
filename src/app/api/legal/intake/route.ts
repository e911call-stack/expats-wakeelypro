import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { recommendService } from "@/lib/legal/service-matcher";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/legal/intake
 *
 * Phase 1 guided-intake endpoint. Creates a LegalIntake row and runs the
 * rule-based service recommender. The AI must NEVER invent a service.
 *
 * NOTE: requireSession() in your repo THROWS a redirect if not authenticated.
 * For an API route, you may want to use verifySession() instead and return 401.
 * See ADAPTATIONS.md for the swap.
 */
export async function POST(req: NextRequest) {
  try {
    // Option A: use verifySession (returns null if unauth) — better for APIs
    // import { verifySession } from "@/lib/auth";
    // const session = await verifySession();
    // if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Option B: use requireSession (throws redirect — works if called from a server action)
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const rl = checkRateLimit(`legal-intake:${session.id}`, { perMinute: 5, perHour: 30 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text ?? "").trim();
    const language = (body.language === "en" ? "en" : "ar") as "ar" | "en";
    const clientName = body.clientName ? String(body.clientName).trim().slice(0, 160) : null;
    const clientPhone = body.clientPhone ? String(body.clientPhone).trim().slice(0, 80) : null;
    const clientEmail = body.clientEmail ? String(body.clientEmail).trim().slice(0, 180) : null;
    const selectedServiceSlug = body.selectedServiceSlug ? String(body.selectedServiceSlug).trim().slice(0, 120) : null;
    const clientCountry = body.clientCountry ? String(body.clientCountry) : null;
    const clientCity = body.clientCity ? String(body.clientCity) : null;
    const clientStatus = body.clientStatus ? String(body.clientStatus) : null;
    const practiceAreaSlug = body.practiceAreaSlug ? String(body.practiceAreaSlug) : null;
    const jurisdictionCode = body.jurisdictionCode ? String(body.jurisdictionCode) : null;
    const urgency = body.urgency === "low" || body.urgency === "medium" || body.urgency === "high" ? body.urgency : null;
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.slice(0, 3).map((item: unknown) => {
          const file = item && typeof item === "object" ? item as Record<string, unknown> : {};
          const fileName = String(file.fileName ?? "attachment").trim().slice(0, 180);
          const fileType = String(file.fileType ?? "file").slice(0, 120);
          const fileSize = Math.max(0, Math.min(Number(file.fileSize ?? 0), 2 * 1024 * 1024));
          const fileBase64 = typeof file.fileBase64 === "string" ? file.fileBase64.slice(0, 3_000_000) : null;
          return { fileName, fileType, fileSize, fileBase64 };
        }).filter((file: { fileName: string; fileBase64: string | null }) => Boolean(file.fileName && file.fileBase64))
      : [];

    if (text.length < 10) return NextResponse.json({ error: "text_too_short", min: 10 }, { status: 400 });
    if (text.length > 8000) return NextResponse.json({ error: "text_too_long", max: 8000 }, { status: 400 });

    let practiceAreaId: string | null = null;
    if (practiceAreaSlug) {
      const pa = await prisma.practiceArea.findUnique({ where: { slug: practiceAreaSlug }, select: { id: true } });
      practiceAreaId = pa?.id ?? null;
    }
    let jurisdictionId: string | null = null;
    if (jurisdictionCode) {
      const j = await prisma.jurisdiction.findUnique({ where: { code: jurisdictionCode }, select: { id: true } });
      jurisdictionId = j?.id ?? null;
    }

    // Update user with client context if provided
    if (clientCountry || clientStatus) {
      await prisma.user.update({
        where: { id: session.id },
        data: {
          ...(clientCountry ? { currentCountry: clientCountry } : {}),
          ...(clientCity ? { currentCity: clientCity } : {}),
          ...(clientStatus ? { clientStatus } : {}),
        },
      });
    }

    // Run service recommender — STRICT catalog match (never invents)
    const recommendation = await recommendService(text);

    // Create LegalIntake row
    const intake = await prisma.legalIntake.create({
      data: {
        userId: session.id,
        status: "completed",
        language,
        rawText: text,
        structured: {
          clientName, clientPhone, clientEmail, selectedServiceSlug,
          clientCountry, clientCity, clientStatus,
          practiceAreaSlug, jurisdictionCode, urgency,
          supportingDocuments: attachments,
        } as object,
        finalSummary: recommendation
          ? (language === "ar"
              ? `الخدمة الموصى بها: ${recommendation.service.nameAr}. الثقة: ${Math.round(recommendation.confidence * 100)}%.`
              : `Recommended service: ${recommendation.service.nameEn}. Confidence: ${Math.round(recommendation.confidence * 100)}%.`)
          : null,
        recommendedPracticeAreaId: practiceAreaId,
        recommendedJurisdictionId: jurisdictionId,
        recommendedLegalServiceId: recommendation?.service.id ?? null,
        recommendedRemoteEligibility: recommendation?.remoteEligibility ?? "unknown",
        // Store document slugs as JSON (PostgreSQL Json column)
        ...(recommendation ? { recommendedDocumentSlugs: recommendation.documentSlugs as unknown as object } : {}),
        confidence: recommendation?.confidence ?? 0,
        safetyFlags: [],
        promptVersion: "phase1_rule_v1",
        model: "phase1-rule-matcher",
        completedAt: new Date(),
      },
    });

    await audit("legal.intake.create", "LegalIntake", intake.id, { actorId: session.id, hasRecommendation: Boolean(recommendation), attachmentCount: attachments.length });

    return NextResponse.json({
      intakeId: intake.id,
      attachmentCount: attachments.length,
      recommendation: recommendation
        ? {
            service: {
              id: recommendation.service.id, slug: recommendation.service.slug,
              nameAr: recommendation.service.nameAr, nameEn: recommendation.service.nameEn,
              shortAr: recommendation.service.shortAr, shortEn: recommendation.service.shortEn,
              descriptionAr: recommendation.service.descriptionAr, descriptionEn: recommendation.service.descriptionEn,
              platformFeeDefault: recommendation.service.platformFeeDefault,
              lawyerFeeMin: recommendation.service.lawyerFeeMin, lawyerFeeMax: recommendation.service.lawyerFeeMax,
              governmentFeeEstimate: recommendation.service.governmentFeeEstimate,
              governmentFeeNoteAr: recommendation.service.governmentFeeNoteAr,
              governmentFeeNoteEn: recommendation.service.governmentFeeNoteEn,
              typicalDurationDays: recommendation.service.typicalDurationDays,
            },
            procedure: recommendation.procedure
              ? {
                  id: recommendation.procedure.id, slug: recommendation.procedure.slug,
                  nameAr: recommendation.procedure.nameAr, nameEn: recommendation.procedure.nameEn,
                  remoteEligibility: recommendation.procedure.remoteEligibility,
                  remoteEligibilityReasonAr: recommendation.procedure.remoteEligibilityReasonAr,
                  remoteEligibilityReasonEn: recommendation.procedure.remoteEligibilityReasonEn,
                  physicalPresenceSteps: recommendation.procedure.physicalPresenceSteps,
                  remoteSteps: recommendation.procedure.remoteSteps,
                  authorityAr: recommendation.procedure.authorityAr, authorityEn: recommendation.procedure.authorityEn,
                  legalBasisAr: recommendation.procedure.legalBasisAr, legalBasisEn: recommendation.procedure.legalBasisEn,
                  notesAr: recommendation.procedure.notesAr, notesEn: recommendation.procedure.notesEn,
                  estimatedDurationDays: recommendation.procedure.estimatedDurationDays,
                }
              : null,
            matchedKeywords: recommendation.matchedKeywords,
            confidence: recommendation.confidence,
            remoteEligibility: recommendation.remoteEligibility,
            remoteEligibilityReasonAr: recommendation.remoteEligibilityReasonAr,
            remoteEligibilityReasonEn: recommendation.remoteEligibilityReasonEn,
            documentSlugs: recommendation.documentSlugs,
          }
        : null,
    });
  } catch (e) {
    return handleApiError("legal-intake.create", e);
  }
}
