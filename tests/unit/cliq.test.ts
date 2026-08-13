import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import {
  verifyWebhookSignature,
  cliqConfigured,
  CLIQ_PROVIDER_NAME,
  webhookAlreadySeen,
  rememberWebhook,
} from "@/lib/payments/cliq";

describe("cliq provider", () => {
  beforeEach(() => {
    delete process.env.CLIQ_WEBHOOK_SECRET;
    delete process.env.CLIQ_CLIENT_ID;
    delete process.env.CLIQ_CLIENT_SECRET;
  });

  it("exposes the provider name", () => {
    expect(CLIQ_PROVIDER_NAME).toBe("cliq");
  });

  it("is not configured when client credentials are missing", () => {
    expect(cliqConfigured()).toBe(false);
  });

  it("is configured when client credentials are present", () => {
    process.env.CLIQ_CLIENT_ID = "cid";
    process.env.CLIQ_CLIENT_SECRET = "secret";
    expect(cliqConfigured()).toBe(true);
  });

  it("rejects a request with no webhook secret configured", () => {
    expect(verifyWebhookSignature("{}", "abc")).toBe(false);
  });

  it("rejects a request with a missing signature", () => {
    process.env.CLIQ_WEBHOOK_SECRET = "s3cret";
    expect(verifyWebhookSignature("{}", null)).toBe(false);
  });

  it("verifies a valid HMAC signature (sha256 over body.webhookId.timestamp)", () => {
    process.env.CLIQ_WEBHOOK_SECRET = "s3cret";
    const rawBody = JSON.stringify({ externalTransactionId: "pay_1", status: "SUCCESS" });
    const webhookId = "wh_1";
    const timestamp = "1700000000";
    const signature = crypto
      .createHmac("sha256", "s3cret")
      .update(`${rawBody}.${webhookId}.${timestamp}`)
      .digest("hex");
    expect(verifyWebhookSignature(rawBody, signature, webhookId, timestamp)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    process.env.CLIQ_WEBHOOK_SECRET = "s3cret";
    const rawBody = JSON.stringify({ externalTransactionId: "pay_1", status: "FAILED" });
    const signature = crypto
      .createHmac("sha256", "s3cret")
      .update(`${rawBody}.wh_x.1700000000`)
      .digest("hex");
    expect(verifyWebhookSignature(rawBody, signature, "wh_OTHER", "1700000000")).toBe(false);
  });

  it("tracks seen webhook ids for replay safety", () => {
    expect(webhookAlreadySeen("wh_dup")).toBe(false);
    rememberWebhook("wh_dup");
    expect(webhookAlreadySeen("wh_dup")).toBe(true);
  });
});
