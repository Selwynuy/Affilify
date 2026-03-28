import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTokenBalance } from '@/lib/billing/tokens'
import { getPlan } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status, current_period_end, cancel_at_period_end, billing_interval')
    .eq('user_id', user.id)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const balance = await getTokenBalance(user.id)

  return NextResponse.json({
    balance,
    planId,
    plan,
    subscription: sub ?? null,
  })
}
