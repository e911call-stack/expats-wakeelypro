import "server-only";
import crypto from "crypto";
import https from "https";
import fs from "fs";

/**
 * CliQ payment provider (Jordan national instant-payments, JoPACC).
 *
 * Integration follows the merchant "request-to-pay" flow exposed by partner
 * banks (Bank Al Etihad Payment Request API is the reference):
 *
 *   1. OAuth2 client-credentials → bearer token.
 *   2. POST the payment request (amount + our external transaction id +
 *      the customer's CliQ alias) → the customer approves in their banking app.
 *   3. The bank calls our callback/webhook URL → verify the HMAC signature,
 *      then mark the local Payment record PAID.
 *
 * When `CLIQ_*` env vars are not configured the provider runs in SANDBOX mode:
 * it simulates an instant approval so the rest of the app works in dev/tests.
 */

export const CLIQ_PROVIDER_NAME = "cliq";

export interface CliqRequestPaymentInput {
  amountJOD: number;
  externalTransactionId: string; // our Payment.id
  alias: string; // customer CliQ alias (phone, email, or CliQ ID)
  description?: string | null;
  callbackUrl?: string;
}

export interface CliqRequestPaymentResult {
  providerRef: string; // gateway transaction id (sim id in sandbox)
  approvalRequired: boolean; // false in sandbox (instant approval)
  checkoutUrl: string | null;
}

export function cliqConfigured(): boolean {
  return Boolean(process.env.CLIQ_CLIENT_ID && process.env.CLIQ_CLIENT_SECRET);
}

export function cliqBaseUrl(): string {
  return (
    process.env.CLIQ_API_URL ??
    "https://api.developer.bankaletihad.com/api/v1/partner/cliq/payment"
  );
}

/**
 * OAuth2 client-credentials access token.
 * Cached in-process for the token TTL.
 */
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const tokenUrl =
    process.env.CLIQ_TOKEN_URL ?? "https://auth.developer.bankaletihad.com/oauth2/token";
  const clientId = process.env.CLIQ_CLIENT_ID ?? "";
  const clientSecret = process.env.CLIQ_CLIENT_SECRET ?? "";

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: process.env.CLIQ_SCOPE ?? "cliq.payment",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`cliq_token_error status=${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("cliq_token_error: no access_token");

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 60 * 60 * 1000),
  };
  return data.access_token;
}

/** Node https.Agent with mTLS client certs (Bank Al Etihad requires mTLS). */
function buildHttpsAgent(): https.Agent | null {
  const certPath = process.env.CLIQ_CLIENT_CERT;
  const keyPath = process.env.CLIQ_CLIENT_KEY;
  const caPath = process.env.CLIQ_CA_CERT;
  if (!certPath || !keyPath) return null;
  const options: https.AgentOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  if (caPath) options.ca = fs.readFileSync(caPath);
  return new https.Agent(options);
}

/**
 * POST JSON using node `https.request` when an mTLS agent is configured
 * (Bank Al Etihad requires client certificates), else plain fetch.
 */
function postJson(
  url: string,
  body: Record<string, unknown>,
  token: string,
  agent: https.Agent | null,
  idempotencyKey?: string,
): Promise<Response> {
  if (agent) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const payload = JSON.stringify(body);
      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: `${u.pathname}${u.search}`,
          method: "POST",
          agent,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            Authorization: `Bearer ${token}`,
            ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
          },
          timeout: 20_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve(
              new Response(Buffer.concat(chunks), {
                status: res.statusCode ?? 500,
                headers: { "content-type": res.headers["content-type"] ?? "application/json" },
              }),
            ),
          );
        },
      );
      req.on("error", reject);
      req.on("timeout", () => req.destroy(new Error("cliq_timeout")));
      req.write(payload);
      req.end();
    });
  }

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
}

/** Send a CliQ payment request. In sandbox mode simulates instant approval. */
export async function requestPayment(input: CliqRequestPaymentInput): Promise<CliqRequestPaymentResult> {
  if (!cliqConfigured()) {
    const simRef = `cliq-sim-${Date.now()}`;
    return {
      providerRef: simRef,
      approvalRequired: false,
      checkoutUrl: null,
    };
  }

  const token = await getAccessToken();
  const agent = buildHttpsAgent();

  const payload: Record<string, unknown> = {
    alias: input.alias,
    amount: Number(input.amountJOD.toFixed(2)),
    currency: "JOD",
    externalTransactionId: input.externalTransactionId,
    description: input.description ?? null,
  };
  if (input.callbackUrl) payload.callbackUrl = input.callbackUrl;

  const res = await postJson(cliqBaseUrl(), payload, token, agent, input.externalTransactionId);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`cliq_payment_error status=${res.status} ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    transactionId?: string;
    status?: string;
    paymentRequestId?: string;
  };

  const providerRef = data.transactionId ?? data.paymentRequestId ?? input.externalTransactionId;
  const status = String(data.status ?? "").toUpperCase();
  const approvalRequired = status !== "SUCCESS" && status !== "APPROVED";

  return {
    providerRef,
    approvalRequired,
    checkoutUrl: approvalRequired
      ? `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/payments/${input.externalTransactionId}`
      : null,
  };
}

/**
 * Verify the CliQ webhook HMAC signature.
 * Signed payload: `${bodyJson}.${webhookId}.${timestamp}` with SHA-256 using
 * CLIQ_WEBHOOK_SECRET. Compare timing-safe.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookId?: string | null,
  timestamp?: string | null,
): boolean {
  const secret = process.env.CLIQ_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;

  const message = `${rawBody}.${webhookId ?? ""}.${timestamp ?? ""}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Optional: replay-safe webhookId cache (in-memory; replace with DB in prod). */
const seenWebhookIds = new Set<string>();
export function webhookAlreadySeen(webhookId: string | null): boolean {
  if (!webhookId) return false;
  return seenWebhookIds.has(webhookId);
}
export function rememberWebhook(webhookId: string | null): void {
  if (webhookId) seenWebhookIds.add(webhookId);
}
