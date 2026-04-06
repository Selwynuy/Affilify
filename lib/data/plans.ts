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
    replicateVersion: '781ad277a5bfd421484290b0e9968e66b010d9ad151eb237d24291e083e6e480',
    tokenCost: 40,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: 'Fast generation, great quality for the price. Best for high-volume runs.',
    allowedDurations: [6, 10],
    defaultDuration: 6,
  },
  {
    id: 'wan-480p',
    name: 'Wan 2.1',
    replicateSlug: 'wavespeedai/wan-2.1-i2v-480p',
    replicateVersion: '652edb0dc225f3d5d05a9890fa174602894ef5c2c4beeec92bb24c63e2f46b57',
    tokenCost: 80,
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
    tokenCost: 90,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: 'High quality at 1080p with excellent motion realism.',
    allowedDurations: [6, 10],
    defaultDuration: 6,
  },
  {
    id: 'kling-turbo',
    name: 'Kling v2.5 Turbo',
    replicateSlug: 'kwaivgi/kling-v2.5-turbo-pro',
    replicateVersion: '939cd1851c5b112f284681b57ee9b0f36d0f913ba97de5845a7eef92d52837df',
    tokenCost: 120,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: "Top quality-per-dollar. Kling's best mid-tier model at 1080p.",
    allowedDurations: [5, 10],
    defaultDuration: 5,
  },
  {
    id: 'kling-v3',
    name: 'Kling v3 Pro',
    replicateSlug: 'kwaivgi/kling-v3-video',
    replicateVersion: '96029e71b109a5d5d554a4b599767cc34ad53bec444e671257ff384beb5badde',
    tokenCost: 150,
    qualityLabel: 'Elite',
    minPlanId: 'business',
    description: 'State-of-the-art quality. Best motion adherence and realism.',
    allowedDurations: [5, 10, 15],
    defaultDuration: 5,
  },
  {
    id: 'veo-fast',
    name: 'Veo 3.1 Fast',
    replicateSlug: 'google/veo-3.1-fast',
    replicateVersion: '79ad4a4291af114fc8905c6e509d5e6fb5c09a255c29dd92b5a9db0c806ed61d',
    tokenCost: 200,
    qualityLabel: 'Elite',
    minPlanId: 'business',
    description: "Google's cinematic model. Exceptional for lifestyle and editorial content.",
    allowedDurations: [4, 6, 8],
    defaultDuration: 6,
  },
]

export function getVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0]
}

export function getAvailableModels(planId: PlanId): VideoModel[] {
  return VIDEO_MODELS.filter((m) => isPlanAtLeast(planId, m.minPlanId))
}
