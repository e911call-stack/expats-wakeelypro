import "server-only";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { sendSms, smsConfigured } from "@/lib/sms";

/**
 * Phone OTP authentication.
 *
 * Generates a 6-digit code, stores it as an OtpChallenge, and sends it via
 * the Twilio SMS provider (see src/lib/sms.ts). When Twilio is not configured
 * the code is logged to the console instead (dev mode).
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
  return { code: smsConfigured() ? null : code, expiresAt };
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
