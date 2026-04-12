import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTokenBalance, syncSubscriptionTokenAccrual } from '@/lib/billing/tokens'
import { getBillingControls, type BillingControls } from '@/lib/billing/launch-control'
import { getPlan } from '@/lib/data/plans'
import type { Plan, PlanId, Subscription } from '@/lib/types/billing'
import type { SupportTicket } from '@/lib/types/support'

export interface BillingPageData {
  balance: number
  planId: PlanId | null
  plan: Plan | null
  subscription: Subscription | null
  billingControls: BillingControls
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

function mapSubscriptionRow(sub: {
  plan_id: PlanId
  status: Subscription['status']
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  billing_interval: Subscription['billingInterval']
} | null): Subscription | null {
  if (!sub) return null

  return {
    id: '',
    userId: '',
    planId: sub.plan_id,
    status: sub.status,
    paymongoSubscriptionId: null,
    paymongoCustomerId: null,
    billingInterval: sub.billing_interval,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  }
}

export async function getBillingPageData(): Promise<BillingPageData> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()
  await syncSubscriptionTokenAccrual(userId)

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status, current_period_start, current_period_end, cancel_at_period_end, billing_interval')
    .eq('user_id', userId)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const balance = await getTokenBalance(userId)
  const billingControls = await getBillingControls(admin)

  return {
    balance,
    planId,
    plan,
    subscription: mapSubscriptionRow(sub ?? null),
    billingControls,
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
