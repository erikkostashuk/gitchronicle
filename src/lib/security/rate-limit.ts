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
 * Best-effort client identity. Behind Railway/Fly/Render the socket address is
 * the proxy, so prefer the forwarded chain's first entry.
 *
 * This is spoofable by design — it is an abuse speed bump, not authentication.
 * Never use it for an authorization decision.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
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
