# Handoff — Seedance migration & pricing rebalance

**Date:** 2026-05-04 (updated late-night session)
**Branch:** main (uncommitted)
**Goal:** Migrate video stack from Hailuo/Wan (Replicate) to Seedance 2.0 (BytePlus direct) for ~30–54% cost savings and significantly better quality. Rebalance token economics for direct-provider margins. Reposition free tier vs paid pack so they don't cannibalize each other.

---

## TL;DR

Three video models live now: **Kling Turbo** (Replicate), **Seedance 2.0 Fast** (BytePlus direct), **Seedance 2.0 Pro** (BytePlus direct). Hailuo Fast / Hailuo / Wan 2.1 are removed. Free signup grants 100 image-only tokens. ₱99 Spark pack stays at 200 tokens, repositioned as "1 video + 10 image drafts."

All 151 unit tests pass. Typecheck is clean. **BytePlus endpoint NOT yet activated** — blocked on a buy/don't-buy decision (see "BytePlus activation status" below).

---

## ⚠️ BytePlus activation status (NEW — late-night discovery)

**Endpoint NOT activated.** BytePlus does not let you enable Seedance 2.0 / Seedance 2.0 fast on pure pay-as-you-go without first buying a prepaid resource pack OR contacting their support to manually whitelist your account.

### Verified pack pricing (from console, 2026-05-04)

| Pack | Seedance 2.0 | Seedance 2.0 fast | $/1K tokens (regular) | $/1K tokens (fast) |
|---|---|---|---|---|
| 1M tokens (×7 minimum) | $30.10 | $23.10 | $0.0043 | $0.0033 |
| 10M tokens | $43.00 | $33.00 | $0.0043 | $0.0033 |
| 100M tokens | $430.00 | $330.00 | $0.0043 | $0.0033 |

**No volume discount across pack sizes** — same $/1K rate at every tier. Packs are pure prepay, 90-day expiry, non-refundable.

### Verified token formula (Segmind + BytePlus docs)
```
tokens_per_video = (height × width × duration_seconds × 24fps) / 1024
```

| Resolution × duration | Tokens | Cost (Seedance fast @ $0.0033/1K) | Cost (Seedance regular @ $0.0043/1K) |
|---|---|---|---|
| 480p × 5s | 48,600 | $0.16 | $0.21 |
| **720p × 6s** (default) | **129,600** | **$0.43** | **$0.56** |
| 720p × 8s | 172,800 | $0.57 | $0.74 |
| 1080p × 5s | 243,000 | $0.80 | $1.05 |

### Unit-economics check vs current pricing

At ₱99 = $1.77 = 200 tokens (1 video + 10 image drafts):
- Seedance fast 720p × 6s: $1.77 − $0.43 vendor − $0.06 (PayMongo) = **$1.28 margin / 72%** ✅
- Seedance regular 720p × 6s: $1.77 − $0.56 vendor − $0.06 = **$1.15 margin / 65%** ✅

At ₱60 = $1.07 = 120 tokens (1 video, post-GCash):
- Seedance fast: $1.07 − $0.43 − $0.04 = **$0.60 margin / 56%** ✅
- Seedance regular: $1.07 − $0.56 − $0.04 = **$0.47 margin / 44%** ⚠️

**The current 120/220 token split is NOT supported by BytePlus pricing structure.** There is one Seedance 2.0 and one Seedance 2.0 fast — they are separate models, not "fast/pro tiers" of the same model. Fast is ~23% cheaper. Both produce comparable quality for product/fashion video.

### The buy/don't-buy decision (deferred)

Recommendation tonight: **DO NOT BUY.** Reasons:
1. Zero validated demand — no paying users yet.
2. Non-refundable + 90-day expiry = irreversible commitment before signal.
3. Quality on fashion-niche content unverified (no test gens yet).
4. Even the cheapest pack ($23.10 for 7M Seedance fast) is real money for the user (student).

### Three paths forward (pick tomorrow)

**Path A — Email BytePlus support (recommended).** Ask them to enable pay-as-you-go without prepay for a small launching account. Many providers waive prepay below a threshold. Worst case: they say no, you fall back to Path B or C.

**Path B — Buy minimum 7M Seedance fast pack ($23.10).** ~54 default 720p×6s videos. Enough for 5–10 beta testers' worth of usage. Margin is healthy (56–72%). Only do this once the integration is debugged on Path C first.

**Path C — Ship without BytePlus video (image-only beta).** Keep Gemini image generation working (already paid via the $300 credit, source unconfirmed — see memory note below). Disable the video step in the studio for now. Charge ₱99 for image packs. Add video as a paid upgrade once revenue covers the BytePlus pack.

### The "$300 credit" question

Memory file `project_free_credits_deadline.md` says $300 credits expire ~2026-05-21, but **does not specify which platform**. Most likely Google Cloud / Gemini ($300 GCP signup standard), NOT BytePlus. Verify tomorrow:
- Google Cloud Console → Billing → Credits
- BytePlus Console → Billing
- Whichever email originally announced the credit

If GCP: image gen is fully covered for beta, video remains the only unfunded line item.
If BytePlus: $300 covers ~70M Seedance fast tokens (~540 default videos). Buying packs becomes much less risky.

---

## What was decided (and why) — original session

### Provider strategy
- **Seedance 2.0 (BytePlus direct)** — top of the Artificial Analysis I2V leaderboard (#1 with audio, #2 without). ~30–54% cheaper direct vs Replicate.
- **Kling Turbo (Replicate)** — kept on Replicate because Kling's direct API uses JWT signing per request (extra plumbing not worth it pre-revenue, and you have ~$10 Replicate credit to burn).
- **Veo, Wan, Hailuo** — dropped. Veo had ~0% Replicate margin. Wan and Hailuo don't crack the leaderboard top 15.

### Pricing math (REVISED late-night with verified BytePlus rates)
- Seedance 2.0 Fast: BytePlus $0.0033/1K × 21,600 tok/s × 6s ≈ **$0.43/video** → **120 tokens** (~56% margin at ₱60, 72% at ₱99)
- Seedance 2.0 Pro: BytePlus $0.0043/1K × 21,600 tok/s × 6s ≈ **$0.56/video** → **220 tokens** (~44% margin at ₱60)
- Kling Turbo: Replicate $0.07/s × 5s = **$0.35/video** → **100 tokens** (~38% margin)

The earlier `$0.074/s` and `$0.14/s` numbers in `lib/video-generation.ts:53-63` were **fictional Replicate-style assumptions**. Real BytePlus pricing is per-1K-tokens, scales with `(width × height × duration × 24) / 1024`. The 220-token "Pro" SKU should be re-examined: BytePlus does not split fast vs pro within one model — they are separate models with separate token packs. There may not be a meaningful "pro upsell" beyond changing model_id at submit time.

### Free tier vs paid pack
- **Free signup**: 100 tokens, image-only (`kind='image_only'` in token_ledger; `getVideoEligibleBalance` enforces). 12 image gens at 8 tokens each.
- **₱99 Spark pack**: 200 tokens. Marketing pitch: "1 AI fashion video + 10 image drafts." Don't pitch as "2 videos" — the math doesn't support it without dropping margin.
- **Conflict resolution**: free = images, paid = videos. No feature overlap in the pitch.

### Why ₱99 stays the floor (not ₱60)
- PayMongo QRPh fee is **2.5% + ₱15 flat**. At ₱60, the flat fee eats 27.5% of revenue.
- GCash on PayMongo dashboard shows **Inactive — Contact Us** (manual approval required). Until GCash activates, you can't escape the QRPh flat fee.
- Action: email `support@paymongo.com` to start GCash approval. Once active, add ₱60/120 pack as a second SKU.

---

## Files changed

| File | Change |
|---|---|
| `lib/video/byteplus.ts` *(new)* | BytePlus ModelArk provider: submitTask, pollTask, SSRF host allowlist. Endpoint and model IDs are env-overridable. |
| `lib/types/billing.ts` | `VideoModel` gets `provider: 'replicate' \| 'byteplus'`, optional `byteplusModelKey`. `replicateSlug`/`replicateVersion` now optional. |
| `lib/data/plans.ts` | Removed Hailuo Fast / Hailuo / Wan. Added Seedance Fast (120 tk, starter), Seedance Pro (220 tk, growth). Kling Turbo demoted to starter at 100 tk. Plan feature copy updated. `SIGNUP_FREE_TOKENS` 300→100. |
| `lib/video-generation.ts` | Replaced hailuo/wan profile cases with seedance fast/pro. ⚠️ Vendor cost assumptions ($0.074/s, $0.14/s) are WRONG — see "Pricing math (REVISED)" above. Refactor to use the token formula `(w × h × dur × 24) / 1024 × $0.0033 or $0.0043 per 1K`. |
| `app/api/export/route.ts` | New `submitGeneration` / `pollGeneration` dispatchers. SSRF allowlist now covers BytePlus hosts. Vendor cost analytics tag with `videoModel.provider`. |
| `lib/analytics/profitability.ts` | `VendorProvider` accepts `'byteplus'`. |
| `lib/env.ts` | `BYTE_PLUS` added to required env vars. |
| `app/actions/auth.ts` | `BETA_STARTER_TOKENS` 250→100, image-only. |
| `components/landing/sections/PricingSection.tsx` | Plan features and Spark hero copy refreshed. |
| `components/landing/sections/FeaturesSection.tsx` | Tier descriptions updated. |
| `components/studio/WorkflowCanvas.tsx` | Default fallback model `seedance-2-fast`. |
| `app/api/export/route.test.ts` | `videoModelId` updated to `seedance-2-fast`. |
| `e2e/video-export.spec.ts`, `e2e/token-billing.spec.ts` | Same. |
| `.env.local` | `BYTE_PLUS=ark-…` already present. Added commented overrides for `BYTEPLUS_BASE_URL` and model IDs. |

---

## ⚠️ Critical action items for tomorrow morning

### 1. Verify which platform issued the $300 credit
Check Google Cloud billing, BytePlus billing, and original credit-grant emails. This determines which line items are funded vs unfunded.

### 2. Email BytePlus support — request pay-as-you-go without prepay
Goal: avoid the $23+ non-refundable upfront commitment. Mention small-account / launching status. Worst case they say no, you fall back to Path B (buy 7M fast pack) or Path C (ship image-only).

### 3. Verify BytePlus model IDs in your ModelArk console (only if proceeding with activation)
The defaults baked into `lib/video/byteplus.ts` are best-guesses from the public docs:
- `BYTEPLUS_SEEDANCE_FAST_MODEL_ID` defaults to `seedance-2-0-fast`
- `BYTEPLUS_SEEDANCE_PRO_MODEL_ID` defaults to `seedance-2-0`

ModelArk sometimes uses raw model names (`seedance-2-0`) and sometimes endpoint IDs you create in the console (`ep-xxxxxxx`). Open `https://console.byteplus.com/ark` → ModelArk → Inference Endpoints → check the actual ID format. If they're endpoint IDs, add to `.env.local`:

```
BYTEPLUS_SEEDANCE_FAST_MODEL_ID=ep-xxxxxxx
BYTEPLUS_SEEDANCE_PRO_MODEL_ID=ep-xxxxxxx
```

### 4. Refactor `lib/video-generation.ts` cost math
Replace the hardcoded `$0.074/s` / `$0.14/s` assumptions with the verified token formula:
```ts
// Seedance fast: $0.0033/1K tokens
// Seedance regular ("pro"): $0.0043/1K tokens
const tokensConsumed = (width * height * duration * 24) / 1024
const vendorCostUsd = (tokensConsumed / 1000) * ratePerKTokens
```
Then re-derive token costs from real vendor cost + markup, not magic numbers.

### 5. Decide if "Seedance Pro" SKU is real
On BytePlus, "Seedance 2.0" and "Seedance 2.0 fast" are separate models with separate prepaid token pools. There is no "pro mode" within one model. Options:
- **Drop the pro tier** — ship one Seedance model in the UI (fast), simpler pricing. Add Seedance regular later as a "premium" SKU once demand justifies a second token pack.
- **Keep both** — buy two separate packs ($23.10 fast + $30.10 regular = $53.20 minimum), maintain the 120/220 token split.

Recommendation: **drop the pro tier for MVP.** One model, one price, one pack to manage.

### 6. Smoke test end-to-end (only after activation)
1. `npm run dev`
2. Sign in (use a test account that already has tokens, or top up)
3. Generate an image → approve → try a Seedance Fast video
4. **First failure is likely a model-ID mismatch.** The BytePlus error message will name the bad ID — paste back and patch.

### 7. Email PayMongo for GCash activation
`support@paymongo.com` — request GCash + Cards activation. Send DTI/SEC docs, bank verification, mention "ready to launch a paid product." Days-to-weeks turnaround. Once active, add ₱60/120 pack.

---

## What was deliberately NOT done

- **Pricing matrix doc** (`docs/pricing-matrix.md`) still references Hailuo and Wan. Update after smoke test confirms BytePlus works.
- **Tester walkthrough** (`docs/TESTER-WALKTHROUGH.md`) — same.
- **Kling official direct API** — deferred. JWT signing plumbing isn't worth it until Replicate spend becomes the bottleneck.
- **₱60 GCash pack** — blocked on PayMongo GCash activation.
- **Migration of existing user video tokens** — none needed.
- **Prompt tuning for Seedance** — Seedance is more literal than Hailuo. Worth A/B testing 5–10 prompts post-smoke-test.
- **BytePlus pack purchase** — deferred pending the $300 credit source verification + support email response.

---

## Verification status

```
TypeScript:  ✅ clean (npx tsc --noEmit)
Vitest:      ✅ 33 files / 151 tests pass
E2E:         ⏸️  not run (require dev server)
Smoke:       ❌ NOT YET — blocked on BytePlus endpoint activation
Endpoint:    ❌ NOT activated (prepay/support gate)
Cost math:   ⚠️  Currently uses fictional $/s rates; refactor before smoke test
```

---

## Context to load tomorrow

```
docs/HANDOFF-2026-05-04-seedance-migration.md   ← this file
lib/video/byteplus.ts                            ← provider module to debug
lib/data/plans.ts                                ← model catalog
lib/video-generation.ts                          ← profile/pricing math (NEEDS REFACTOR)
app/api/export/route.ts                          ← dispatch logic
.env.local                                       ← BYTE_PLUS key + overrides
~/.claude/projects/D--Projects-Genetrify/memory/project_free_credits_deadline.md  ← $300 credit memo
```

---

## Decision log (for future-me)

- **Why drop Veo?** ~0% Replicate margin. Vertex AI direct prices match Replicate's resale.
- **Why drop Wan/Hailuo?** Neither in top 15 of Artificial Analysis leaderboard.
- **Why 120/220/100 tokens not 100/200/125?** Direct providers strip the markup buffer Replicate gave us. PayMongo fees + ~5% failure refund rate need to be baked in.
- **Why image-only free grant?** `kind='image_only'` enforced at API gate AND SQL RPC.
- **Why keep ₱99 Spark unchanged?** Lowest viable price under PayMongo QRPh's ₱15 flat fee.
- **Why defer the BytePlus pack purchase?** (NEW) Non-refundable + 90-day expiry + zero validated demand = bad bet for a student-funded launch. Email support first, see if pay-as-you-go can be enabled. If not, $23.10 7M fast pack is the smallest viable commit but only AFTER smoke-testing the integration on borrowed credits or a free tier elsewhere.
- **Why the "$0.074/s" assumption was wrong.** (NEW) That was a Replicate-style per-second rate, not BytePlus's per-token rate. BytePlus charges $0.0033–$0.0043 per 1K tokens, where tokens = `(w × h × dur × 24) / 1024`. Real cost @ 720p × 6s = $0.43–$0.56, not $0.44–$0.84.
- **Why no BytePlus "pro tier" within one model.** (NEW) Console shows Seedance 2.0 and Seedance 2.0 fast as **separate models with separate token pools**. There is no `?mode=pro` parameter. Each model needs its own prepaid pack. The 120/220 split should probably collapse to one tier for MVP.

---

**Sleep well. Tomorrow: verify $300 credit source → email BytePlus support → decide buy/skip → refactor cost math → smoke test (or ship image-only).**
