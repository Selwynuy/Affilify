import type { Plan, PlanId, CreditPack, VideoModel } from '@/lib/types/billing'

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceCentavos: 109900,   // ₱1,099/mo
    tokensPerMonth: 4250,
    storageGb: 3,
    rolloverDays: 0,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_STARTER ?? '',
    features: [
      '4,250 tokens/month',
      '~88 full video runs',
      'Standard models (Hailuo Fast, Wan 2.1)',
      '3 GB storage',
      'No rollover',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPriceCentavos: 219900,   // ₱2,199/mo
    tokensPerMonth: 9500,
    storageGb: 10,
    rolloverDays: 30,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_GROWTH ?? '',
    features: [
      '9,500 tokens/month',
      '~197 full video runs',
      'Standard + Pro models',
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
    storageGb: 15,
    rolloverDays: 30,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_PRO ?? '',
    features: [
      '22,000 tokens/month',
      '~458 full video runs',
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
    storageGb: 50,
    rolloverDays: 60,
    paymongoMonthlyPlanId: process.env.PAYMONGO_PLAN_BUSINESS ?? '',
    features: [
      '60,000 tokens/month',
      '~1,250 full video runs',
      'All models including Elite',
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

// Free tokens granted to every new user on signup
export const SIGNUP_FREE_TOKENS = 300

const BILLING_SMOKE_PACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BILLING_SMOKE_PACK === 'true'

// Credit packs — one-time QRPH purchases (no subscription required)
// Priced at a premium vs subscriptions: packs = convenience, subs = volume discount
const BASE_CREDIT_PACKS: CreditPack[] = [
  { id: 'spark',   name: 'Spark',   tokens: 200,   priceCentavos: 10000  }, // ₱100  — ₱0.500/token
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
    id: 'hailuo-fast',
    name: 'Hailuo Fast',
    replicateSlug: 'minimax/hailuo-2.3-fast',
    replicateVersion: 'c92f075dfd04541f1c1913a9689f778ecf76bfec3dd9fdfe19903a86e07f2cdc',
    tokenCost: 40,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: 'Fast image-to-video with 768p and 1080p output options.',
    allowedDurations: [6, 10],
    defaultDuration: 6,
  },
  {
    id: 'wan-480p',
    name: 'Wan 2.1',
    replicateSlug: 'wavespeedai/wan-2.1-i2v-480p',
    replicateVersion: 'e2870aa4965fd9ddfd87c16a3c8ab952c18e745e63f3f3b123c2dc8b538ad2b5',
    tokenCost: 55,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: 'Smooth motion at 480p. Reliable and consistent results.',
    allowedDurations: [3, 5, 8],
    defaultDuration: 5,
  },
  {
    id: 'hailuo',
    name: 'Hailuo 2.3',
    replicateSlug: 'minimax/hailuo-2.3',
    replicateVersion: '23a02633b5a44780345a59d4d43f8bd510efa239c56f08f29639ff24fa6615e1',
    tokenCost: 60,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: 'High-fidelity image-to-video with 768p and 1080p output options.',
    allowedDurations: [6, 10],
    defaultDuration: 6,
  },
  {
    id: 'kling-turbo',
    name: 'Kling v2.5 Turbo',
    replicateSlug: 'kwaivgi/kling-v2.5-turbo-pro',
    replicateVersion: 'a3ccc39250a72749ced345996ec06d96d1d032b1a1369f45f3b9f654324036b5',
    tokenCost: 75,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: "Top quality-per-dollar. Kling's best mid-tier model at 1080p.",
    allowedDurations: [5, 10],
    defaultDuration: 5,
  },
]

export function getVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0]
}

export function getAvailableModels(planId: PlanId): VideoModel[] {
  return VIDEO_MODELS.filter((m) => isPlanAtLeast(planId, m.minPlanId))
}
