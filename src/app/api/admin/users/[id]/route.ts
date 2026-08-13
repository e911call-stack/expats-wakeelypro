import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { userUpdateSchema } from "@/lib/validators/admin-ops";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id] — change role and/or verification.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) return notFound("user_not_found");
    // Never allow an admin to change their own role (prevents lockout).
    if (id === session.id) {
      return NextResponse.json({ error: "cannot_change_own_role" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    if (d.role !== undefined) data.role = d.role;
    if (d.isVerified !== undefined) data.isVerified = d.isVerified;
    if (d.name !== undefined) data.name = d.name;

    const user = await prisma.user.update({ where: { id }, data: data as never });

    await audit("user.update", "User", id, {
      actorId: session.id,
      from: { role: target.role },
      to: d,
    });
    return NextResponse.json({ user: { id: user.id, role: user.role, isVerified: user.isVerified, name: user.name } });
  } catch (e) {
    return handleApiError("admin-users.update", e);
  }
}
