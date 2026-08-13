import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { lawyerUpdateSchema } from "@/lib/validators/admin-ops";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/lawyers/[id] — update profile flags + fields.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const profile = await prisma.lawyerProfile.findUnique({ where: { id }, select: { id: true } });
    if (!profile) return notFound("lawyer_not_found");

    const body = await req.json().catch(() => ({}));
    const parsed = lawyerUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    if (d.barNumber !== undefined) data.barNumber = d.barNumber;
    if (d.bioAr !== undefined) data.bioAr = d.bioAr;
    if (d.bioEn !== undefined) data.bioEn = d.bioEn;
    if (d.specialties !== undefined) data.specialties = d.specialties;
    if (d.cities !== undefined) data.cities = d.cities;
    if (d.languages !== undefined) data.languages = d.languages;
    if (d.hourlyRate !== undefined) data.hourlyRate = d.hourlyRate;
    if (d.yearsExperience !== undefined) data.yearsExperience = d.yearsExperience;
    if (d.verified !== undefined) data.verified = d.verified;
    if (d.isAvailable !== undefined) data.isAvailable = d.isAvailable;
    if (d.handlesRemoteMatters !== undefined) data.handlesRemoteMatters = d.handlesRemoteMatters;
    if (d.rating !== undefined) data.rating = d.rating;
    if (d.totalReviews !== undefined) data.totalReviews = d.totalReviews;
    if (d.avatarUrl !== undefined) data.avatarUrl = d.avatarUrl ?? null;

    const updated = await prisma.lawyerProfile.update({ where: { id }, data: data as never });

    await audit("lawyer.update", "LawyerProfile", id, { actorId: session.id, ...d });
    return NextResponse.json({ lawyer: updated });
  } catch (e) {
    return handleApiError("admin-lawyers.update", e);
  }
}
