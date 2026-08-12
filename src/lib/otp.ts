import "server-only";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

/**
 * Phone OTP authentication.
 *
 * Generates a 6-digit code, stores it as an OtpChallenge, and "sends" it via
 * the configured SMS provider. In production, set up:
 *
 *   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_FROM
 *   - OR Vonage / MessageBird / any SMS provider
 *
 * Phase 1 ships with a console.log sender (dev mode). To enable real SMS,
 * implement `sendSms` below with your provider's SDK.
 */

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  // 6-digit code
  const buf = randomBytes(3);
  const n = (buf.readUIntBE(0, 3) % 1_000_000).toString().padStart(6, "0");
  return n;
}

/**
 * Create an OTP challenge for a phone number.
 * Returns the code (in dev mode) or null (in production, the code is sent via SMS only).
 */
export async function createOtpChallenge(phone: string): Promise<{ code: string | null; expiresAt: Date }> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpChallenge.create({
    data: { phone, code, expiresAt },
  });

  await sendSms(phone, `Your Expats WakeelyPro verification code is: ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`);

  // In dev mode (no SMS provider configured), return the code so the UI can display it.
  const isDevMode = !process.env.TWILIO_ACCOUNT_SID;
  return { code: isDevMode ? code : null, expiresAt };
}

/**
 * Verify an OTP challenge. Returns true if the code matches and is not expired.
 * Consumes the challenge on success (so it can't be reused).
 */
export async function verifyOtpChallenge(phone: string, code: string): Promise<boolean> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return false;

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return false;
  }

  if (challenge.code !== code) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  return true;
}

/**
 * Send an SMS. Override this with your SMS provider's SDK in production.
 */
async function sendSms(to: string, body: string): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
    // Production: send via Twilio
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
        },
      );
      if (!res.ok) {
        console.error("[sms] Twilio error:", await res.text());
      }
    } catch (e) {
      console.error("[sms] Twilio failed:", e instanceof Error ? e.message : String(e));
    }
    return;
  }

  // Dev mode: just log to console
  console.log(`\n[SMS] To: ${to}\n[SMS] Body: ${body}\n`);
}
