import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export interface DbRateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<DbRateLimitResult> {
  const admin = createAdminClient()
  const now = Date.now()

  const { data, error } = await admin.rpc('claim_rate_limit', {
    p_key: key,
    p_limit: options.limit,
    p_window_ms: options.windowMs,
    p_now: new Date(now).toISOString(),
  })

  if (error || !Array.isArray(data) || data.length === 0) {
    throw new Error(error?.message ?? 'Failed to claim rate limit')
  }

  const row = data[0] as {
    allowed: boolean
    remaining: number
    reset_at: string
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at).getTime(),
  }
}
