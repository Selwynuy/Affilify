import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantMonthlyTokens } from '@/lib/billing/tokens'
import type { PlanId, BillingInterval } from '@/lib/types/billing'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    // ── New subscription created / renewed ────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      const subId = (() => {
        const parent = invoice.parent
        if (!parent || parent.type !== 'subscription_details') return null
        const sub = parent.subscription_details?.subscription
        return typeof sub === 'string' ? sub : sub?.id ?? null
      })()
      if (!subId) break

      const stripeSub = await stripe.subscriptions.retrieve(subId)
      const userId = stripeSub.metadata.userId
      const planId = stripeSub.metadata.planId as PlanId
      const interval = stripeSub.metadata.interval as BillingInterval

      if (!userId || !planId) break

      const item = stripeSub.items.data[0]
      const periodStart = item?.current_period_start
      const periodEnd = item?.current_period_end

      // Upsert subscription record
      await admin.from('subscriptions').upsert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id,
        billing_interval: interval ?? 'monthly',
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Grant monthly tokens
      await grantMonthlyTokens(userId, planId)
      break
    }

    // ── Subscription updated (upgrade/downgrade/cancel) ───────────────────────
    case 'customer.subscription.updated': {
      const stripeSub = event.data.object
      const userId = stripeSub.metadata.userId
      const planId = stripeSub.metadata.planId as PlanId
      const interval = stripeSub.metadata.interval as BillingInterval

      if (!userId) break

      const item = stripeSub.items.data[0]
      const periodStart = item?.current_period_start
      const periodEnd = item?.current_period_end

      await admin.from('subscriptions').upsert({
        user_id: userId,
        plan_id: planId,
        status: stripeSub.status as string,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id,
        billing_interval: interval ?? 'monthly',
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    // ── Subscription canceled ─────────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object
      const userId = stripeSub.metadata.userId
      if (!userId) break

      await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }

    // ── One-time top-up payment ───────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.metadata?.type !== 'topup') break

      const userId = session.metadata.userId
      const tokens = parseInt(session.metadata.tokens ?? '0')
      const planId = session.metadata.planId

      if (!userId || !tokens) break

      await admin.from('token_ledger').insert({
        user_id: userId,
        amount: tokens,
        type: 'topup',
        description: `Top-up — 1,000 tokens (${planId} rate)`,
      })
      break
    }

    // ── Payment failed ────────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const subId = (() => {
        const parent = invoice.parent
        if (!parent || parent.type !== 'subscription_details') return null
        const sub = parent.subscription_details?.subscription
        return typeof sub === 'string' ? sub : sub?.id ?? null
      })()
      if (!subId) break

      const stripeSub = await stripe.subscriptions.retrieve(subId)
      const userId = stripeSub.metadata.userId
      if (!userId) break

      await admin.from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
