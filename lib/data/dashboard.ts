import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTokenBalance } from '@/lib/billing/tokens'
import { getPlan } from '@/lib/data/plans'
import type { Plan, PlanId, Subscription } from '@/lib/types/billing'
import type { SupportTicket } from '@/lib/types/support'

export interface BillingPageData {
  balance: number
  planId: PlanId | null
  plan: Plan | null
  subscription: Subscription | null
}

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user.id
}

export async function getBillingPageData(): Promise<BillingPageData> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status, current_period_end, cancel_at_period_end, billing_interval')
    .eq('user_id', userId)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const balance = await getTokenBalance(userId)

  return {
    balance,
    planId,
    plan,
    subscription: (sub ?? null) as Subscription | null,
  }
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('support_tickets')
    .select('*, ticket_messages(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SupportTicket[]
}
