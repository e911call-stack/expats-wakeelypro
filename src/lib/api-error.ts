import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Unified API error handler. Returns a client-safe 500 response with a requestId.
 * Never leaks internal error details to the client.
 */
function requestId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function handleApiError(context: string, e: unknown): NextResponse {
  const id = requestId();
  const message = e instanceof Error ? e.message : String(e);
  const stack = e instanceof Error ? e.stack : undefined;
  console.error(`[${context}] ${id}:`, message, stack ?? "");
  return NextResponse.json(
    { error: "internal_error", requestId: id },
    { status: 500 },
  );
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: "bad_request", message, ...extra }, { status: 400 });
}

export function notFound(message = "not_found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function rateLimited(retryAfter: number | null) {
  return NextResponse.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter ?? 60) } },
  );
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "validation_error",
      issues: error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    },
    { status: 400 },
  );
}
