import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/me — returns the current user from the session cookie.
 */
export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: session });
}
