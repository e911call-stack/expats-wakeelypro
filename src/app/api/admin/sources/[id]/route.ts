import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { sourceUpdateSchema } from "@/lib/validators/admin-ops";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/sources/[id] — single source.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const source = await prisma.officialSource.findUnique({ where: { id } });
    if (!source) return notFound("source_not_found");
    return NextResponse.json({ source });
  } catch (e) {
    return handleApiError("admin-sources.detail", e);
  }
}

/**
 * PATCH /api/admin/sources/[id] — partial update.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = sourceUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    if (d.slug !== undefined) {
      const dup = await prisma.officialSource.findFirst({
        where: { slug: d.slug, id: { not: id } },
        select: { id: true },
      });
      if (dup) return NextResponse.json({ error: "slug_taken", slug: d.slug }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (d.slug !== undefined) data.slug = d.slug;
    if (d.nameAr !== undefined) data.nameAr = d.nameAr;
    if (d.nameEn !== undefined) data.nameEn = d.nameEn;
    if (d.url !== undefined) data.url = d.url ?? null;
    if (d.authorityType !== undefined) data.authorityType = d.authorityType;
    if (d.country !== undefined) data.country = d.country;
    if (d.region !== undefined) data.region = nullableText(d.region);
    if (d.notesAr !== undefined) data.notesAr = nullableText(d.notesAr);
    if (d.notesEn !== undefined) data.notesEn = nullableText(d.notesEn);
    if (d.isActive !== undefined) data.isActive = d.isActive;

    const source = await prisma.officialSource.update({ where: { id }, data: data as never });

    await audit("source.update", "OfficialSource", id, { actorId: session.id, ...d });
    return NextResponse.json({ source });
  } catch (e) {
    return handleApiError("admin-sources.update", e);
  }
}

/**
 * DELETE /api/admin/sources/[id] — soft delete (isActive=false).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const existing = await prisma.officialSource.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return notFound("source_not_found");

    const source = await prisma.officialSource.update({
      where: { id },
      data: { isActive: false },
    });

    await audit("source.deactivate", "OfficialSource", id, { actorId: session.id });
    return NextResponse.json({ ok: true, source });
  } catch (e) {
    return handleApiError("admin-sources.delete", e);
  }
}
