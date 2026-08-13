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
 * Require a specific role.
 * Returns `{ session }` on success, or `{ status: 401 }` (unauthenticated) /
 * `{ status: 403 }` (authenticated but wrong role) so callers can respond with
 * the correct HTTP code.
 */
export async function requireRole(
  ...roles: SessionPayload["role"][]
): Promise<{ session: SessionPayload } | { status: 401 | 403 }> {
  const session = await verifySession();
  if (!session) return { status: 401 };
  if (!roles.includes(session.role)) return { status: 403 };
  return { session };
}
