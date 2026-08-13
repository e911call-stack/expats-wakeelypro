import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { sourceLinkSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id]/sources — list linked official sources.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const links = await prisma.legalServiceOfficialSource.findMany({
      where: { legalServiceId: id },
      include: { officialSource: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ links });
  } catch (e) {
    return handleApiError("admin-services.sources.list", e);
  }
}

/**
 * POST /api/admin/services/[id]/sources — link an official source to the service.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const service = await prisma.legalService.findUnique({ where: { id }, select: { id: true } });
    if (!service) return notFound("service_not_found");

    const body = await req.json().catch(() => ({}));
    const parsed = sourceLinkSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const source = await prisma.officialSource.findUnique({
      where: { id: d.officialSourceId },
      select: { id: true },
    });
    if (!source) return notFound("official_source_not_found");

    const link = await prisma.legalServiceOfficialSource.upsert({
      where: {
        legalServiceId_officialSourceId: {
          legalServiceId: id,
          officialSourceId: d.officialSourceId,
        },
      },
      update: {
        relationType: d.relationType,
        notesAr: nullableText(d.notesAr),
        notesEn: nullableText(d.notesEn),
      },
      create: {
        legalServiceId: id,
        officialSourceId: d.officialSourceId,
        relationType: d.relationType,
        notesAr: nullableText(d.notesAr),
        notesEn: nullableText(d.notesEn),
      },
      include: { officialSource: true },
    });

    await audit("service.source.link", "LegalServiceOfficialSource", link.id, {
      actorId: session.id,
      legalServiceId: id,
      officialSourceId: d.officialSourceId,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (e) {
    return handleApiError("admin-services.sources.create", e);
  }
}
