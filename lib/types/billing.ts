export type PlanId = 'starter' | 'growth' | 'pro' | 'business'
export type BillingInterval = 'monthly'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_cancelled'
export type LedgerType = 'grant' | 'topup' | 'image_gen' | 'video_gen' | 'model_gen' | 'refund' | 'rollover'

export interface Plan {
  id: PlanId
  name: string
  /** Price in PHP centavos (e.g. 109900 = ₱1,099) */
  monthlyPriceCentavos: number
  tokensPerMonth: number
  monthlyReleaseTranches: number
  storageGb: number
  rolloverDays: number
  /** PayMongo Plan ID — set after creating plans in PayMongo dashboard/API */
  paymongoMonthlyPlanId: string
  features: string[]
}

export interface CreditPack {
  id: string
  name: string
  tokens: number
  /** Price in PHP centavos */
  priceCentavos: number
}

export interface Subscription {
  id: string
  userId: string
  planId: PlanId
  status: SubscriptionStatus
  paymongoSubscriptionId: string | null
  paymongoCustomerId: string | null
  billingInterval: BillingInterval
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface TokenBalance {
  total: number
  used: number
  remaining: number
}

export interface VideoModel {
  id: string
  name: string
  replicateSlug: string
  replicateVersion: string
  tokenCost: number
  qualityLabel: string
  minPlanId: PlanId
  description: string
  allowedDurations: number[]
  defaultDuration: number
}
