import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, badRequest, rateLimited } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { createOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

/**
 * POST /api/auth/otp/request
 *
 * Request a verification code be sent to the given phone number.
 * If the phone is not already registered, a new User is created (role: CITIZEN).
 *
 * Body: { phone: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
      return badRequest("Invalid phone number. Must be in E.164 format (e.g., +962790000000).");
    }

    const rl = checkRateLimit(`otp-request:${phone}`, { perMinute: 2, perHour: 10 });
    if (!rl.allowed) return rateLimited(rl.retryAfter);

    // Auto-create user if not exists
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        name: phone, // User can update later
        role: "CITIZEN",
        language: "ar",
        isVerified: false,
      },
    });

    const { code, expiresAt } = await createOtpChallenge(phone);

    return NextResponse.json({
      ok: true,
      userId: user.id,
      expiresAt,
      // In dev mode (no Twilio configured), the code is returned so the UI can display it.
      // In production, code is null — the user must read it from their SMS.
      devCode: code,
    });
  } catch (e) {
    return handleApiError("auth.otp.request", e);
  }
}
