import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; index: string }> }) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const { id, index } = await params;
    const attachmentIndex = Number(index);
    if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex > 2) return NextResponse.json({ error: "invalid_document" }, { status: 400 });
    const intake = await prisma.legalIntake.findUnique({ where: { id }, select: { structured: true } });
    if (!intake) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const structured = intake.structured && typeof intake.structured === "object" ? intake.structured as Record<string, unknown> : {};
    const documents = Array.isArray(structured.supportingDocuments) ? structured.supportingDocuments : [];
    const document = documents[attachmentIndex] && typeof documents[attachmentIndex] === "object" ? documents[attachmentIndex] as Record<string, unknown> : null;
    if (!document || typeof document.fileBase64 !== "string") return NextResponse.json({ error: "document_not_found" }, { status: 404 });
    const source = document.fileBase64;
    const match = source.match(/^data:([^;]+);base64,([\s\S]+)$/);
    const mime = match?.[1] || String(document.fileType || "application/octet-stream");
    const encoded = match?.[2] || source;
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.byteLength > 2 * 1024 * 1024) return NextResponse.json({ error: "document_too_large" }, { status: 413 });
    const filename = String(document.fileName || "attachment").replace(/[\r\n"\\/]/g, "_");
    return new NextResponse(bytes, { status: 200, headers: { "Content-Type": mime, "Content-Length": String(bytes.byteLength), "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError("admin-intakes.document-download", error);
  }
}
