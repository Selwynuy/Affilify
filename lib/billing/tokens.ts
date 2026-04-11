import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanId } from '@/lib/types/billing'
import type { LedgerType } from '@/lib/types/billing'
import { getPlan } from '@/lib/data/plans'

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

/** Grants the monthly token allocation for a user's plan. Called by Stripe webhook. */
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
