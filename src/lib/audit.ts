import "server-only";
import { prisma } from "./db";

export interface AuditContext {
  actorId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Lightweight audit-log writer. Best-effort: never lets an audit-log failure
 * break the request. Logs to console if DB write fails.
 */
export async function audit(
  action: string,
  entity: string,
  entityId: string,
  metadata?: AuditContext,
  ok = true,
): Promise<void> {
  try {
    // If you add an AuditLog model later, persist here. For now, log to console.
    console.log(
      `[audit] ${action} ${entity}/${entityId} ok=${ok} actor=${metadata?.actorId ?? "system"}`,
      metadata ? JSON.stringify(metadata) : "",
    );
  } catch (e) {
    console.warn(`[audit] failed:`, e instanceof Error ? e.message : String(e));
  }
}
