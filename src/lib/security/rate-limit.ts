/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free: GitChronicle runs as a single instance pinned
 * to one volume (SQLite cannot scale horizontally anyway), so per-process
 * counters are exactly as accurate as a shared store would be. If the app ever
 * grows past one replica, swap the map for Redis — the call site stays the same.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Requests still available in the current window */
  remaining: number;
  /** Seconds until the window resets */
  retryAfter: number;
  limit: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so a stream of unique IPs cannot grow the map forever. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      remaining: limit - 1,
      retryAfter: Math.ceil(windowMs / 1000),
      limit,
    };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
    limit,
  };
}

/**
 * Best-effort client identity. Behind a platform proxy the socket address is
 * the proxy itself, so the client has to come from a forwarded header — and
 * different platforms use different ones. Checking a single header is how every
 * caller ends up sharing one bucket, which turns a per-client limit into a
 * global lockout.
 *
 * This is spoofable by design — it is an abuse speed bump, not authentication.
 * Never use it for an authorization decision.
 */
const CLIENT_IP_HEADERS = [
  "x-forwarded-for", // de-facto standard (Railway, Fly, Render, nginx)
  "x-envoy-external-address", // Envoy-based edges
  "x-real-ip", // nginx
  "cf-connecting-ip", // Cloudflare
  "true-client-ip", // Akamai / Cloudflare Enterprise
  "fastly-client-ip",
  "x-client-ip",
] as const;

export function clientKey(req: Request): string {
  for (const header of CLIENT_IP_HEADERS) {
    const value = req.headers.get(header);
    // XFF is a comma-separated chain; the original client is first
    const first = value?.split(",")[0]?.trim();
    if (first) return first;
  }

  // RFC 7239: Forwarded: for=192.0.2.60;proto=http;by=203.0.113.43
  const forwarded = req.headers.get("forwarded");
  const match = forwarded?.match(/for=("?\[?)([^;,"\]]+)/i);
  if (match?.[2]) return match[2];

  return "unknown";
}

/** Standard headers so clients can back off politely. */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.retryAfter),
    ...(result.ok ? {} : { "Retry-After": String(result.retryAfter) }),
  };
}

/** Test-only: clear all counters. */
export function resetRateLimits() {
  buckets.clear();
}
