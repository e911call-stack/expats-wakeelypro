import "server-only";
import { prisma } from "@/lib/db";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";
import { audit } from "@/lib/audit";
import { sendUserSms } from "@/lib/sms";

/**
 * Idempotently confirm a Payment as PAID. No-op if already PAID/REFUNDED.
 * Adds a timeline event and a notification to the matter's client.
 */
export async function confirmPayment(paymentId: string, opts: {
  providerRef?: string | null;
  providerName?: string | null;
  confirmedBy?: string;
}): Promise<{ payment: { id: string; status: string }; alreadyDone: boolean }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { matter: { select: { id: true, title: true, clientId: true } } },
  });
  if (!payment) throw new Error("payment_not_found");
  if (payment.status === "PAID" || payment.status === "REFUNDED") {
    return { payment: { id: payment.id, status: payment.status }, alreadyDone: true };
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      ...(opts.providerRef ? { providerRef: opts.providerRef } : {}),
      ...(opts.providerName ? { providerName: opts.providerName } : {}),
    },
  });

  if (payment.matterId) {
    await addTimelineEvent({
      matterId: payment.matterId,
      eventType: "payment_received",
      titleAr: `تم استلام دفعة (${payment.amountJOD} د.أ)`,
      titleEn: `Payment received (${payment.amountJOD} JOD)`,
      descriptionAr: `${payment.description ?? payment.kind} · ${opts.providerName ?? ""}`.trim(),
      descriptionEn: `${payment.description ?? payment.kind} · ${opts.providerName ?? ""}`.trim(),
      actorId: opts.confirmedBy ?? null,
      actorRole: "system",
      metadata: { paymentId, kind: payment.kind, amountJOD: payment.amountJOD, provider: opts.providerName ?? null },
    });

    if (payment.matter?.clientId) {
      await prisma.notification.create({
        data: {
          userId: payment.matter.clientId,
          kind: "payment_received",
          title: `Payment received (${payment.amountJOD} JOD)`,
          body: `Your payment of ${payment.amountJOD} JOD for "${payment.matter.title}" was received.`,
          link: `/matters/${payment.matterId}`,
          metadata: { paymentId, matterId: payment.matterId, amountJOD: payment.amountJOD } as object,
        },
      });
      await sendUserSms(
        payment.matter.clientId,
        `Expats WakeelyPro: Your payment of ${payment.amountJOD} JOD for "${payment.matter.title}" was received.`,
      );
    }
  }

  await audit("payment.confirmed", "Payment", payment.id, {
    actorId: opts.confirmedBy ?? "gateway",
    provider: opts.providerName ?? null,
  });

  return { payment: { id: payment.id, status: "PAID" }, alreadyDone: false };
}
