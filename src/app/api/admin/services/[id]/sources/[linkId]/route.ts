import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string; linkId: string }>;
}

/**
 * PATCH /api/admin/services/[id]/sources/[linkId] — update relationType / notes.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id, linkId } = await params;
    const link = await prisma.legalServiceOfficialSource.findUnique({
      where: { id: linkId },
      select: { id: true, legalServiceId: true },
    });
    if (!link || link.legalServiceId !== id) {
      return notFound("link_not_found");
    }

    const body = await req.json().catch(() => ({}));
    const relationType = typeof body.relationType === "string" ? body.relationType : undefined;
    const notesAr = typeof body.notesAr === "string" && body.notesAr !== "" ? body.notesAr : null;
    const notesEn = typeof body.notesEn === "string" && body.notesEn !== "" ? body.notesEn : null;

    const updated = await prisma.legalServiceOfficialSource.update({
      where: { id: linkId },
      data: {
        ...(relationType !== undefined ? { relationType } : {}),
        notesAr,
        notesEn,
      },
      include: { officialSource: true },
    });

    await audit("service.source.update", "LegalServiceOfficialSource", linkId, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ link: updated });
  } catch (e) {
    return handleApiError("admin-services.sources.update", e);
  }
}

/**
 * DELETE /api/admin/services/[id]/sources/[linkId] — unlink the official source.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id, linkId } = await params;
    const link = await prisma.legalServiceOfficialSource.findUnique({
      where: { id: linkId },
      select: { id: true, legalServiceId: true },
    });
    if (!link || link.legalServiceId !== id) {
      return notFound("link_not_found");
    }

    await prisma.legalServiceOfficialSource.delete({ where: { id: linkId } });
    await audit("service.source.unlink", "LegalServiceOfficialSource", linkId, {
      actorId: session.id,
      legalServiceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError("admin-services.sources.delete", e);
  }
}
