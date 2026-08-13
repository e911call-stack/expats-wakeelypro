import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { audit } from "@/lib/audit";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";
import { DISCLAIMER_VERSION } from "@/lib/legal-disclaimer";
import { requestPayment, CLIQ_PROVIDER_NAME } from "@/lib/payments/cliq";
import { confirmPayment } from "@/lib/payments/confirm";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/legal/matters/[id]/payments
 * Creates a PENDING payment and sends a CliQ payment request.
 *
 * Body: { kind: "platform_fee"|"lawyer_fee"|"government_fee"|"disbursement", amountJOD: number, description?, alias? }
 *
 * When CliQ keys are not configured (sandbox) the payment is approved
 * instantly; otherwise the response includes `checkoutUrl` and the payment
 * flips to PAID via the CliQ webhook.
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
    if (body.disclaimerAcknowledged !== true) {
      return NextResponse.json({ error: "disclaimer_acknowledgment_required", disclaimerVersion: DISCLAIMER_VERSION }, { status: 400 });
    }
    const disclaimerVersion = String(body.disclaimerVersion ?? DISCLAIMER_VERSION);
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
    const alias = body.alias ? String(body.alias) : (session.phone ?? null);

    // 1) Create a PENDING payment first.
    const payment = await prisma.payment.create({
      data: {
        userId: session.id,
        matterId,
        amountJOD,
        kind: kind as "platform_fee" | "lawyer_fee" | "government_fee" | "disbursement",
        status: "PENDING",
        providerName: CLIQ_PROVIDER_NAME,
        description,
      },
    });

    // 2) Send the CliQ request-to-pay.
    const cliq = await requestPayment({
      amountJOD,
      externalTransactionId: payment.id,
      alias,
      description,
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/payments/cliq/webhook`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: cliq.providerRef },
    });

    await audit("payment.initiated", "Payment", payment.id, {
      actorId: session.id, matterId, kind, amountJOD, provider: CLIQ_PROVIDER_NAME, disclaimerAcknowledged: true, disclaimerVersion,
    });

    // 3) Sandbox (no keys): simulate instant approval.
    if (!cliq.approvalRequired) {
      const { payment: updated } = await confirmPayment(payment.id, {
        providerRef: cliq.providerRef,
        providerName: CLIQ_PROVIDER_NAME,
        confirmedBy: session.id,
      });
      return NextResponse.json({ payment: { ...payment, status: updated.status, providerRef: cliq.providerRef }, status: updated.status }, { status: 201 });
    }

    // 4) Real CliQ: waiting for customer approval.
    return NextResponse.json({
      payment: { ...payment, providerRef: cliq.providerRef },
      status: "PENDING",
      checkoutUrl: cliq.checkoutUrl,
    }, { status: 201 });
  } catch (e) {
    return handleApiError("legal-matters.payment", e);
  }
}
