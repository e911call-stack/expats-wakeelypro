import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { cloneTasksForMatter, recomputeMatterProgress, addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/legal/matters — lists matters visible to the current user.
 * POST /api/legal/matters — creates a new LegalMatter from an intake + recommended service.
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const where: Record<string, unknown> = {};
    if (session.role === "CITIZEN") where.clientId = session.id;
    else if (session.role === "LAWYER" && session.lawyerId) where.lawyerId = session.lawyerId;
    // ADMIN sees all

    const matters = await prisma.legalMatter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        legalService: { select: { id: true, slug: true, nameAr: true, nameEn: true, code: true } },
        legalProcedure: { select: { id: true, nameAr: true, nameEn: true, remoteEligibility: true } },
        practiceArea: { select: { slug: true, nameAr: true, nameEn: true } },
        jurisdiction: { select: { code: true, nameAr: true, nameEn: true } },
        client: { select: { id: true, name: true, email: true, currentCountry: true, clientStatus: true } },
        lawyer: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { documents: true, tasks: true, timelineEvents: true, conversations: true, payments: true } },
      },
    });

    return NextResponse.json({ matters });
  } catch (e) {
    return handleApiError("legal-matters.list", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const rl = checkRateLimit(`legal-matter:${session.id}`, { perMinute: 3, perHour: 20 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "rate_limited", retryAfter: rl.retryAfter }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const legalServiceId = body.legalServiceId ? String(body.legalServiceId) : null;
    const legalProcedureId = body.legalProcedureId ? String(body.legalProcedureId) : null;
    const intakeId = body.intakeId ? String(body.intakeId) : null;
    const facts = body.facts ? String(body.facts) : null;
    const urgency = body.urgency === "low" || body.urgency === "medium" || body.urgency === "high" ? body.urgency : null;

    if (title.length < 5 || title.length > 200) return NextResponse.json({ error: "title_length", min: 5, max: 200 }, { status: 400 });
    if (!legalServiceId) return NextResponse.json({ error: "legalServiceId required" }, { status: 400 });

    const service = await prisma.legalService.findUnique({
      where: { id: legalServiceId },
      include: { procedures: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    if (!service) return NextResponse.json({ error: "service not found" }, { status: 400 });

    let procedureId = legalProcedureId;
    if (!procedureId && service.procedures[0]) procedureId = service.procedures[0].id;
    const procedure = service.procedures.find((p) => p.id === procedureId) ?? service.procedures[0] ?? null;

    let jurisdictionId: string | null = null;
    let country: string | null = null;
    let region: string | null = null;
    let city: string | null = null;
    if (body.jurisdictionCode) {
      const j = await prisma.jurisdiction.findUnique({
        where: { code: String(body.jurisdictionCode) },
        select: { id: true, country: true, region: true, city: true },
      });
      if (j) { jurisdictionId = j.id; country = j.country; region = j.region; city = j.city; }
    }
    let practiceAreaId: string | null = service.practiceAreaId;
    if (body.practiceAreaSlug) {
      const pa = await prisma.practiceArea.findUnique({ where: { slug: String(body.practiceAreaSlug) }, select: { id: true } });
      if (pa) practiceAreaId = pa.id;
    }

    const platformFeeJOD = Number(body.platformFeeJOD ?? service.platformFeeDefault);
    const lawyerFeeJOD = Number(body.lawyerFeeJOD ?? service.lawyerFeeMin);
    const governmentFeeJOD = Number(body.governmentFeeJOD ?? service.governmentFeeEstimate);
    const governmentFeeIncluded = Boolean(body.governmentFeeIncluded ?? false);

    const matter = await prisma.legalMatter.create({
      data: {
        title, clientId: session.id, status: "service_recommended",
        facts, practiceAreaId, jurisdictionId, country, region, city, urgency,
        legalServiceId, legalProcedureId: procedureId,
        remoteEligibility: procedure?.remoteEligibility ?? service.defaultRemoteEligibility,
        remoteEligibilityReasonAr: procedure?.remoteEligibilityReasonAr ?? null,
        remoteEligibilityReasonEn: procedure?.remoteEligibilityReasonEn ?? null,
        clientCountry: body.clientCountry ? String(body.clientCountry) : null,
        clientCity: body.clientCity ? String(body.clientCity) : null,
        clientStatus: body.clientStatus ? String(body.clientStatus) : null,
        platformFeeJOD, lawyerFeeJOD, governmentFeeJOD, governmentFeeIncluded,
        feeNotesAr: body.feeNotesAr ? String(body.feeNotesAr) : service.governmentFeeNoteAr,
        feeNotesEn: body.feeNotesEn ? String(body.feeNotesEn) : service.governmentFeeNoteEn,
        intakeId: intakeId ?? null,
      },
    });

    const taskCount = await cloneTasksForMatter(matter.id, legalServiceId);

    await addTimelineEvent({
      matterId: matter.id, eventType: "matter_created",
      titleAr: "تم إنشاء القضية", titleEn: "Matter created",
      descriptionAr: `تم إنشاء القضية بناءً على الخدمة: ${service.nameAr}`,
      descriptionEn: `Matter created based on service: ${service.nameEn}`,
      actorId: session.id, actorRole: "client",
      metadata: { serviceSlug: service.slug, taskCount },
    });
    await addTimelineEvent({
      matterId: matter.id, eventType: "remote_eligibility_set",
      titleAr: "تم تحديد أهلية المعاملة عن بُعد", titleEn: "Remote eligibility determined",
      descriptionAr: procedure?.remoteEligibilityReasonAr ?? null,
      descriptionEn: procedure?.remoteEligibilityReasonEn ?? null,
      actorId: session.id, actorRole: "system",
      metadata: { remoteEligibility: procedure?.remoteEligibility ?? service.defaultRemoteEligibility },
    });

    await recomputeMatterProgress(matter.id);

    if (intakeId) {
      await prisma.legalIntake.update({ where: { id: intakeId }, data: { matterId: matter.id } });
    }

    await audit("matter.created", "LegalMatter", matter.id, { actorId: session.id, intakeId });

    return NextResponse.json({ matter: { id: matter.id, taskCount } }, { status: 201 });
  } catch (e) {
    return handleApiError("legal-matters.create", e);
  }
}
