import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTokenBalance, syncSubscriptionTokenAccrual } from '@/lib/billing/tokens'
import { getBillingControls } from '@/lib/billing/launch-control'
import { getPlan } from '@/lib/data/plans'
import type { PlanId, Subscription } from '@/lib/types/billing'

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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  await syncSubscriptionTokenAccrual(user.id)
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status, current_period_start, current_period_end, cancel_at_period_end, billing_interval')
    .eq('user_id', user.id)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const balance = await getTokenBalance(user.id)
  const billingControls = await getBillingControls(admin)

  return NextResponse.json({
    balance,
    planId,
    plan,
    subscription: mapSubscriptionRow(sub ?? null),
    billingControls,
  })
}
