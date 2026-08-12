import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, badRequest, rateLimited } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyOtpChallenge } from "@/lib/otp";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/otp/verify
 *
 * Verify the code sent to the given phone number. On success, sets a session
 * cookie and returns the user.
 *
 * Body: { phone: string, code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const code = String(body.code ?? "").trim();
    if (!phone || !code) return badRequest("phone and code are required");

    const rl = checkRateLimit(`otp-verify:${phone}`, { perMinute: 5, perHour: 20 });
    if (!rl.allowed) return rateLoaded(rl.retryAfter);

    const ok = await verifyOtpChallenge(phone, code);
    if (!ok) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { lawyerProfile: { select: { id: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Mark verified
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    const token = await createSessionCookie({
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      email: user.email ?? undefined,
      lawyerId: user.lawyerProfile?.id,
      language: user.language,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        lawyerId: user.lawyerProfile?.id,
        language: user.language,
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (e) {
    return handleApiError("auth.otp.verify", e);
  }
}

function rateLoaded(retryAfter: number | null) {
  return rateLimited(retryAfter);
}
