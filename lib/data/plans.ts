import type { Plan, PlanId, VideoModel } from '@/lib/types/billing'

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceCents: 1900,
    annualPriceCents: 1500,
    tokensPerMonth: 4500,
    storageGb: 3,
    rolloverDays: 0,
    // Fill in real Stripe price IDs after creating products in Stripe dashboard
    stripePriceMonthlyId: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    stripePriceAnnualId:  process.env.STRIPE_PRICE_STARTER_ANNUAL  ?? '',
    features: [
      '4,500 tokens/month',
      '~51 full video runs',
      'Standard model (Hailuo Fast)',
      '3 GB storage',
      'No rollover',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPriceCents: 3900,
    annualPriceCents: 3100,
    tokensPerMonth: 10000,
    storageGb: 10,
    rolloverDays: 30,
    stripePriceMonthlyId: process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? '',
    stripePriceAnnualId:  process.env.STRIPE_PRICE_GROWTH_ANNUAL  ?? '',
    features: [
      '10,000 tokens/month',
      '~113 full video runs',
      'Standard + Pro models',
      '10 GB storage',
      '30-day rollover',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCents: 8900,
    annualPriceCents: 7100,
    tokensPerMonth: 24000,
    storageGb: 15,
    rolloverDays: 30,
    stripePriceMonthlyId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    stripePriceAnnualId:  process.env.STRIPE_PRICE_PRO_ANNUAL  ?? '',
    features: [
      '24,000 tokens/month',
      '~186 full video runs',
      'Standard + Pro models',
      '15 GB storage',
      '30-day rollover',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPriceCents: 19900,
    annualPriceCents: 15900,
    tokensPerMonth: 65000,
    storageGb: 50,
    rolloverDays: 60,
    stripePriceMonthlyId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
    stripePriceAnnualId:  process.env.STRIPE_PRICE_BUSINESS_ANNUAL  ?? '',
    features: [
      '65,000 tokens/month',
      '~500 full video runs',
      'All models including Elite',
      '50 GB storage',
      '60-day rollover',
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

// Top-up packs: tokens → price in cents
export const TOPUP_PACKS = [
  { tokens: 1000, priceCents: 900,  stripePriceId: process.env.STRIPE_PRICE_TOPUP_1000 ?? '', planId: 'starter'  as PlanId },
  { tokens: 1000, priceCents: 800,  stripePriceId: process.env.STRIPE_PRICE_TOPUP_GROWTH ?? '', planId: 'growth'  as PlanId },
  { tokens: 1000, priceCents: 700,  stripePriceId: process.env.STRIPE_PRICE_TOPUP_PRO   ?? '', planId: 'pro'      as PlanId },
  { tokens: 1000, priceCents: 600,  stripePriceId: process.env.STRIPE_PRICE_TOPUP_BIZ   ?? '', planId: 'business' as PlanId },
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
    description: 'Top quality-per-dollar. Kling\'s best mid-tier model at 1080p.',
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
    description: 'Google\'s cinematic model. Exceptional for lifestyle and editorial content.',
  },
]

export function getVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0]
}

export function getAvailableModels(planId: PlanId): VideoModel[] {
  return VIDEO_MODELS.filter((m) => isPlanAtLeast(planId, m.minPlanId))
}
