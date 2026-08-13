import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";
import { handleApiError, validationError, notFound } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { nullableText } from "@/lib/admin/services";
import { paymentUpdateSchema } from "@/lib/validators/admin-ops";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/payments/[id] — update status and/or description.
 * When set to PAID without a paidAt, records the timestamp.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole("ADMIN");
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
    const session = auth.session;

    const { id } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, paidAt: true },
    });
    if (!payment) return notFound("payment_not_found");

    const body = await req.json().catch(() => ({}));
    const parsed = paymentUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    if (d.status !== undefined) {
      data.status = d.status;
      if (d.status === "PAID" && !payment.paidAt) data.paidAt = new Date();
    }
    if (d.description !== undefined) data.description = nullableText(d.description);

    const updated = await prisma.payment.update({ where: { id }, data: data as never });

    await audit("payment.update", "Payment", id, { actorId: session.id, ...d });
    return NextResponse.json({ payment: updated });
  } catch (e) {
    return handleApiError("admin-payments.update", e);
  }
}
