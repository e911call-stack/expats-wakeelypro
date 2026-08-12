import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

interface Params { params: Promise<{ slug: string }> }

/**
 * GET /api/legal/services/[slug]
 * Full service detail: practice area, procedure, document requirements, official sources.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const service = await prisma.legalService.findUnique({
      where: { slug },
      include: {
        practiceArea: true,
        procedures: { orderBy: { sortOrder: "asc" } },
        documentRequirements: { orderBy: { sortOrder: "asc" } },
        officialSources: { include: { officialSource: true } },
      },
    });
    if (!service || !service.isActive) {
      return NextResponse.json({ error: "service_not_found" }, { status: 404 });
    }

    const result = {
      ...service,
      procedure: service.procedures[0] ?? null,
      officialSources: service.officialSources.map((os) => os.officialSource),
    };
    return NextResponse.json({ service: result });
  } catch (e) {
    return handleApiError("legal-services.detail", e);
  }
}
