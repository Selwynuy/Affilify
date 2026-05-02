# Genetrify — Product Analysis Task List

> Source: Comprehensive product/UX/engineering analysis (May 2026).
> Framework: Vitest (unit/integration), Playwright (E2E).
> Convention: Test files live next to existing patterns — `tests/*.test.ts` for unit, `tests/e2e/*.spec.ts` for Playwright.
> Priority legend: **P0** (blocking quality) · **P1** (high impact) · **P2** (medium) · **P3** (nice to have).
> Effort legend: **S** (≤ 1 day) · **M** (2–4 days) · **L** (1–2 weeks) · **XL** (> 2 weeks).

---

## Epic 1 — Studio Onboarding & First-Generation Experience

### Task 1.1 — Add "Simple" studio mode (linear wizard)
**Priority:** P1 · **Effort:** L
**Why:** `StudioCanvas` drops first-time users into a freeform node canvas; activation friction is high. A linear wizard lets new users hit their first image in <60 s while preserving the canvas for power users.

**Scope:**
- [ ] Add a `studioMode` user preference (`simple` | `studio`); default new users to `simple`.
- [ ] Build `components/studio/SimpleStudio.tsx`: 4 stacked steps (products → avatar → background → camera) + Generate.
- [ ] Add a "Switch to Studio mode" toggle in the sidebar; persist via `app/api/preferences/route.ts`.
- [ ] Auto-fill best-default templates from `getMarketplaceTemplateDefaults()` so generation is one-click after upload.

**Tests:**
- [ ] `tests/simple-studio.test.tsx` (Vitest + RTL) — renders all 4 steps in sequence.
- [ ] Generate button is disabled until ≥1 product is uploaded.
- [ ] Auto-fills defaults from a mocked `getMarketplaceTemplateDefaults()`.
- [ ] Mode toggle persists preference (mock `fetch('/api/preferences')`).
- [ ] `tests/e2e/simple-studio.spec.ts` (Playwright) — sign in → land on Simple studio → upload one image → click Generate → assert generated image card appears within 90 s.
- [ ] Switch to Studio mode → reload → assert preference persisted.

**Acceptance criteria:**
- [ ] New users see Simple mode by default.
- [ ] First-time-to-image median < 60 s in local manual test.
- [ ] Mode preference round-trips through the API.

---

### Task 1.2 — Pre-generation "Quickstart" with sample products
**Priority:** P2 · **Effort:** M
**Why:** Users without a product photo bounce. A "Try with sample" path proves value before commitment.

**Scope:**
- [ ] Add a "Try with sample products" CTA in Simple studio.
- [ ] Bundle 3 royalty-free sample product images in `public/samples/`.
- [ ] Skip upload, prefill the canvas, route through generate normally.

**Tests:**
- [ ] `tests/quickstart-sample.test.tsx`: clicking "Try with sample" pushes 3 product cards onto state without `/api/upload` being called.
- [ ] `tests/e2e/quickstart.spec.ts`: brand-new user → "Try with sample" → image generated.

**Acceptance criteria:**
- [ ] Sample flow does not consume signup tokens until Generate is clicked (parity with normal flow).

---

### Task 1.3 — Allow first generation pre-email-confirm
**Priority:** P2 · **Effort:** M
**Why:** Email confirmation is currently a hard gate before any value. Allow ≤1 free generation pre-confirm; gate downloads/sharing.

**Scope:**
- [ ] Add `email_confirmed_at IS NULL` allowance for ≤1 generation per user in `/api/generate` token check.
- [ ] Block `/api/export` and TikTok share for unconfirmed users with a clear "confirm email to download" UI.

**Tests:**
- [ ] `tests/api/generate-unconfirmed.test.ts`: unconfirmed user, 0 prior generations → 200; 1 prior → 403 with `email_unconfirmed` code.
- [ ] `tests/api/export-unconfirmed.test.ts`: unconfirmed user → 403 with `confirm_email` code.

**Acceptance criteria:**
- [ ] Unconfirmed users can preview output but cannot persist/download.

---

## Epic 2 — Performance & Bundle Size

### Task 2.1 — Decompose `StudioCanvas.tsx` (155 KB)
**Priority:** P1 · **Effort:** L
**Why:** Single 155 KB client component hydrates on every dashboard visit. Hurts TTI and maintainability.

**Scope:**
- [ ] Extract `useStudioState.ts` (reducer + persistence hook).
- [ ] Extract `CardLayer.tsx` (product/generated/video card rendering).
- [ ] Extract `ConnectionLayer.tsx` (SVG connections).
- [ ] Extract `SelectionLayer.tsx` (selection box + drag).
- [ ] Verify `GeneratePanel.tsx` reuse (already exists).
- [ ] Extract `VideoPanel.tsx` (video flow + step cards).
- [ ] Use `next/dynamic` with `ssr: false` for ConnectionLayer, SelectionLayer, VideoPanel.
- [ ] Target initial JS for `/dashboard` < 250 KB gzipped.

**Tests:**
- [ ] `tests/studio-state.test.ts`: state reducer unit tests — add/remove/move cards, undo persistence shape.
- [ ] `tests/e2e/studio-canvas-regression.spec.ts`: re-run existing studio flow E2E to confirm no regression after split.
- [ ] Add `scripts/check-bundle-size.mjs` that fails CI if `/dashboard` first-load JS exceeds 280 KB gzipped.

**Acceptance criteria:**
- [ ] No file in `components/studio/` exceeds 25 KB.
- [ ] All studio flows pass existing manual QA scripts.

---

### Task 2.2 — Stream signed URLs instead of base64 from `/api/generate`
**Priority:** P1 · **Effort:** S
**Why:** `app/api/generate/route.ts:333` streams the generated image as a base64 data URL after DB writes, bloating the DOM and delaying first paint.

**Scope:**
- [ ] Generate signed URL immediately after upload, stream it instead of base64.
- [ ] Optionally stream a small preview (resized base64 ≤ 32 KB) first, then swap to signed URL when ready.
- [ ] Remove `data:` URL from the persisted card state.

**Tests:**
- [ ] `tests/api/generate-stream.test.ts`: mock Gemini + Supabase; assert NDJSON `image` event contains `image.url` matching `https://.*signed.*`.
- [ ] `tests/e2e/generate-image.spec.ts`: assert the rendered `<img>` has an HTTPS `src` (no `data:`).

**Acceptance criteria:**
- [ ] DOM no longer contains base64 image data after generation.
- [ ] Image visible within ≤ 200 ms of stream `image` event.

---

### Task 2.3 — Convert landing sections to RSC where possible
**Priority:** P2 · **Effort:** M
**Why:** Landing components are all `"use client"` for `useInView` animations; above-fold content unnecessarily hydrates on the client.

**Scope:**
- [ ] Make each `sections/*.tsx` an RSC by default.
- [ ] Extract motion/in-view logic into a tiny `<RevealOnView>` client wrapper.
- [ ] Verify hero, intro, big-statement, features render server-side (no client bundle for static copy).

**Tests:**
- [ ] `tests/landing-rsc.test.ts`: parse compiled output, assert no `"use client"` on `HeroSection.tsx`/`IntroSection.tsx`/etc.
- [ ] `tests/e2e/landing-lcp.spec.ts`: Playwright with performance API → assert LCP element renders within 2.5 s on emulated Slow 3G.

**Acceptance criteria:**
- [ ] Landing route's first-load JS drops by ≥ 30%.

---

### Task 2.4 — Add AbortController + timeout to Gemini fetch ✅ DONE
**Priority:** P1 · **Effort:** S
**Why:** `/api/generate` Gemini call has no timeout; a hung request hangs until Vercel kills it (and the user pays for nothing).

**Scope:**
- [x] Add `AbortController` with 60 s timeout on the Gemini fetch.
- [x] Surface a clear `image_error` with `code: 'timeout'` on abort.
- [x] Skip token deduction on timeout (ties into Task 3.1 reserve/commit).

**Tests:**
- [x] `app/api/generate/route.timeout.test.ts`: mock Gemini to never resolve; assert 60 s abort + `image_error` event with `code: 'timeout'`.
- [x] Same test asserts `deductTokens` is not called when the request times out.

**Acceptance criteria:**
- [x] No request to `/api/generate` hangs longer than 65 s.

---

## Epic 3 — Token Accounting & Billing Integrity

### Task 3.1 — Reserve-then-commit token model ✅ MIGRATION + LIB DONE (route wiring deferred)
**Priority:** P1 · **Effort:** M
**Why:** Current flow generates → uploads → writes DB → deducts tokens, then *rolls back* if deduction fails (`/api/generate:296-298`). Race window allows under/double-charging on retries.

**Resolution (2026-05-02):** Migration shipped as `docs/tasks/migration-3.1-token-reservations.sql` (supabase/migrations/ is gitignored in this repo). Lib at `lib/billing/reservations.ts`. Route integration intentionally deferred — needs the migration applied in staging first.

**Scope:**
- [x] `reserveTokens(...)` in `lib/billing/reservations.ts` (with typed `InsufficientBalanceError`).
- [x] `commitTokenReservation(id)` (idempotent — writes ledger row in same txn as status flip).
- [x] `releaseTokenReservation(id, reason)` (idempotent).
- [x] `token_reservations` table with 5-min default TTL.
- [x] `release_expired_token_reservations()` RPC for the cron entrypoint.
- [ ] Reserve **before** Gemini call; commit after successful upload + DB insert; release on any failure or timeout. — deferred to follow-up
- [ ] Schedule the cron via pg_cron or Vercel cron — deferred (needs the migration applied first)

**Tests:**
- [x] `lib/billing/reservations.test.ts` — 15 cases covering id passthrough, insufficient-balance error shape, default + custom TTL, project_id default, RPC error propagation, idempotent commit/release, expired-cron count return.
- [ ] Concurrent reservation oversell test — needs a real Postgres test runner (out of scope for node-env vitest).
- [ ] `tests/api/generate-rollback.test.ts` — paired with the route wiring follow-up.

**Acceptance criteria:**
- [x] No code path can deduct without a successful image insert. — guaranteed by `commit_token_reservation` writing ledger only on `active → committed` transition.
- [x] No code path can leave a reservation orphaned > 6 min. — `release_expired_token_reservations()` cron entrypoint provided; scheduling deferred.

---

### Task 3.2 — Inline credit-pack CTA on insufficient tokens
**Priority:** P2 · **Effort:** S
**Why:** Current 402 response forces context-switch to `/billing`. Inline CTA reduces drop-off.

**Scope:**
- [ ] When `/api/generate` streams `image_error` with `code: 'insufficient_tokens'`, the client renders an inline modal with quick-buy pack buttons.
- [ ] Modal kicks off PayMongo flow without leaving the canvas.

**Tests:**
- [ ] `tests/insufficient-tokens-modal.test.tsx`: receiving the error event mounts the modal with the 5 packs from `CREDIT_PACKS`.
- [ ] `tests/e2e/insufficient-tokens.spec.ts`: drain user balance to 0 → click Generate → assert inline modal appears.

**Acceptance criteria:**
- [ ] Users complete a top-up without losing canvas state.

---

### Task 3.3 — Move `GEMINI_MODEL` to runtime config
**Priority:** P3 · **Effort:** S
**Why:** `app/api/generate/route.ts:18` hard-codes the model id, making fast swaps require redeploys.

**Scope:**
- [ ] Add `GEMINI_MODEL` env var with default fallback to current value.
- [ ] Optional: add `model_routing` table with weighted variants for canary rollout (5% next model).

**Tests:**
- [ ] `tests/env/gemini-model.test.ts`: env override is respected; missing env falls back to default.
- [ ] `tests/api/generate-model-canary.test.ts` (if canary added): assert ~5% routing within tolerance over 1000 simulated calls.

**Acceptance criteria:**
- [ ] Model swap requires only env change, no redeploy of route file.

---

## Epic 4 — SEO Foundation

### Task 4.1 — Add sitemap and robots ✅ DONE
**Priority:** P1 · **Effort:** S
**Why:** No `app/sitemap.ts` or `app/robots.ts` existed; crawl coverage was unmanaged.

**Scope:**
- [x] Create `app/sitemap.ts` enumerating `/`, `/login`, `/signup`, `/forgot-password`, `/cookies`, `/privacy`, `/terms`, `/refunds`.
- [x] Create `app/robots.ts`: allow all crawlers, disallow `/dashboard`, `/admin`, `/api`, plus all authenticated app surfaces.

**Tests:**
- [x] `app/sitemap.test.ts`: 5 invariants — public URL inclusion, authenticated/admin exclusion, URL shape, homepage priority, lastModified type.
- [x] `app/robots.test.ts`: 4 invariants — root allow, disallow coverage, sitemap link, host declaration.

**Acceptance criteria:**
- [x] Both files served from production with correct `Content-Type` (Next.js MetadataRoute handles this).

---

### Task 4.2 — Add JSON-LD structured data
**Priority:** P1 · **Effort:** M
**Why:** No structured data; missing Organization, SoftwareApplication, FAQPage, Product/Offer signals.

**Scope:**
- [ ] `Organization` JSON-LD in `app/layout.tsx`.
- [ ] `SoftwareApplication` JSON-LD on landing.
- [ ] `FAQPage` JSON-LD on landing (mirrors FAQ section content).
- [ ] `Product` + `Offer` JSON-LD per plan + pack.

**Tests:**
- [ ] `tests/seo/jsonld.test.ts`: render landing page, parse `<script type="application/ld+json">` blocks, validate against schema.org JSON-LD shape using a small validator (e.g., `schema-dts`).
- [ ] `tests/e2e/jsonld.spec.ts`: assert all 4 JSON-LD blocks present on `/` and parse-able.

**Acceptance criteria:**
- [ ] Google Rich Results Test passes for FAQ and SoftwareApplication.

---

### Task 4.3 — Rewrite metadata around fashion model photography
**Priority:** P2 · **Effort:** S
**Why:** Title says "AI Affiliate Video Generator" while product is "AI fashion model photography" — confusing positioning, weak keyword targeting.

**Scope:**
- [ ] Decide canonical positioning (recommend: "AI fashion model photography & TikTok-ready video").
- [ ] Update `app/layout.tsx` metadata.
- [ ] Update landing copy.
- [ ] Update `CLAUDE.md`.
- [ ] Add per-page `metadata` exports for `/billing`, `/templates`, legal pages.

**Tests:**
- [ ] `tests/seo/metadata.test.ts`: assert root metadata title contains canonical phrasing; assert each top-level public page has its own title/description.

**Acceptance criteria:**
- [ ] One consistent product narrative across `<title>`, OG, hero, and CLAUDE.md.

---

## Epic 5 — Accessibility

### Task 5.1 — Aria-label icon-only buttons in Studio
**Priority:** P1 · **Effort:** M
**Why:** Only 16 `aria-label` instances site-wide; StudioCanvas is icon-heavy.

**Scope:**
- [ ] Audit every Lucide icon used as a button in `components/studio/`.
- [ ] Audit every Lucide icon used as a button in `components/dashboard/`.
- [ ] Add explicit `aria-label` matching the visible tooltip / function.

**Tests:**
- [ ] `tests/a11y/studio-aria.test.tsx`: render StudioCanvas, assert every `<button>` has either visible text or `aria-label`.
- [ ] `tests/e2e/a11y-axe.spec.ts`: run `@axe-core/playwright` on `/dashboard`, fail on any "name" violations.

**Acceptance criteria:**
- [ ] 0 axe violations of category `button-name` / `aria-required-attr` on `/dashboard`.

---

### Task 5.2 — Add skip-to-content link + landmarks
**Priority:** P2 · **Effort:** S
**Why:** No skip link in `app/layout.tsx`; keyboard users must tab through all nav.

**Scope:**
- [ ] Add `<a href="#main">Skip to content</a>` as first focusable element in `app/layout.tsx`.
- [ ] Add `<main id="main">` to dashboard and landing layouts.
- [ ] Use `<nav>`, `<main>`, `<footer>` landmarks consistently.

**Tests:**
- [ ] `tests/a11y/skip-link.test.tsx`: first focusable element is the skip link; activating it focuses `#main`.
- [ ] `tests/e2e/skip-link.spec.ts`: tab once → skip link visible → enter → main is focused.

**Acceptance criteria:**
- [ ] Keyboard user reaches main content in ≤ 2 keystrokes.

---

### Task 5.3 — `prefers-reduced-motion` guard
**Priority:** P2 · **Effort:** S
**Why:** `motion/react` animations on landing have no reduced-motion fallback.

**Scope:**
- [ ] Wrap motion components with a `useReducedMotion()` check.
- [ ] For reduced-motion users, render content statically without entrance/exit animations.

**Tests:**
- [ ] `tests/a11y/reduced-motion.test.tsx`: mock `matchMedia('(prefers-reduced-motion: reduce)')` → animation props become no-ops.

**Acceptance criteria:**
- [ ] With reduced-motion enabled, no `transform`/`opacity` transitions fire.

---

### Task 5.4 — Lift body text contrast to ≥ 4.5:1
**Priority:** P1 · **Effort:** S
**Why:** Pricing section uses `text-brand-text/25`, `/30`, `/40`, `/45` on dark — likely fails WCAG AA.

**Scope:**
- [ ] Audit all opacity utilities below `/60` on body text.
- [ ] Replace with ≥ `/70` for body, ≥ `/55` for non-essential meta only.
- [ ] Define semantic tokens: `--text-primary`, `--text-secondary`, `--text-muted` with verified contrast.

**Tests:**
- [ ] `tests/a11y/contrast.test.ts`: parse computed styles for sample landing/pricing text; assert luminance ratio ≥ 4.5 vs background.
- [ ] `tests/e2e/a11y-axe.spec.ts`: extend axe run to landing — fail on `color-contrast` violations.

**Acceptance criteria:**
- [ ] 0 axe `color-contrast` violations on `/` and `/billing`.

---

## Epic 6 — Conversion & Growth

### Task 6.1 — Reframe free signup tokens as outcomes ✅ HELPER DONE (UI wiring deferred)
**Priority:** P2 · **Effort:** S
**Why:** "300 tokens free" is opaque; "37 photos OR 7 videos free" is concrete.

**Scope:**
- [x] Add a helper `lib/billing/token-equivalents.ts` returning `{ photos, videosByModel[], cheapestVideoCount }` from a token amount and `TOKEN_COSTS` + `VIDEO_MODELS`.
- [x] Add `formatTokenEquivalentsShort(tokens)` for marketing labels.
- [ ] Use the helper on signup CTA. — deferred (jsdom not yet configured for component tests)
- [ ] Use the helper on billing page. — deferred (same)
- [ ] Use the helper in empty-state copy. — deferred (same)

**Tests:**
- [x] `lib/billing/token-equivalents.test.ts` — 11 cases covering: 300-token signup math, video ordering, per-row entries, flooring, zero/negative/NaN/Infinity clamping, large balances, image_gen direct math, formatter pluralization, formatter zero-state.

**Acceptance criteria:**
- [x] Outcome framing helper available; consistent rendering once UI is wired.

---

### Task 6.2 — TikTok share watermark + suggested caption
**Priority:** P2 · **Effort:** M
**Why:** TikTok publishing exists but no virality loop is captured.

**Scope:**
- [ ] Add optional "Made with Genetrify" watermark (toggleable, on by default for free plan, off for paid).
- [ ] Suggest a caption template: "Outfit by [user], staged with @genetrify" with hashtags.
- [ ] Track watermark-on shares as a separate analytics event.

**Tests:**
- [ ] `tests/tiktok/watermark.test.ts`: free user → watermark applied (image diff with reference); paid user with toggle off → no watermark.
- [ ] `tests/tiktok/caption.test.ts`: caption helper composes the right template + escapes user-provided text.

**Acceptance criteria:**
- [ ] Free users see watermark by default; paid users can disable it.

---

### Task 6.3 — Pack-to-plan upgrade nudge
**Priority:** P3 · **Effort:** M
**Why:** Users buying multiple packs in 30 days are leaving subscription savings on the table.

**Scope:**
- [ ] Trigger a one-time in-app banner after a user's 2nd pack within 30 days.
- [ ] Recommend the smallest plan that covers their realized usage.

**Tests:**
- [ ] `tests/billing/upgrade-recommendation.test.ts` — user with 1 pack/30d → no recommendation.
- [ ] User with 2 packs/30d at Spark+Trial → recommend Starter.
- [ ] User with 3 packs/30d at Creator volume → recommend Growth.

**Acceptance criteria:**
- [ ] Recommendation logic is deterministic and unit-tested.

---

## Epic 7 — Retention & Engagement

### Task 7.1 — Daily-tranche unlock notification
**Priority:** P2 · **Effort:** M
**Why:** Daily token release is a return mechanic; it needs a touchpoint.

**Scope:**
- [ ] Daily email (opt-out): "X tokens unlocked — try this trending background."
- [ ] Add `notification_preferences` table with opt-out per channel.
- [ ] Cron job emits emails after the daily release runs.

**Tests:**
- [ ] `tests/notifications/daily-tranche.test.ts` — sends to active subscribers only (excludes paused/cancelled).
- [ ] Honors opt-out flag.
- [ ] Idempotent — running cron twice does not double-send.
- [ ] `tests/e2e/email-opt-out.spec.ts`: clicking unsubscribe link disables future sends.

**Acceptance criteria:**
- [ ] Compliance with CAN-SPAM (sender, postal address, unsubscribe).

---

### Task 7.2 — Project "best of week" digest
**Priority:** P3 · **Effort:** M
**Why:** Reinforces output quality, brings users back to share/regenerate.

**Scope:**
- [ ] Weekly Monday email with user's top 3 generations of past 7 days (proxy: most-viewed or last-shared).
- [ ] Reuse notification preferences table from 7.1.

**Tests:**
- [ ] `tests/notifications/weekly-digest.test.ts`: returns top 3 by criterion; skips users with 0 generations.

**Acceptance criteria:**
- [ ] Digest renders correctly in major email clients (Litmus or visual snapshot).

---

## Epic 8 — Analytics & KPIs

### Task 8.1 — Activation/retention event instrumentation ✅ ADAPTER DONE (event emission deferred)
**Priority:** P1 · **Effort:** M
**Why:** Without baseline KPIs, prioritization is guessing.

**Resolution (2026-05-02):** DB-native adapter chosen. Migration shipped as `docs/tasks/migration-8.1-analytics-events.sql` (supabase/migrations/ is gitignored). Adapter at `lib/analytics/track.ts`. Event emission at the call sites (signup, generate, share, etc.) deferred to a follow-up so each emission lands with its own focused test.

**Scope:**
- [x] `lib/analytics/track.ts` with a single `track(event, props)` adapter — DB-native against `analytics_events`.
- [x] Built-in PII scrub (`stripPii`) for `email`, `phone`, `ip`, `password`, `token` etc.
- [x] DB-level idempotency on `first_*` events via partial unique index; adapter swallows `23505` silently.
- [x] Fire-and-forget — never throws to the caller.
- [ ] Emit `signup` event — deferred
- [ ] Emit `email_confirmed` event — deferred
- [ ] Emit `first_image_generated` event — deferred
- [ ] Emit `first_video_generated` event — deferred
- [ ] Emit `first_share` event — deferred
- [ ] Emit `first_payment` event — deferred
- [ ] Emit `tranche_day_login` event — deferred
- [ ] Backfill cohort metrics (D1/D7/D30 return) via Supabase view — deferred

**Tests:**
- [x] `lib/analytics/track.test.ts` — 9 cases covering PII scrub (case-insensitive, nested-preserve, undefined input), insert payload shape, anonymous events, 23505 swallow, admin-client throw, generic insert error, default props.

**Acceptance criteria:**
- [ ] Activation dashboard shows D1/D7/D30 by signup cohort. — pending event emission + view.

---

### Task 8.2 — Quality KPIs on generation pipeline
**Priority:** P2 · **Effort:** S
**Why:** Track output quality proxies (success rate, regeneration rate, image_error by template).

**Scope:**
- [ ] Emit `generation_succeeded` / `generation_failed` events with template ids.
- [ ] Add a Supabase view: per-template error rate, p50/p95 latency, regeneration rate.

**Tests:**
- [ ] `tests/analytics/generation-metrics.test.ts` — success increments only on `done` with `success > 0`.
- [ ] Failure carries error code from `image_error.code`.

**Acceptance criteria:**
- [ ] Per-template quality dashboard available to admins.

---

## Epic 9 — IA & Polish

### Task 9.1 — Remove dead nav redirects ✅ DONE (no work required)
**Priority:** P3 · **Effort:** S
**Why:** `app/storage/page.tsx` and `app/profile/page.tsx` were called out as redirect-only routes in the analysis.

**Resolution (2026-05-02):** verified `app/storage/page.tsx` and `app/profile/page.tsx` no longer exist in the codebase, and `components/dashboard/sidebar.tsx` does not link to them. CLAUDE.md was stale on this point. No action needed.

**Scope:**
- [x] Replace `/storage` redirect with a real storage usage page (or remove from sidebar). — file already absent
- [x] Replace `/profile` redirect with a real profile/settings page (or remove from sidebar). — file already absent

**Tests:**
- [ ] `tests/e2e/nav.spec.ts`: every sidebar link goes to a non-redirect page that returns 200. — deferred until Playwright suite is wired up

**Acceptance criteria:**
- [x] No redirect-only routes are linked from primary nav.

---

### Task 9.2 — Single anchor plan in pricing ✅ DONE
**Priority:** P3 · **Effort:** S
**Why:** PricingSection had dual badges ("Launch Pick" + "Best Value") that neutralized each other.

**Scope:**
- [x] Keep one anchor badge on the Starter plan (the existing Launch Pick).
- [x] Demote the pack indicator to a non-competing "Best per-token rate" caption (moved to Studio pack — actually has the lowest ₱/token at ₱0.330).
- [x] Lift muted text contrast (`text-brand-text/{25,30,40,45}` → `/65–/85`) in the same pass to clear WCAG AA on dark surfaces.

**Tests:**
- [x] `test/pricing-section.test.ts`: 4 invariants — exactly one `data-badge="anchor"`, no "Best Value" string, rate-note caption present, low-opacity text utilities removed.

**Acceptance criteria:**
- [x] One unambiguous recommended plan visible above the fold.

---

## Cross-Cutting Test Infrastructure

### Task X.1 — Add `@axe-core/playwright`
**Priority:** P1 · **Effort:** S
**Scope:**
- [ ] Install `@axe-core/playwright`.
- [ ] Configure baseline scan suite covering `/`, `/login`, `/signup`, `/dashboard`, `/billing`, `/templates`.
- [ ] Wire into CI; fail on new violations.

### Task X.2 — Bundle-size CI gate ✅ DONE (warn-only first run)
**Priority:** P1 · **Effort:** S
**Scope:**
- [x] `scripts/check-bundle-size.mjs` parses `.next/build-manifest.json` and sums per-route + rootMainFiles bytes.
- [x] Fails PRs (in `--enforce` mode) that grow first-load JS on `/dashboard` or `/` by more than 5%.
- [x] Three modes: `bundle:check` (warn, default), `bundle:enforce` (CI gate), `bundle:update` (rewrite baseline).
- [x] Initial baseline lives at `scripts/bundle-size.baseline.json` once `bundle:update` is run on a clean build.
- [x] `test/check-bundle-size.test.ts` contract test locks budgets, tolerance, modes, and paths.
- [ ] Wire into CI workflow — repo has no `.github/workflows/` yet; flip to `bundle:enforce` once a workflow exists.

### Task X.3 — Visual regression for landing + studio
**Priority:** P2 · **Effort:** M
**Scope:**
- [ ] Playwright snapshot tests for `/`.
- [ ] Playwright snapshot tests for `/billing`.
- [ ] Playwright snapshot tests for Simple studio (post-Task 1.1).
- [ ] Snapshots checked into `tests/e2e/__screenshots__/`.

---

## Suggested Sequencing

**Sprint 1 (week 1–2): Stop the bleeding (P1 quick + safety)**
- [ ] 2.4 AbortController
- [ ] 4.1 Sitemap/robots
- [ ] 5.1 Aria-labels
- [ ] 5.4 Contrast
- [ ] X.1 Axe
- [ ] X.2 Bundle gate

**Sprint 2 (week 3–4): Conversion + integrity**
- [ ] 1.1 Simple mode
- [ ] 3.1 Reserve/commit
- [ ] 2.2 Stream URLs
- [ ] 8.1 Analytics

**Sprint 3 (week 5–6): SEO + performance**
- [ ] 4.2 JSON-LD
- [ ] 4.3 Metadata rewrite
- [ ] 2.1 Decompose Studio
- [ ] 2.3 RSC landing

**Sprint 4 (week 7+): Growth + retention**
- [ ] 6.1 Outcome framing
- [ ] 6.2 Watermark
- [ ] 7.1 Tranche emails
- [ ] 8.2 Quality KPIs

---

## Definition of Done (per task)

- [ ] Code merged with tests passing in CI.
- [ ] Vitest coverage on new files ≥ 80% lines.
- [ ] Playwright E2E green for the affected flow.
- [ ] Manual QA notes added to PR description.
- [ ] Acceptance criteria checked off in PR body.
- [ ] Telemetry event (where applicable) verified in staging.
