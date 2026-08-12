import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * PATCH /api/legal/matters/[id]/fees — lawyer/admin sets final fee breakdown.
 * NEVER fakes governmentFeeIncluded — must be explicitly set true.
 *
 * Body: {
 *   platformFeeJOD?, lawyerFeeJOD?, governmentFeeJOD?,
 *   governmentFeeIncluded?, feeNotesAr?, feeNotesEn?, lawyerNotes?
 * }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, lawyerId: true, platformFeeJOD: true, lawyerFeeJOD: true, governmentFeeJOD: true, governmentFeeIncluded: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const parseFee = (v: unknown): number | undefined => {
      if (v === undefined || v === null) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return undefined;
      return Math.round(n);
    };

    const updateData: Record<string, unknown> = {};
    let platformFeeJOD: number | undefined;
    let lawyerFeeJOD: number | undefined;
    let governmentFeeJOD: number | undefined;

    if (body.platformFeeJOD !== undefined) {
      platformFeeJOD = parseFee(body.platformFeeJOD);
      if (platformFeeJOD === undefined) return NextResponse.json({ error: "platformFeeJOD must be non-negative number" }, { status: 400 });
      updateData.platformFeeJOD = platformFeeJOD;
    }
    if (body.lawyerFeeJOD !== undefined) {
      lawyerFeeJOD = parseFee(body.lawyerFeeJOD);
      if (lawyerFeeJOD === undefined) return NextResponse.json({ error: "lawyerFeeJOD must be non-negative number" }, { status: 400 });
      updateData.lawyerFeeJOD = lawyerFeeJOD;
    }
    if (body.governmentFeeJOD !== undefined) {
      governmentFeeJOD = parseFee(body.governmentFeeJOD);
      if (governmentFeeJOD === undefined) return NextResponse.json({ error: "governmentFeeJOD must be non-negative number" }, { status: 400 });
      updateData.governmentFeeJOD = governmentFeeJOD;
    }
    if (typeof body.governmentFeeIncluded === "boolean") updateData.governmentFeeIncluded = body.governmentFeeIncluded;
    if (typeof body.feeNotesAr === "string") updateData.feeNotesAr = body.feeNotesAr;
    if (typeof body.feeNotesEn === "string") updateData.feeNotesEn = body.feeNotesEn;
    if (typeof body.lawyerNotes === "string") updateData.lawyerNotes = body.lawyerNotes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const updated = await prisma.legalMatter.update({ where: { id: matterId }, data: updateData });

    // Build change description for timeline
    const changes: string[] = [];
    if (platformFeeJOD !== undefined && platformFeeJOD !== matter.platformFeeJOD) changes.push(`platform: ${matter.platformFeeJOD} → ${platformFeeJOD} JOD`);
    if (lawyerFeeJOD !== undefined && lawyerFeeJOD !== matter.lawyerFeeJOD) changes.push(`lawyer: ${matter.lawyerFeeJOD} → ${lawyerFeeJOD} JOD`);
    if (governmentFeeJOD !== undefined && governmentFeeJOD !== matter.governmentFeeJOD) changes.push(`government: ${matter.governmentFeeJOD} → ${governmentFeeJOD} JOD`);

    if (changes.length > 0) {
      await addTimelineEvent({
        matterId, eventType: "note_added",
        titleAr: "تحديث الرسوم", titleEn: "Fees updated",
        descriptionAr: changes.join(" · "), descriptionEn: changes.join(" · "),
        actorId: session.id, actorRole: session.role === "LAWYER" ? "lawyer" : "admin",
        metadata: { oldPlatform: matter.platformFeeJOD, oldLawyer: matter.lawyerFeeJOD, oldGovt: matter.governmentFeeJOD, updateData },
      });
    }

    return NextResponse.json({
      matter: {
        id: updated.id,
        platformFeeJOD: updated.platformFeeJOD,
        lawyerFeeJOD: updated.lawyerFeeJOD,
        governmentFeeJOD: updated.governmentFeeJOD,
        governmentFeeIncluded: updated.governmentFeeIncluded,
      },
    });
  } catch (e) {
    return handleApiError("legal-matters.fees", e);
  }
}
