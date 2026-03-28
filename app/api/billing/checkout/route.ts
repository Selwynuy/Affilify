/**
 * POST /api/billing/checkout
 *
 * Two flows:
 *
 * 1. Subscription — creates/retrieves a PayMongo Customer, then creates a
 *    SetupIntent to vault the user's card. Returns a `nextActionUrl` the
 *    frontend redirects to for the card-entry / 3DS flow. Once the card is
 *    vaulted, the frontend calls /api/billing/subscribe to create the actual
 *    subscription with the vaulted payment method.
 *
 * 2. Top-up (one-time) — creates a PaymentIntent and returns the `clientKey`
 *    for the frontend PayMongo.js checkout widget.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, createSetupIntent, createPaymentIntent } from '@/lib/billing/paymongo'
import { getPlan, TOPUP_PACKS } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { planId, topupPlanId } = body

  // ── Top-up purchase (one-time payment intent) ──────────────────────────────
  if (topupPlanId) {
    const pack = TOPUP_PACKS.find((p) => p.planId === topupPlanId)
    if (!pack) {
      return NextResponse.json({ error: 'Top-up not available for this plan' }, { status: 400 })
    }

    try {
      const intent = await createPaymentIntent(
        pack.priceCentavos,
        'Affilify token top-up — 1,000 tokens',
        {
          userId: user.id,
          type: 'topup',
          planId: topupPlanId,
          tokens: String(pack.tokens),
        },
      )
      return NextResponse.json({ clientKey: intent.attributes.client_key, intentId: intent.id })
    } catch (err) {
      logger.error('Failed to create top-up PaymentIntent', { userId: user.id }, err)
      return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
    }
  }

  // ── Subscription setup — vault card via SetupIntent ────────────────────────
  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 })
  }

  const plan = getPlan(planId as PlanId)
  if (!plan.paymongoMonthlyPlanId) {
    return NextResponse.json({ error: 'Plan not yet configured' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Retrieve or create PayMongo Customer for this user
  let customerId: string
  const { data: existing } = await admin
    .from('subscriptions')
    .select('paymongo_customer_id')
    .eq('user_id', user.id)
    .single()

  if (existing?.paymongo_customer_id) {
    customerId = existing.paymongo_customer_id
  } else {
    try {
      const customer = await createCustomer(user.email!, user.id)
      customerId = customer.id
    } catch (err) {
      logger.error('Failed to create PayMongo customer', { userId: user.id }, err)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
  }

  // Create a SetupIntent to vault the user's card
  try {
    const setupIntent = await createSetupIntent(customerId)
    const nextActionUrl = setupIntent.attributes.next_action?.redirect?.url ?? null

    return NextResponse.json({
      setupIntentId: setupIntent.id,
      clientKey: setupIntent.attributes.client_key,
      nextActionUrl,
      customerId,
      planId,
    })
  } catch (err) {
    logger.error('Failed to create SetupIntent', { userId: user.id }, err)
    return NextResponse.json({ error: 'Failed to initiate card setup' }, { status: 500 })
  }
}
