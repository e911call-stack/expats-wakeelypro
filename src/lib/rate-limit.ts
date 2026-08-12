import "server-only";

type Window = { perMinute: number; perHour: number };
type State = {
  minute: { count: number; resetAt: number };
  hour: { count: number; resetAt: number };
};

// In-memory store. Works per serverless instance.
// For multi-region accuracy, swap with Upstash Redis or Vercel KV.
const store = new Map<string, State>();

const GC_INTERVAL = 60_000;
let lastGc = Date.now();
function gc() {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL) return;
  lastGc = now;
  for (const [k, s] of store.entries()) {
    if (s.minute.resetAt < now && s.hour.resetAt < now) store.delete(k);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: { minute: number; hour: number };
  retryAfter: number | null;
};

export function checkRateLimit(key: string, window: Window): RateLimitResult {
  gc();
  const now = Date.now();
  const minuteWindowMs = 60_000;
  const hourWindowMs = 60 * 60_000;

  let s = store.get(key);
  if (!s) {
    s = {
      minute: { count: 0, resetAt: now + minuteWindowMs },
      hour: { count: 0, resetAt: now + hourWindowMs },
    };
  }
  if (s.minute.resetAt < now) s.minute = { count: 0, resetAt: now + minuteWindowMs };
  if (s.hour.resetAt < now) s.hour = { count: 0, resetAt: now + hourWindowMs };

  s.minute.count += 1;
  s.hour.count += 1;
  store.set(key, s);

  if (s.minute.count > window.perMinute) {
    return {
      allowed: false,
      remaining: { minute: 0, hour: Math.max(0, window.perHour - s.hour.count) },
      retryAfter: Math.ceil((s.minute.resetAt - now) / 1000),
    };
  }
  if (s.hour.count > window.perHour) {
    return {
      allowed: false,
      remaining: { minute: 0, hour: 0 },
      retryAfter: Math.ceil((s.hour.resetAt - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: { minute: window.perMinute - s.minute.count, hour: window.perHour - s.hour.count },
    retryAfter: null,
  };
}
