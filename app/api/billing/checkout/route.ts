import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/billing/stripe'
import { getPlan, TOPUP_PACKS } from '@/lib/data/plans'
import type { PlanId, BillingInterval } from '@/lib/types/billing'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId, interval, topupPlanId } = await req.json()
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // ── Top-up purchase (one-time) ─────────────────────────────────────────────
  if (topupPlanId) {
    const pack = TOPUP_PACKS.find((p) => p.planId === topupPlanId)
    if (!pack?.stripePriceId) {
      return NextResponse.json({ error: 'Top-up not available' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      metadata: { userId: user.id, type: 'topup', planId: topupPlanId, tokens: String(pack.tokens) },
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      success_url: `${origin}/billing?topup=success`,
      cancel_url: `${origin}/billing`,
    })

    return NextResponse.json({ url: session.url })
  }

  // ── Subscription checkout ──────────────────────────────────────────────────
  if (!planId || !interval) {
    return NextResponse.json({ error: 'planId and interval required' }, { status: 400 })
  }

  const plan = getPlan(planId as PlanId)
  const priceId = (interval as BillingInterval) === 'annual'
    ? plan.stripePriceAnnualId
    : plan.stripePriceMonthlyId

  if (!priceId) {
    return NextResponse.json({ error: 'Plan price not configured' }, { status: 400 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    metadata: { userId: user.id, type: 'subscription', planId, interval },
    subscription_data: { metadata: { userId: user.id, planId, interval } },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?subscribed=success`,
    cancel_url: `${origin}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
