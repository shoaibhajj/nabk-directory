// Lightweight in-memory rate limiter. Swap for Upstash Redis when
// UPSTASH_REDIS_REST_URL is configured.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export async function withRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
