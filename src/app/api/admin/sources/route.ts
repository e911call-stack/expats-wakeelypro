import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { sourceSchema } from "@/lib/validators/admin-ops";

export const runtime = "nodejs";

/**
 * GET /api/admin/sources — list official sources (active first), for CRUD + linking.
 * Query: ?search=&all=true  (all=true includes inactive, for editing)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const includeInactive = sp.get("all") === "true";

    const where: Record<string, unknown> = {};
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const sources = await prisma.officialSource.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { nameEn: "asc" }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        url: true,
        authorityType: true,
        country: true,
        region: true,
        notesAr: true,
        notesEn: true,
        isActive: true,
      },
    });
    return NextResponse.json({ sources });
  } catch (e) {
    return handleApiError("admin-sources.list", e);
  }
}

/**
 * POST /api/admin/sources — create an official source.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const body = await req.json().catch(() => ({}));
    const parsed = sourceSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const existing = await prisma.officialSource.findUnique({ where: { slug: d.slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "slug_taken", slug: d.slug }, { status: 409 });
    }

    const source = await prisma.officialSource.create({
      data: {
        slug: d.slug,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        url: d.url ?? null,
        authorityType: d.authorityType,
        country: d.country,
        region: nullableText(d.region),
        notesAr: nullableText(d.notesAr),
        notesEn: nullableText(d.notesEn),
        isActive: d.isActive,
      },
    });

    await audit("source.create", "OfficialSource", source.id, { actorId: session.id });
    return NextResponse.json({ source }, { status: 201 });
  } catch (e) {
    return handleApiError("admin-sources.create", e);
  }
}
