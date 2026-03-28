export type PlanId = 'starter' | 'growth' | 'pro' | 'business'
export type BillingInterval = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'
export type LedgerType = 'grant' | 'topup' | 'image_gen' | 'video_gen' | 'refund' | 'rollover'

export interface Plan {
  id: PlanId
  name: string
  monthlyPriceCents: number
  annualPriceCents: number
  tokensPerMonth: number
  storageGb: number
  rolloverDays: number
  stripePriceMonthlyId: string
  stripePriceAnnualId: string
  features: string[]
}

export interface Subscription {
  id: string
  userId: string
  planId: PlanId
  status: SubscriptionStatus
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  billingInterval: BillingInterval
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface TokenBalance {
  total: number        // tokens ever granted this period
  used: number         // tokens consumed
  remaining: number    // total - used
}

export interface VideoModel {
  id: string
  name: string
  replicateSlug: string
  tokenCost: number       // tokens per 5s generation
  qualityLabel: string
  minPlanId: PlanId
  description: string
}
