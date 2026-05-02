import 'server-only'

/**
 * Centralised rate-limit policy. Keep all per-route limits here so we
 * have a single place to tighten or relax them, and so audits can read
 * the policy at a glance.
 *
 * windowMs: window length, limit: requests per window.
 *
 * Naming convention for keys passed to rateLimit():
 *   <namespace>:<scope>:<id>
 * e.g. `folders:user:${userId}`, `login:ip:${ip}`.
 */
export const RATE_LIMITS = {
  // ── Auth (already enforced in app/actions/auth.ts) ────────────────
  authLogin:           { limit: 10, windowMs: 15 * 60_000 },   // 10/IP/15min
  authSignup:          { limit:  5, windowMs: 60 * 60_000 },   // 5/IP/hr
  authForgotPassword:  { limit:  5, windowMs: 15 * 60_000 },   // 5/IP/15min — NEW

  // ── Generation (heavy, third-party-cost) ───────────────────────────
  generate:            { limit: 10, windowMs: 60_000 },        // 10/user/min
  userModelGenerate:   { limit:  5, windowMs: 60_000 },        // 5/user/min
  videoExport:         { limit:  6, windowMs: 60_000 },        // 6/user/min

  // ── Studio mutations (cheap, but abusable) ────────────────────────
  upload:              { limit: 20, windowMs: 60_000 },
  preferences:         { limit: 30, windowMs: 60_000 },
  foldersWrite:        { limit: 30, windowMs: 60_000 },
  projectsWrite:       { limit: 30, windowMs: 60_000 },
  projectsDuplicate:   { limit: 10, windowMs: 60_000 },
  projectsRegenerate:  { limit: 10, windowMs: 60_000 },
  userModelsWrite:     { limit: 20, windowMs: 60_000 },

  // ── Billing ───────────────────────────────────────────────────────
  billingCheckout:     { limit: 10, windowMs: 60_000 },
  billingSubscribe:    { limit:  5, windowMs: 60_000 },
  billingCancel:       { limit:  5, windowMs: 60_000 },
  billingPortal:       { limit: 10, windowMs: 60_000 },

  // ── TikTok (third-party publish) ──────────────────────────────────
  tiktokShare:         { limit:  5, windowMs: 60_000 },
  tiktokAccount:       { limit: 30, windowMs: 60_000 },

  // ── Support ───────────────────────────────────────────────────────
  supportTicketCreate: { limit:  5, windowMs: 60 * 60_000 },   // 5/user/hr
  supportTicketRead:   { limit: 30, windowMs: 60_000 },
  supportReply:        { limit: 20, windowMs: 60 * 60_000 },   // 20 replies/hr

  // ── Admin (defence-in-depth even though auth-gated) ───────────────
  adminMutate:         { limit: 30, windowMs: 60_000 },
} as const

export type RateLimitName = keyof typeof RATE_LIMITS
