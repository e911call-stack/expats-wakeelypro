import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/legal/matters/[id]/payments
 * Records a payment against the matter. Phase 1 — simulates success.
 * In production, hook into your existing payment provider.
 *
 * Body: { kind: "platform_fee"|"lawyer_fee"|"government_fee"|"disbursement", amountJOD: number, description? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, lawyerId: true, title: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isClient = matter.clientId === session.id;
    const isAdmin = session.role === "ADMIN";
    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const validKinds = ["platform_fee", "lawyer_fee", "government_fee", "disbursement"];
    const kind = String(body.kind ?? "platform_fee");
    if (!validKinds.includes(kind)) {
      return NextResponse.json({ error: "invalid kind" }, { status: 400 });
    }

    const amountJOD = Number(body.amountJOD ?? 0);
    if (!Number.isFinite(amountJOD) || amountJOD <= 0) {
      return NextResponse.json({ error: "amountJOD must be positive" }, { status: 400 });
    }

    const description = body.description ? String(body.description) : null;

    // NOTE: In production, integrate with your existing Payment model + provider.
    // This Phase 1 version records a simulated PAID payment.
    const payment = await prisma.payment.create({
      data: {
        userId: session.id,
        matterId,
        amountJOD,
        kind: kind as "platform_fee" | "lawyer_fee" | "government_fee" | "disbursement",
        status: "PAID", // Phase 1: simulate immediate success
        providerRef: `sim-${Date.now()}`,
        providerName: "phase1-simulated",
        description,
        paidAt: new Date(),
      },
    });

    await addTimelineEvent({
      matterId, eventType: "payment_received",
      titleAr: `تم استلام دفعة (${amountJOD} د.أ)`, titleEn: `Payment received (${amountJOD} JOD)`,
      descriptionAr: description ?? kind, descriptionEn: description ?? kind,
      actorId: session.id, actorRole: session.role === "LAWYER" ? "lawyer" : "client",
      metadata: { paymentId: payment.id, kind, amountJOD },
    });

    await audit("payment.received", "Payment", payment.id, { actorId: session.id, matterId, kind, amountJOD });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    return handleApiError("legal-matters.payment", e);
  }
}
