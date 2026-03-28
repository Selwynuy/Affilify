import type { Plan, PlanId, TopupPack, VideoModel } from '@/lib/types/billing'

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
} as const

// Top-up packs — 1,000 tokens at plan-tiered PHP rates
export const TOPUP_PACKS: TopupPack[] = [
  { tokens: 1000, priceCentavos: 29900,  planId: 'starter'  },   // ₱299
  { tokens: 1000, priceCentavos: 24900,  planId: 'growth'   },   // ₱249
  { tokens: 1000, priceCentavos: 19900,  planId: 'pro'      },   // ₱199
  { tokens: 1000, priceCentavos: 14900,  planId: 'business' },   // ₱149
]

// Video models — ordered cheapest to most expensive
export const VIDEO_MODELS: VideoModel[] = [
  {
    id: 'hailuo-fast',
    name: 'Hailuo Fast',
    replicateSlug: 'minimax/hailuo-2.3-fast',
    tokenCost: 40,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: 'Fast generation, great quality for the price. Best for high-volume runs.',
  },
  {
    id: 'wan-480p',
    name: 'Wan 2.1',
    replicateSlug: 'wavespeedai/wan-2.1-i2v-480p',
    tokenCost: 80,
    qualityLabel: 'Standard',
    minPlanId: 'starter',
    description: 'Smooth motion at 480p. Reliable and consistent results.',
  },
  {
    id: 'hailuo',
    name: 'Hailuo 2.3',
    replicateSlug: 'minimax/hailuo-2.3',
    tokenCost: 90,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: 'High quality at 1080p with excellent motion realism.',
  },
  {
    id: 'kling-turbo',
    name: 'Kling v2.5 Turbo',
    replicateSlug: 'kwaivgi/kling-v2.5-turbo-pro',
    tokenCost: 120,
    qualityLabel: 'Pro',
    minPlanId: 'growth',
    description: "Top quality-per-dollar. Kling's best mid-tier model at 1080p.",
  },
  {
    id: 'kling-v3',
    name: 'Kling v3 Pro',
    replicateSlug: 'kwaivgi/kling-v3-video',
    tokenCost: 150,
    qualityLabel: 'Elite',
    minPlanId: 'business',
    description: 'State-of-the-art quality. Best motion adherence and realism.',
  },
  {
    id: 'veo-fast',
    name: 'Veo 3.1 Fast',
    replicateSlug: 'google/veo-3.1-fast',
    tokenCost: 200,
    qualityLabel: 'Elite',
    minPlanId: 'business',
    description: "Google's cinematic model. Exceptional for lifestyle and editorial content.",
  },
]

export function getVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0]
}

export function getAvailableModels(planId: PlanId): VideoModel[] {
  return VIDEO_MODELS.filter((m) => isPlanAtLeast(planId, m.minPlanId))
}
