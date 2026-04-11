/**
 * In-memory sliding-window rate limiter.
 *
 * WARNING: NOT suitable for serverless deployments (Vercel, AWS Lambda, etc.).
 * On serverless platforms the in-memory store is reset on every cold start, providing
 * zero protection against burst attacks. Use lib/db-rate-limit.ts instead, which
 * is backed by Postgres advisory locks and works correctly across serverless invocations.
 *
 * This module is retained only for local/single-instance development use.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now >= existing.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.limit - 1, resetAt: now + options.windowMs }
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: options.limit - existing.count, resetAt: existing.resetAt }
}

// Periodically purge expired entries to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, window] of store) {
      if (now >= window.resetAt) store.delete(key)
    }
  }, 60_000)
}
