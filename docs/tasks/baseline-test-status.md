# Baseline Test Status — 2026-05-02

Snapshot taken before executing the product-analysis task list.
Used to ensure new work does not regress further; pre-existing failures are out of scope for this batch.

## Pre-existing failing tests (NOT introduced by this batch)

| File | Test | Failure |
|---|---|---|
| `app/api/billing/webhook/route.test.ts` | handles payment.paid and finalizes credits | `supabaseUrl is required.` (env wiring in test) |
| `app/api/billing/webhook/route.test.ts` | handles payment.failed and marks failed status | `supabaseUrl is required.` (env wiring in test) |
| `app/api/user-models/generate/route.test.ts` | returns 402 for low token balance | mock missing `syncSubscriptionTokenAccrual` export |

## Sandbox confirmation

- `PAYMONGO_SECRET_KEY` prefix: `sk_test_...` — sandbox confirmed safe for billing-touching tests.

## Scope of this batch

Safe quick wins from `docs/tasks/product-analysis-tasks.md`:
- 2.4 AbortController + timeout on `/api/generate`
- 4.1 sitemap.ts + robots.ts
- 6.1 token-equivalents helper (helper + unit tests; UI wiring deferred — vitest is node-env only)
- 9.1 dead nav redirects (verified already removed; doc-only update)
- 9.2 single anchor badge in pricing
- 3.1 reserve/commit token model — **migration + lib only** (manual apply)
- 8.1 analytics adapter scaffold — DB-native, no-op until migration applied
- X.2 bundle-size CI gate — **warn-only first run**

Deferred (need design/UX decisions or jsdom test config):
- 1.1 Simple studio mode, 1.2 Quickstart, 1.3 pre-confirm gen
- 2.1 StudioCanvas decompose, 2.2 stream signed URLs, 2.3 RSC landing
- 3.2 inline credit-pack modal, 3.3 model env
- 4.2 JSON-LD, 4.3 metadata rewrite
- 5.x accessibility (axe + jsdom)
- 6.2 watermark, 6.3 upgrade nudge
- 7.x notifications
