import "server-only";
import { prisma } from "@/lib/db";

/**
 * SMS provider helper (Twilio).
 *
 * Config (see .env.example):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_FROM
 *
 * When Twilio is NOT configured, sends are logged to the console (dev mode).
 * Never throws — a failed SMS must not break the request that triggered it.
 */
export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_FROM,
  );
}

/**
 * Send an SMS to an E.164 phone number. Best-effort.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_FROM;

  if (!twilioSid || !twilioToken || !twilioFrom) {
    console.log(`\n[SMS] To: ${to}\n[SMS] Body: ${body}\n`);
    return false;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: twilioFrom, Body: body }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      console.error("[sms] Twilio error:", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sms] Twilio failed:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

// In-process mute to avoid SMS storms from batch/loop operations.
const smsCooldown = new Map<string, number>();

/**
 * Send an SMS to a user by DB id (looks up their phone). Best-effort.
 * If the user has no phone, or the same user was messaged within `cooldownMs`,
 * the send is skipped (guard against loops / re-pings).
 */
export async function sendUserSms(userId: string, body: string, cooldownMs = 60_000): Promise<boolean> {
  const now = Date.now();
  const last = smsCooldown.get(userId);
  if (last && now - last < cooldownMs) return false;
  smsCooldown.set(userId, now);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) return false;
    return sendSms(user.phone, body);
  } catch {
    return false;
  }
}