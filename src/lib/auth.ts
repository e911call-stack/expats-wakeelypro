import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "ewp.session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "[auth] JWT_SECRET is missing or shorter than 32 characters. " +
        "Set a strong secret in your .env file (use `openssl rand -hex 32` to generate one).",
    );
  }
  return new TextEncoder().encode(raw);
}

export interface SessionPayload {
  id: string;
  name: string;
  role: "CITIZEN" | "LAWYER" | "ADMIN";
  phone: string;
  email?: string;
  lawyerId?: string;
  language?: "ar" | "en";
}

export async function createSessionCookie(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(): Promise<SessionPayload | null> {
  try {
    const c = await cookies();
    const raw = c.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const { payload } = await jwtVerify(raw, getSecret());
    return {
      id: payload.id as string,
      name: payload.name as string,
      role: payload.role as SessionPayload["role"],
      phone: payload.phone as string,
      email: payload.email as string | undefined,
      lawyerId: payload.lawyerId as string | undefined,
      language: payload.language as "ar" | "en" | undefined,
    };
  } catch {
    return null;
  }
}

export function destroySessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE;
