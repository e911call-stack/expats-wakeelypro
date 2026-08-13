import "server-only";
import { redirect } from "next/navigation";
import { requireRole, type SessionPayload } from "@/lib/session-server";

/**
 * Server-side guard for Super Admin pages.
 * Redirects to sign-in if not logged in, or not ADMIN.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const auth = await requireRole("ADMIN");
  if ("status" in auth) {
    redirect("/auth/signin?redirect=/admin");
  }
  return auth.session;
}
