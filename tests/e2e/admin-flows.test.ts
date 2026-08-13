import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";

/**
 * End-to-end tests for the admin API surface.
 *
 * Opt-in: these need a live dev server + Postgres. Run them via
 * `npm run test:e2e`, which bootstraps Docker Postgres, seeds the DB, starts
 * `next dev` on :3100, sets TEST_API_URL, and tears everything down after.
 *
 * Tokens are minted locally with the same JWT_SECRET the server uses.
 */

const BASE = process.env.TEST_API_URL ?? "";
const SECRET = process.env.JWT_SECRET ?? "local-dev-dummy-secret-please-replace-0123456789abcdef";

const skip = !BASE;

async function mintToken(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3600s")
    .sign(new TextEncoder().encode(SECRET));
}

async function api(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: `ewp.session=${token}`,
      ...(init.headers ?? {}),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body };
}

let adminToken: string;
let lawyerToken: string;

describe("admin API auth convention", () => {
  beforeAll(async () => {
    adminToken = await mintToken({ id: "test-admin", name: "T Admin", role: "ADMIN", phone: "+000" });
    lawyerToken = await mintToken({ id: "test-lawyer", name: "T Lawyer", role: "LAWYER", phone: "+000", lawyerId: "none" });
  });

  it.runIf(!skip)("returns 401 when unauthenticated", async () => {
    const res = await fetch(`${BASE}/api/admin/matters`);
    expect(res.status).toBe(401);
  });

  it.runIf(!skip)("returns 403 when authenticated but not ADMIN", async () => {
    const { status, body } = await api("/api/admin/matters", lawyerToken);
    expect(status).toBe(403);
    expect(body).toHaveProperty("error");
  });

  it.runIf(!skip)("returns 200 for an ADMIN", async () => {
    const { status } = await api("/api/admin/matters", adminToken);
    expect(status).toBe(200);
  });
});

describe("admin API endpoints (live)", () => {
  it.runIf(!skip)("lists matters with filters", async () => {
    const { status, body } = await api("/api/admin/matters?perPage=5&needsAssignment=true", adminToken);
    expect(status).toBe(200);
    expect(body).toHaveProperty("matters");
    expect(body).toHaveProperty("total");
    expect(Array.isArray((body as { matters: unknown[] }).matters)).toBe(true);
  });

  it.runIf(!skip)("lists lawyers with a verified filter", async () => {
    const { status, body } = await api("/api/admin/lawyers?verified=true", adminToken);
    expect(status).toBe(200);
    expect(body).toHaveProperty("lawyers");
  });

  it.runIf(!skip)("lists users with a role filter", async () => {
    const { status, body } = await api("/api/admin/users?role=LAWYER", adminToken);
    expect(status).toBe(200);
    expect(body).toHaveProperty("users");
    const users = (body as { users: { role: string }[] }).users;
    if (users.length) expect(users.every((u) => u.role === "LAWYER")).toBe(true);
  });

  it.runIf(!skip)("lists payments", async () => {
    const { status, body } = await api("/api/admin/payments?status=PENDING", adminToken);
    expect(status).toBe(200);
    expect(body).toHaveProperty("payments");
  });

  it.runIf(!skip)("lists sources with the show-all toggle", async () => {
    const { status, body } = await api("/api/admin/sources?all=true", adminToken);
    expect(status).toBe(200);
    expect(body).toHaveProperty("sources");
  });

  it.runIf(!skip)("blocks an admin from downgrading their own role", async () => {
    const adminId = process.env.TEST_ADMIN_ID ?? "";
    // Only asserts the 400 path when a real admin id is provided by the bootstrap.
    if (!adminId) return;
    const selfToken = await mintToken({ id: adminId, name: "Admin", role: "ADMIN", phone: "+000" });
    const { status, body } = await api(`/api/admin/users/${adminId}`, selfToken, {
      method: "PATCH",
      body: JSON.stringify({ role: "CITIZEN" }),
    });
    expect(status).toBe(400);
    expect(body).toHaveProperty("error", "cannot_change_own_role");
  });
});
