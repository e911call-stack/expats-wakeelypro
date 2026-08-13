import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status === "in_progress" || body.status === "completed" || body.status === "abandoned" ? body.status : undefined;
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 4000) : undefined;
    if (!status && adminNote === undefined) return NextResponse.json({ error: "no_changes" }, { status: 400 });
    const current = await prisma.legalIntake.findUnique({ where: { id }, select: { structured: true } });
    if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const currentStructured = current.structured && typeof current.structured === "object" ? current.structured as Record<string, unknown> : {};
    const structured = adminNote === undefined ? currentStructured : { ...currentStructured, adminNote };
    const intake = await prisma.legalIntake.update({ where: { id }, data: { ...(status ? { status } : {}), structured: structured as Prisma.InputJsonValue } });
    return NextResponse.json({ intake: { id: intake.id, status: intake.status, structured: intake.structured, updatedAt: intake.updatedAt } });
  } catch (error) {
    return handleApiError("admin-intakes.update", error);
  }
}
