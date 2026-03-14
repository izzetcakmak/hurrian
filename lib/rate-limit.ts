/**
 * IP-based in-memory rate limiter.
 * Prevents abuse by limiting requests per IP within a time window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateMaps = new Map<string, Map<string, RateLimitEntry>>();

function getMap(namespace: string): Map<string, RateLimitEntry> {
  let map = rateMaps.get(namespace);
  if (!map) {
    map = new Map();
    rateMaps.set(namespace, map);
  }
  return map;
}

/**
 * Check if a request is within rate limits.
 * @param ip - The client IP address
 * @param namespace - Category of rate limit (e.g., 'generate', 'api')
 * @param maxRequests - Max allowed requests in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  ip: string,
  namespace: string = 'default',
  maxRequests: number = 5,
  windowMs: number = 3600000 // 1 hour
): boolean {
  const map = getMap(namespace);
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Get remaining requests for an IP.
 */
export function getRateLimitRemaining(
  ip: string,
  namespace: string = 'default',
  maxRequests: number = 5
): number {
  const map = getMap(namespace);
  const entry = map.get(ip || 'unknown');
  if (!entry || Date.now() > entry.resetAt) return maxRequests;
  return Math.max(0, maxRequests - entry.count);
}

// Cleanup expired entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const CLEANUP_KEY = '__rate_limit_cleanup';
  if (!(globalThis as Record<string, unknown>)[CLEANUP_KEY]) {
    (globalThis as Record<string, unknown>)[CLEANUP_KEY] = true;
    setInterval(() => {
      const now = Date.now();
      Array.from(rateMaps.values()).forEach((map) => {
        Array.from(map.entries()).forEach(([key, entry]) => {
          if (now > entry.resetAt) map.delete(key);
        });
      });
    }, 300000);
  }
}
