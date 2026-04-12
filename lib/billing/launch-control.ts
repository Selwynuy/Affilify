import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_FUNDED_TOKEN_COST_USD = 0.00475

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function readOptionalNumber(value: string | undefined) {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export interface BillingCapacitySnapshot {
  fundsUsd: number | null
  fundedTokenCostUsd: number
  maxFundedTokens: number | null
  outstandingTokens: number
  remainingFundedTokens: number | null
}

export interface BillingControls {
  subscriptionsEnabled: boolean
  topupsEnabled: boolean
  topupMessage: string | null
  subscriptionMessage: string | null
  capacity: BillingCapacitySnapshot
}

export function getBillingFeatureFlags() {
  return {
    subscriptionsEnabled: readBoolean(process.env.BILLING_SUBSCRIPTIONS_ENABLED, true),
    topupsEnabled: readBoolean(process.env.BILLING_TOPUPS_ENABLED, true),
  }
}

export function getFundedTokenCostUsd() {
  return readOptionalNumber(process.env.BILLING_FUNDED_TOKEN_COST_USD) ?? DEFAULT_FUNDED_TOKEN_COST_USD
}

export function getFundedTokenCapacityFromUsd(fundsUsd: number | null) {
  if (fundsUsd == null) return null
  return Math.max(0, Math.floor(fundsUsd / getFundedTokenCostUsd()))
}

async function getOutstandingTokenLiability(admin: SupabaseClient) {
  const { data, error } = await admin.from('token_ledger').select('amount')
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.amount ?? 0)), 0)
}

export async function getBillingControls(admin: SupabaseClient): Promise<BillingControls> {
  const featureFlags = getBillingFeatureFlags()
  const fundsUsd = readOptionalNumber(process.env.BILLING_FUNDED_CAP_USD)
  const fundedTokenCostUsd = getFundedTokenCostUsd()
  const maxFundedTokens = getFundedTokenCapacityFromUsd(fundsUsd)
  const outstandingTokens = await getOutstandingTokenLiability(admin)
  const remainingFundedTokens = maxFundedTokens == null
    ? null
    : Math.max(0, maxFundedTokens - outstandingTokens)
  const hasRemainingFundedTokens = remainingFundedTokens != null && remainingFundedTokens > 0

  const topupsBlockedByFunds = maxFundedTokens != null && !hasRemainingFundedTokens
  const subscriptionsBlockedByFunds = topupsBlockedByFunds

  const topupsEnabled = featureFlags.topupsEnabled && !topupsBlockedByFunds
  const subscriptionsEnabled = featureFlags.subscriptionsEnabled && !subscriptionsBlockedByFunds

  return {
    subscriptionsEnabled,
    topupsEnabled,
    topupMessage: !featureFlags.topupsEnabled
      ? 'Token top-ups are temporarily disabled.'
      : topupsBlockedByFunds
        ? 'Token top-ups are temporarily paused because the funded token allocation has been fully reserved.'
        : null,
    subscriptionMessage: !featureFlags.subscriptionsEnabled
      ? 'Staggered models are not available at this time.'
      : subscriptionsBlockedByFunds
        ? 'Staggered models are temporarily paused because the funded token allocation has been fully reserved.'
        : null,
    capacity: {
      fundsUsd,
      fundedTokenCostUsd,
      maxFundedTokens,
      outstandingTokens,
      remainingFundedTokens,
    },
  }
}
