import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

function attachmentMeta(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const file = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      fileName: String(file.fileName ?? "attachment"),
      fileType: String(file.fileType ?? "file"),
      fileSize: Number(file.fileSize ?? 0),
      hasContent: Boolean(file.fileBase64),
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const status = sp.get("status") ?? "";
    const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
    const perPage = Math.min(50, Math.max(1, Number(sp.get("perPage") ?? 20) || 20));
    const where: Record<string, unknown> = {};
    if (status === "in_progress" || status === "completed" || status === "abandoned") where.status = status;
    if (search) {
      where.OR = [
        { rawText: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.legalIntake.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { user: { select: { id: true, name: true, phone: true, email: true, currentCountry: true, currentCity: true } }, matter: { select: { id: true, status: true } } },
      }),
      prisma.legalIntake.count({ where }),
    ]);
    const intakes = rows.map((row) => {
      const structured = row.structured && typeof row.structured === "object" ? row.structured as Record<string, unknown> : {};
      const { supportingDocuments: _supportingDocuments, ...safeStructured } = structured;
      return {
        id: row.id, status: row.status, language: row.language, rawText: row.rawText,
        finalSummary: row.finalSummary, confidence: row.confidence, createdAt: row.createdAt, updatedAt: row.updatedAt,
        user: row.user, matter: row.matter, structured: safeStructured,
        supportingDocuments: attachmentMeta(_supportingDocuments),
      };
    });
    return NextResponse.json({ intakes, total, page, perPage });
  } catch (error) {
    return handleApiError("admin-intakes.list", error);
  }
}
