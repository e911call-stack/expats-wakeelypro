import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { serviceSchema } from "@/lib/validators/admin-services";

export const runtime = "nodejs";

/**
 * GET /api/admin/services — list services with optional filters.
 * Query: ?search=&active=true|false&featured=true|false
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const active = sp.get("active");
    const featured = sp.get("featured");

    const where: Record<string, unknown> = {};
    if (active === "true") where.isActive = true;
    else if (active === "false") where.isActive = false;
    if (featured === "true") where.isFeatured = true;
    else if (featured === "false") where.isFeatured = false;
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const services = await prisma.legalService.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        practiceArea: { select: { slug: true, nameAr: true, nameEn: true } },
        _count: {
          select: {
            procedures: true,
            documentRequirements: true,
            officialSources: true,
            matters: true,
          },
        },
      },
    });

    return NextResponse.json({ services });
  } catch (e) {
    return handleApiError("admin-services.list", e);
  }
}

/**
 * POST /api/admin/services — create a legal service.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const body = await req.json().catch(() => ({}));
    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;

    const existing = await prisma.legalService.findFirst({
      where: { OR: [{ slug: data.slug }, { code: data.code }] },
      select: { slug: true, code: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "slug_or_code_taken", slug: data.slug, code: data.code },
        { status: 409 },
      );
    }

    const service = await prisma.legalService.create({
      data: {
        slug: data.slug,
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        shortAr: data.shortAr,
        shortEn: data.shortEn,
        descriptionAr: data.descriptionAr,
        descriptionEn: data.descriptionEn,
        practiceAreaId: data.practiceAreaId ?? null,
        defaultRemoteEligibility: data.defaultRemoteEligibility,
        platformFeeDefault: data.platformFeeDefault,
        lawyerFeeMin: data.lawyerFeeMin,
        lawyerFeeMax: data.lawyerFeeMax,
        governmentFeeEstimate: data.governmentFeeEstimate,
        governmentFeeNoteAr: nullableText(data.governmentFeeNoteAr),
        governmentFeeNoteEn: nullableText(data.governmentFeeNoteEn),
        typicalDurationDays: data.typicalDurationDays,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
      },
    });

    await audit("service.create", "LegalService", service.id, { actorId: session.id });
    return NextResponse.json({ service }, { status: 201 });
  } catch (e) {
    return handleApiError("admin-services.create", e);
  }
}
