import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";
import {
  verifyWebhookSignature,
  webhookAlreadySeen,
  rememberWebhook,
} from "@/lib/payments/cliq";
import { confirmPayment } from "@/lib/payments/confirm";

export const runtime = "nodejs";

/**
 * POST /api/payments/cliq/webhook
 * CliQ payment callback. Verifies the HMAC signature, then marks the matching
 * Payment as PAID (idempotent).
 *
 * Expected JSON: { externalTransactionId, transactionId, status, webhookId?, timestamp? }
 * Headers: `X-Cliq-Signature: <hmac-sha256-hex>`
 *
 * Returns 200 immediately; failures that look like retries return 200.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const signature = req.headers.get("x-cliq-signature");
    const webhookId = body.webhookId ? String(body.webhookId) : null;
    const timestamp = body.timestamp ? String(body.timestamp) : null;
    const externalTransactionId = body.externalTransactionId ? String(body.externalTransactionId) : "";
    const status = String(body.status ?? "").toUpperCase();

    if (!externalTransactionId) {
      return NextResponse.json({ error: "missing_external_transaction_id" }, { status: 400 });
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookId, timestamp)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    if (webhookAlreadySeen(webhookId)) {
      return NextResponse.json({ ok: true, alreadyDone: true });
    }
    rememberWebhook(webhookId);

    const payment = await prisma.payment.findUnique({
      where: { id: externalTransactionId },
      select: { id: true },
    });
    if (!payment) {
      // Unknown reference — acknowledge so the gateway stops retrying.
      return NextResponse.json({ ok: true, ignored: "unknown_payment" });
    }

    if (status === "SUCCESS" || status === "APPROVED" || status === "PAID" || status === "CAPTURED") {
      const { alreadyDone } = await confirmPayment(payment.id, {
        providerRef: body.transactionId ? String(body.transactionId) : null,
        providerName: "cliq",
        confirmedBy: "cliq-webhook",
      });
      return NextResponse.json({ ok: true, alreadyDone });
    }

    // FAILED / EXPIRED / CANCELLED etc.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError("cliq-webhook", e);
  }
}
