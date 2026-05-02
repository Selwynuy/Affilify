import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type AnalyticsEvent =
  | 'signup'
  | 'email_confirmed'
  | 'first_image_generated'
  | 'first_video_generated'
  | 'first_share'
  | 'first_payment'
  | 'tranche_day_login'
  | 'generation_succeeded'
  | 'generation_failed'

export interface TrackOptions {
  userId?: string | null
  props?: Record<string, unknown>
}

/**
 * PII fields that must never reach the analytics_events.props payload.
 * If a caller passes any of these we strip them rather than throwing —
 * silent strip is safer than a runtime exception in a fire-and-forget
 * telemetry path.
 */
const PII_KEYS = new Set([
  'email',
  'phone',
  'phone_number',
  'ip',
  'ip_address',
  'remote_addr',
  'password',
  'token',
  'access_token',
  'refresh_token',
])

export function stripPii(props: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!props) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.has(key.toLowerCase())) continue
    out[key] = value
  }
  return out
}

/**
 * Emit an analytics event. Fire-and-forget — never throws to the caller
 * because telemetry MUST NOT break the calling request.
 *
 * For `first_*` events the table has a partial unique index on
 * (user_id, event) so duplicate inserts return a unique-violation that
 * we swallow. That gives us per-user idempotency without an extra read.
 */
export async function track(event: AnalyticsEvent, options: TrackOptions = {}): Promise<void> {
  try {
    const admin = createAdminClient()
    const props = stripPii(options.props)
    const { error } = await admin.from('analytics_events').insert({
      user_id: options.userId ?? null,
      event,
      props,
    })
    if (error) {
      // 23505 = unique_violation, expected for repeat first_* events.
      const isUniqueViolation = (error as { code?: string }).code === '23505'
      if (!isUniqueViolation) {
        logger.warn('Analytics insert failed', { event, error: error.message })
      }
    }
  } catch (err) {
    logger.error('Analytics track threw', { event }, err)
  }
}
