import "server-only";
import { verifySession, type SessionPayload } from "./auth";

export type { SessionPayload };
export { verifySession as getServerSession };

/**
 * Require a valid session. Returns null if not authenticated (does NOT throw).
 * Use this in API routes — return 401 JSON if null.
 */
export async function requireSession(): Promise<SessionPayload | null> {
  return await verifySession();
}

/**
 * Require a specific role. Returns null if not authenticated or not authorized.
 */
export async function requireRole(
  ...roles: SessionPayload["role"][]
): Promise<SessionPayload | null> {
  const session = await verifySession();
  if (!session) return null;
  if (!roles.includes(session.role)) return null;
  return session;
}
