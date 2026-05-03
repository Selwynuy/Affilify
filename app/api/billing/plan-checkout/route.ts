/**
 * POST /api/billing/plan-checkout
 *
 * QRPH checkout for monthly plans (Path B — manual-renewal subscriptions).
 * One QRPH payment buys 30 days of access; the webhook activates the
 * subscription row + triggers the daily token release machinery.
 *
 * Body: { planId: 'starter' | 'growth' | 'pro' }
 *
 * Response: { qrCode, intentId, tokens, amountCentavos, planName }
 *
 * Note: This is the temporary monetisation flow until PayMongo's
 * Subscriptions API is enabled on the account (KYC pending).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPaymentIntent,
  createQRPHPaymentMethod,
  attachQRPHPaymentMethod,
} from '@/lib/billing/paymongo'
import { createBillingPayment } from '@/lib/billing/payments'
import { getPlan } from '@/lib/data/plans'
import { getBillingControls } from '@/lib/billing/launch-control'
import type { PlanId } from '@/lib/types/billing'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'
import { sanitizeText, verifySameOrigin } from '@/lib/security'

const VALID_PLAN_IDS: readonly PlanId[] = ['starter', 'growth', 'pro']

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.email) {
    return NextResponse.json({ error: 'Account email is required for billing' }, { status: 400 })
  }

  const rl = await rateLimit(`plan-checkout:user:${user.id}`, RATE_LIMITS.billingCheckout)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }

  const admin = createAdminClient()
  const billingControls = await getBillingControls(admin)
  if (!billingControls.subscriptionsEnabled) {
    return NextResponse.json(
      { error: billingControls.subscriptionMessage ?? 'Plans are not available right now.' },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const planIdRaw = sanitizeText((body as { planId?: string })?.planId, { maxLength: 30 })
  if (!planIdRaw || !(VALID_PLAN_IDS as readonly string[]).includes(planIdRaw)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  const planId = planIdRaw as PlanId

  // Block if user already has an active period that hasn't expired.
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    existingSub?.status === 'active' &&
    existingSub.current_period_end &&
    new Date(existingSub.current_period_end).getTime() > Date.now()
  ) {
    return NextResponse.json(
      { error: 'You already have an active plan. Renew when the current period ends.' },
      { status: 409 },
    )
  }

  const plan = getPlan(planId)

  try {
    // Idempotency key: prevents duplicate intents from rapid double-clicks.
    const windowKey = Math.floor(Date.now() / (10 * 60_000))
    const idempotencyKey = `plan-${user.id}-${plan.id}-${windowKey}`

    const intent = await createPaymentIntent(
      plan.monthlyPriceCentavos,
      `Genetrify ${plan.name} plan - 30 days (${plan.tokensPerMonth.toLocaleString()} tokens)`,
      {
        userId: user.id,
        type: 'plan_period',
        planId: plan.id,
        planName: plan.name,
        tokens: String(plan.tokensPerMonth),
        amountCentavos: String(plan.monthlyPriceCentavos),
        periodMonths: '1',
      },
      idempotencyKey,
    )

    await createBillingPayment({
      userId: user.id,
      email: user.email,
      packId: `plan_${plan.id}`,
      packName: `${plan.name} plan (30 days)`,
      tokens: plan.tokensPerMonth,
      amountCentavos: plan.monthlyPriceCentavos,
      paymentIntentId: intent.id,
      kind: 'plan_period',
      planId: plan.id,
      periodMonths: 1,
    })

    const name = user.email.split('@')[0] ?? 'User'
    const paymentMethod = await createQRPHPaymentMethod(user.email, name)
    const attached = await attachQRPHPaymentMethod(intent.id, intent.attributes.client_key, paymentMethod.id)

    const qrCode = attached.attributes.next_action?.code?.image_url ?? null
    if (!qrCode) {
      logger.error('QRPH attach returned no QR for plan checkout', { userId: user.id, intentId: intent.id })
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
    }

    return NextResponse.json({
      qrCode,
      intentId: intent.id,
      tokens: plan.tokensPerMonth,
      amountCentavos: plan.monthlyPriceCentavos,
      planName: plan.name,
      planId: plan.id,
    })
  } catch (err) {
    logger.error('Plan QRPH checkout failed', { userId: user.id, planId }, err)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
