import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanId, LedgerType } from '@/lib/types/billing'
import { getPlan } from '@/lib/data/plans'

interface ActiveSubscriptionRow {
  plan_id: PlanId
  status: string
  current_period_start: string | null
  current_period_end: string | null
}

interface TokenGrantRow {
  description?: string | null
  created_at?: string | null
}

function getAccrualGrantDescription(planName: string, trancheIndex: number, trancheCount: number, periodStart: string) {
  return `Subscription accrual ${trancheIndex + 1}/${trancheCount} - ${planName} - ${periodStart}`
}

function getDueTrancheCount(periodStart: Date, periodEnd: Date, trancheCount: number, now: Date) {
  if (trancheCount <= 1) return 1
  if (now <= periodStart) return 1
  if (now >= periodEnd) return trancheCount

  const elapsedMs = now.getTime() - periodStart.getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return Math.min(trancheCount, Math.max(1, Math.floor(elapsedMs / dayMs) + 1))
}

function getTrancheAmount(totalTokens: number, trancheCount: number, trancheIndex: number) {
  const base = Math.floor(totalTokens / trancheCount)
  const remainder = totalTokens % trancheCount
  return base + (trancheIndex < remainder ? 1 : 0)
}

function normalizeGrantDescription(description: string) {
  return description
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â/g, '—')
    .replace(/Ã¢â‚¬â€/g, '—')
    .replace(/â€”/g, '—')
    .trim()
}

function hasLegacyMonthlyGrantInCurrentPeriod(
  grants: TokenGrantRow[],
  planName: string,
  periodStartIso: string,
  periodEndIso: string,
) {
  const targetDescription = `Monthly grant — ${planName} plan`

  return grants.some((grant) => {
    if (!grant.description || !grant.created_at) return false
    if (normalizeGrantDescription(grant.description) !== targetDescription) return false
    return grant.created_at >= periodStartIso && grant.created_at < periodEndIso
  })
}

/** Returns the remaining token balance for a user. */
export async function getTokenBalance(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('token_ledger')
    .select('amount')
    .eq('user_id', userId)

  if (!data) return 0
  return data.reduce((sum, row) => sum + row.amount, 0)
}

/** Deducts tokens. Returns false if insufficient balance. */
export async function deductTokens(
  userId: string,
  amount: number,
  type: LedgerType,
  description: string,
  projectId?: string,
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('consume_tokens', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_project_id: projectId ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

/**
 * Beta starter grant. Idempotent — guards against double-granting if signup
 * is retried. Always written with kind='image_only' so video_gen can never
 * draw from these tokens (enforced at both the API gate and the SQL RPC).
 */
export async function grantStarterTokens(
  userId: string,
  amount: number,
  description: string,
): Promise<void> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('token_ledger')
    .select('user_id')
    .eq('user_id', userId)
    .eq('type', 'grant')
    .eq('description', description)
    .maybeSingle()

  if (existing) return

  await admin.from('token_ledger').insert({
    user_id: userId,
    amount,
    type: 'grant',
    description,
    kind: 'image_only',
  })
}

/**
 * Returns the balance a user can spend on video generation. Excludes
 * image_only rows (the beta starter grant) so free testers cannot animate
 * even if their raw balance looks sufficient.
 */
export async function getVideoEligibleBalance(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('token_ledger')
    .select('amount')
    .eq('user_id', userId)
    .eq('kind', 'general')

  if (!data) return 0
  return data.reduce((sum, row) => sum + row.amount, 0)
}

/**
 * True if the user has ever completed a paid transaction (topup OR plan period).
 * Used to gate video generation: free beta testers cannot run video gen until
 * they pay at least once.
 */
export async function hasUserPaid(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('billing_payments')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'credited')
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}

/** Legacy helper kept for compatibility with older webhook code paths. */
export async function grantMonthlyTokens(userId: string, planId: PlanId): Promise<void> {
  const plan = getPlan(planId)
  const admin = createAdminClient()
  await admin.from('token_ledger').insert({
    user_id: userId,
    amount: plan.tokensPerMonth,
    type: 'grant',
    description: `Monthly grant — ${plan.name} plan`,
  })
}

export async function syncSubscriptionTokenAccrual(userId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status, current_period_start, current_period_end')
    .eq('user_id', userId)
    .single()

  const activeSub = (sub ?? null) as ActiveSubscriptionRow | null
  if (!activeSub || activeSub.status !== 'active') return
  if (!activeSub.current_period_start || !activeSub.current_period_end) return

  const plan = getPlan(activeSub.plan_id)
  const periodStart = new Date(activeSub.current_period_start)
  const periodEnd = new Date(activeSub.current_period_end)
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) return

  const { data: periodGrants } = await admin
    .from('token_ledger')
    .select('description, created_at')
    .eq('user_id', userId)
    .eq('type', 'grant')

  const grantRows = (periodGrants ?? []) as TokenGrantRow[]
  if (hasLegacyMonthlyGrantInCurrentPeriod(
    grantRows,
    plan.name,
    activeSub.current_period_start,
    activeSub.current_period_end,
  )) {
    return
  }

  // Safety rule: only release the tranche due for the current day.
  // Do not backfill all missed days during a refresh, or users can receive
  // a large burst of tokens at once.
  const dueTrancheCount = getDueTrancheCount(periodStart, periodEnd, plan.monthlyReleaseTranches, new Date())
  const trancheIndex = dueTrancheCount - 1
  const description = getAccrualGrantDescription(
    plan.name,
    trancheIndex,
    plan.monthlyReleaseTranches,
    activeSub.current_period_start,
  )

  const { data: existingGrant } = await admin
    .from('token_ledger')
    .select('user_id')
    .eq('user_id', userId)
    .eq('type', 'grant')
    .eq('description', description)
    .maybeSingle()

  if (existingGrant) return

  await admin.from('token_ledger').insert({
    user_id: userId,
    amount: getTrancheAmount(plan.tokensPerMonth, plan.monthlyReleaseTranches, trancheIndex),
    type: 'grant',
    description,
  })
}

/** Refunds tokens back to a user. Used when generation fails after tokens were already deducted. */
export async function refundTokens(
  userId: string,
  amount: number,
  description: string,
  projectId?: string,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.rpc('refund_tokens', {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_project_id: projectId ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/** Gets the user's current plan ID from subscriptions table. Falls back to null. */
export async function getUserPlanId(userId: string): Promise<PlanId | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .single()

  if (!data || data.status !== 'active') return null
  return data.plan_id as PlanId
}

export const __testing__ = {
  getDueTrancheCount,
  getTrancheAmount,
  hasLegacyMonthlyGrantInCurrentPeriod,
  normalizeGrantDescription,
}
