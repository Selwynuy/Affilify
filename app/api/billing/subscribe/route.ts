/**
 * POST /api/billing/subscribe
 *
 * Creates a PayMongo recurring plan record for the staggered model flow after
 * a card has already been vaulted on the client side.
 *
 * Body: { customerId, planId, paymentMethodId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSubscription } from '@/lib/billing/paymongo'
import { getBillingControls } from '@/lib/billing/launch-control'
import { getPlan } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'
import { logger } from '@/lib/logger'
import { sanitizeText, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`billing-subscribe:user:${user.id}`, RATE_LIMITS.billingSubscribe)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const admin = createAdminClient()
  const billingControls = await getBillingControls(admin)
  if (!billingControls.subscriptionsEnabled) {
    return NextResponse.json(
      { error: billingControls.subscriptionMessage ?? 'Staggered models are not available at this time.' },
      { status: 409 },
    )
  }

  const body = await req.json()
  const customerId = sanitizeText(body?.customerId, { maxLength: 100 })
  const paymentMethodId = sanitizeText(body?.paymentMethodId, { maxLength: 100 })
  const planId = sanitizeText(body?.planId, { maxLength: 30 }) as PlanId | null

  if (!customerId || !planId || !paymentMethodId) {
    return NextResponse.json({ error: 'customerId, planId, and paymentMethodId required' }, { status: 400 })
  }

  const plan = getPlan(planId)
  if (!plan.paymongoMonthlyPlanId) {
    return NextResponse.json({ error: 'Plan not configured' }, { status: 400 })
  }

  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('status, paymongo_subscription_id, plan_id')
    .eq('user_id', user.id)
    .single()

  if (existingSub?.status === 'active' && existingSub.paymongo_subscription_id) {
    return NextResponse.json({ error: 'You already have an active staggered model.' }, { status: 409 })
  }

  try {
    const sub = await createSubscription(customerId, plan.paymongoMonthlyPlanId, paymentMethodId)

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
    logger.error('Failed to create staggered model', { userId: user.id, planId }, err)
    return NextResponse.json({ error: 'Failed to create staggered model' }, { status: 500 })
  }
}
