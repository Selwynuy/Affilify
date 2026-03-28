/**
 * POST /api/billing/subscribe
 *
 * Called by the frontend after the user has vaulted their card via the
 * SetupIntent flow. Creates the actual PayMongo Subscription.
 *
 * Body: { customerId, planId, paymentMethodId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSubscription } from '@/lib/billing/paymongo'
import { getPlan } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId, planId, paymentMethodId } = await req.json()

  if (!customerId || !planId || !paymentMethodId) {
    return NextResponse.json({ error: 'customerId, planId, and paymentMethodId required' }, { status: 400 })
  }

  const plan = getPlan(planId as PlanId)
  if (!plan.paymongoMonthlyPlanId) {
    return NextResponse.json({ error: 'Plan not configured' }, { status: 400 })
  }

  try {
    const sub = await createSubscription(customerId, plan.paymongoMonthlyPlanId, paymentMethodId)

    // Persist subscription record immediately (status may be 'incomplete' until first invoice pays)
    const admin = createAdminClient()
    await admin.from('subscriptions').upsert({
      user_id: user.id,
      plan_id: planId,
      status: sub.attributes.status,
      paymongo_subscription_id: sub.id,
      paymongo_customer_id: customerId,
      billing_interval: 'monthly',
      current_period_start: null,
      current_period_end: sub.attributes.next_billing_schedule ?? null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // If the first invoice needs 3DS, return the action URL
    const nextActionUrl =
      sub.attributes.latest_invoice?.payment_intent?.next_action_url ??
      sub.attributes.setup_intent?.next_action_url ??
      null

    return NextResponse.json({
      subscriptionId: sub.id,
      status: sub.attributes.status,
      nextActionUrl,
    })
  } catch (err) {
    logger.error('Failed to create subscription', { userId: user.id, planId }, err)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
