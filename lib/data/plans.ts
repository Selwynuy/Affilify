import type { Plan, PlanId, CreditPack, VideoModel } from '@/lib/types/billing'

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceCentavos: 109900,   // ₱1,099/mo
    tokensPerMonth: 4000,
    monthlyReleaseTranches: 30,
    storageGb: 3,
    rolloverDays: 0,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_STARTER ?? '',
    features: [
      '4,000 tokens/month',
      'Released daily in 30 tranches during launch',
      '~33 Seedance Fast 6s runs',
      'Standard models (Kling Turbo, Seedance Fast)',
      '3 GB storage',
      'No rollover',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPriceCentavos: 219900,   // ₱2,199/mo
    tokensPerMonth: 9500,
    monthlyReleaseTranches: 30,
    storageGb: 10,
    rolloverDays: 30,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_GROWTH ?? '',
    features: [
      '9,500 tokens/month',
      '~43 Seedance Pro 6s runs',
      'Standard + Pro models (adds Seedance 2.0 Pro)',
      '10 GB storage',
      '30-day token rollover',
      'Everything in Starter',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCentavos: 499900,   // ₱4,999/mo
    tokensPerMonth: 22000,
    monthlyReleaseTranches: 30,
    storageGb: 15,
    rolloverDays: 30,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_PRO ?? '',
    features: [
      '22,000 tokens/month',
      '~100 Seedance Pro 6s runs',
      'Standard + Pro models',
      '15 GB storage',
      '30-day token rollover',
      'Everything in Growth',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPriceCentavos: 1099900,  // ₱10,999/mo
    tokensPerMonth: 60000,
    monthlyReleaseTranches: 30,
    storageGb: 50,
    rolloverDays: 60,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_BUSINESS ?? '',
    features: [
      '60,000 tokens/month',
      '~272 Seedance Pro 6s runs',
      'All models including Pro tiers',
      '50 GB storage',
      '60-day token rollover',
      'Priority queue',
    ],
  },
]

export const PLAN_ORDER: PlanId[] = ['starter', 'growth', 'pro', 'business']

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

export function isPlanAtLeast(userPlanId: PlanId, requiredPlanId: PlanId): boolean {
  return PLAN_ORDER.indexOf(userPlanId) >= PLAN_ORDER.indexOf(requiredPlanId)
}

// Token costs
export const TOKEN_COSTS = {
  image_gen: 8,    // Gemini image generation
  model_gen: 20,   // Gemini standalone model photo generation
} as const

// Free tokens granted to every new user on signup. Image-only — written
// with kind='image_only' in token_ledger so the export route's eligible
// balance check refuses video generation funded by this grant. Sized for
// ~12 image gens (8 tokens each) — enough to evaluate quality, not enough
// to make the ₱99 pack feel redundant.
export const SIGNUP_FREE_TOKENS = 100

const BILLING_SMOKE_PACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BILLING_SMOKE_PACK === 'true'

// Credit packs — one-time QRPH/GCash purchases (no subscription required).
// Priced at a premium vs subscriptions: packs = convenience, subs = volume.
// Spark (₱99) is the entry-tier marketing hook — 200 tokens covers one
// Seedance Fast video (120) plus ~10 image refinements (80 ÷ 8 each).
const BASE_CREDIT_PACKS: CreditPack[] = [
  { id: 'spark',   name: 'Spark',   tokens: 200,   priceCentavos: 9900   }, // ₱99   — ₱0.495/token
  { id: 'trial',   name: 'Trial',   tokens: 520,   priceCentavos: 24900  }, // ₱249  — ₱0.479/token
  { id: 'basic',   name: 'Basic',   tokens: 1500,  priceCentavos: 64900  }, // ₱649  — ₱0.433/token
  { id: 'creator', name: 'Creator', tokens: 4000,  priceCentavos: 149900 }, // ₱1,499 — ₱0.375/token
  { id: 'studio',  name: 'Studio',  tokens: 10000, priceCentavos: 329900 }, // ₱3,299 — ₱0.330/token
]

const BILLING_SMOKE_PACK: CreditPack = {
  id: 'verify',
  name: 'Verify',
  tokens: 5,
  priceCentavos: 500,
}

export const CREDIT_PACKS: CreditPack[] = BILLING_SMOKE_PACK_ENABLED
  ? [BILLING_SMOKE_PACK, ...BASE_CREDIT_PACKS]
  : BASE_CREDIT_PACKS

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id)
}

// Video models — ordered cheapest to most expensive
export const VIDEO_MODELS: VideoModel[] = [
  {
    id: 'kling-turbo',
    name: 'Kling v2.5 Turbo',
    provider: 'replicate',
    replicateSlug: 'kwaivgi/kling-v2.5-turbo-pro',
    replicateVersion: 'a3ccc39250a72749ced345996ec06d96d1d032b1a1369f45f3b9f654324036b5',
    tokenCost: 100,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: "Cinematic motion and natural fabric drape. Kling's mid-tier at 1080p.",
    allowedDurations: [5, 10],
    defaultDuration: 5,
  },
  {
    id: 'seedance-2-fast',
    name: 'Seedance 2.0 Fast',
    provider: 'byteplus',
    byteplusModelKey: 'seedance-fast',
    tokenCost: 120,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: 'Top-ranked image-to-video with native audio sync. Best price-per-quality.',
    allowedDurations: [4, 6, 8],
    defaultDuration: 6,
  },
  {
    id: 'seedance-2-pro',
    name: 'Seedance 2.0 Pro',
    provider: 'byteplus',
    byteplusModelKey: 'seedance-pro',
    tokenCost: 220,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: 'Premium quality with multimodal references and synchronized audio.',
    allowedDurations: [4, 6, 8, 10],
    defaultDuration: 6,
  },
]

export function getVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0]
}

export function getAvailableModels(planId: PlanId): VideoModel[] {
  return VIDEO_MODELS.filter((m) => isPlanAtLeast(planId, m.minPlanId))
}
