# Security & SEO Audit — 2026-05-02

## Methodology

Reviewed against OWASP Top 10 + the `ecc:security-review` skill checklist:
secrets, input validation, SQL injection, authn/authz, XSS, CSRF, rate
limiting, sensitive data exposure, dependencies. Mapped every API route
under `app/api/` and every public page under `app/`.

## Strong baseline (no action needed)

| Area | Evidence |
|---|---|
| Secrets | All credentials in env; `instrumentation.ts` validates at boot. PayMongo confirmed `sk_test_` (sandbox). |
| CSRF | Most mutation routes call `verifySameOrigin(req)`. PayMongo webhook authenticated by HMAC-SHA256 instead. |
| Authn | Every protected route reads session via `createClient().auth.getUser()`; admin routes additionally call `requireAdminUser()`. |
| RLS | `analytics_events` and `token_reservations` enable RLS; service_role bypasses. |
| SSRF | `isSafeHttpUrl()` rejects loopback, private IPv4/IPv6, link-local (incl. AWS/GCP/Alibaba IMDS at 169.254.169.254 / 100.100.100.200), `*.local`, IPv6 ULA/link-local. Used in TikTok share + template-media fetch. |
| File upload | MIME + size validated (`assertAllowedMimeType`, ≤10 MB, ≤5 product files). Storage paths scoped to `${user.id}/`. |
| Email enumeration | login/signup/forgotPassword all return generic messages; signup uses Supabase "prevent email enumeration". |
| Headers | `next.config.ts` ships HSTS preload, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP with locked `connect-src`. |
| Rate limiting (auth) | login 10/IP/15min, signup 5/IP/hr, forgot-password not rate-limited (gap below). |
| Rate limiting (gen) | `/api/generate` 10/user/min, `/api/user-models/generate` rate-limited, support tickets 5/user/hr. |
| Logging | Structured `lib/logger.ts` strips PII; analytics adapter has built-in `stripPii()`. |

## Gaps fixed in this batch

| # | Severity | Where | Fix |
|---|---|---|---|
| 1 | High | `app/api/billing/portal/route.ts` POST | Added `verifySameOrigin` + rate limit |
| 2 | High | `app/api/upload/route.ts` POST | Added rate limit (10/user/min) |
| 3 | High | `app/api/tiktok/share/route.ts` POST | Added rate limit (5/user/min — TikTok publishes are expensive) |
| 4 | Med | `app/api/folders/[id]/route.ts` PUT/DELETE | Added rate limit |
| 5 | Med | `app/api/folders/route.ts` POST | Added rate limit |
| 6 | Med | `app/api/preferences/route.ts` POST | Added rate limit |
| 7 | Med | `app/api/projects/[id]/duplicate/route.ts` POST | Added rate limit |
| 8 | Med | `app/api/projects/[id]/regenerate/route.ts` POST | Added rate limit |
| 9 | Med | `app/api/projects/[id]/route.ts` PUT/DELETE | Added rate limit |
| 10 | Med | `app/api/billing/cancel/route.ts` POST | Added rate limit |
| 11 | Med | `app/api/billing/subscribe/route.ts` POST | Added rate limit |
| 12 | Med | `app/api/support/tickets/[id]/route.ts` POST | Added rate limit on replies |
| 13 | Med | `app/api/user-models/route.ts` DELETE | Added rate limit |
| 14 | Med | `app/api/admin/tickets/[id]/route.ts` PATCH | Added rate limit (admin-only but still protects against credential compromise) |
| 15 | Med | `app/actions/auth.ts` `forgotPassword` | Added rate limit (5/IP/15min) |
| 16 | Low | `next.config.ts` | Added `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`. |
| 17 | Low | All public pages | Added per-page canonical tags via Next metadata. |
| 18 | Low | `app/sitemap.ts` | Adjusted priorities + added explicit `lastModified` per route. |
| 19 | Low | `app/robots.ts` | Tightened with explicit `googlebot` rule and clarified disallow patterns. |
| 20 | Low | Landing images | Audited / added alt text where missing. |

## Deferred (for follow-up)

| Severity | Item | Reason |
|---|---|---|
| Med | CSP: drop `'unsafe-eval'` and `'unsafe-inline'` in production | Next.js currently needs these. Requires nonce-based script-src; bigger change. |
| Med | `@axe-core/playwright` automated a11y scan | Task X.1 — needs Playwright + axe wiring. |
| Low | DOMPurify on any user-provided HTML | None rendered as HTML right now (all `<p>{text}</p>` patterns). Add when rich text is introduced. |
| Low | Honeypot field on signup form | Bot-mitigation; only useful once we see actual bot signups. |
| Low | Subresource Integrity on third-party CDN scripts | None used. |
| Low | Dependabot / npm audit automation | Needs CI workflow. |

## What was NOT changed

- No production code path was altered to *change behavior*. All changes
  are additive (rate limits in front of existing logic; metadata
  exports; SEO assets). Existing tests stay green; new tests cover
  every new helper.
- PayMongo, Supabase, Gemini, Replicate, TikTok, Resend integration
  contracts unchanged.
- Admin authorization rules unchanged.
