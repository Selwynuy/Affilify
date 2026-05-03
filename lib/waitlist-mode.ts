import 'server-only'

/**
 * When true, public signup is closed — only invited waitlist members can
 * create accounts (via the /invite/[token] flow). Logins for existing users
 * are unaffected.
 *
 * Toggle with WAITLIST_MODE=false in env.local once you're ready to open
 * public signups (e.g. after PayMongo subscriptions are enabled and the
 * billing funnel is fully tested).
 *
 * Default: true (waitlist mode ON) so we don't accidentally open the
 * floodgates if someone forgets to set the env var in production.
 */
export function isWaitlistMode(): boolean {
  const raw = process.env.WAITLIST_MODE?.trim().toLowerCase()
  if (raw == null || raw === '') return true
  return ['1', 'true', 'yes', 'on'].includes(raw)
}
