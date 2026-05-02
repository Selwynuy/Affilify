/**
 * POST /api/billing/portal
 *
 * Schedules cancellation of the current staggered model at period end.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelSubscription } from '@/lib/billing/paymongo'
import { logger } from '@/lib/logger'
import { verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`billing-portal:user:${user.id}`, RATE_LIMITS.billingPortal)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('paymongo_subscription_id, status')
    .eq('user_id', user.id)
    .single()

  if (!sub?.paymongo_subscription_id) {
    return NextResponse.json({ error: 'No active staggered model found' }, { status: 404 })
  }

  if (sub.status === 'canceled') {
    return NextResponse.json({ error: 'Staggered model already canceled' }, { status: 400 })
  }

  try {
    const updated = await cancelSubscription(sub.paymongo_subscription_id)

    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    logger.info('staggered model cancel_at_period_end set', { userId: user.id })

    return NextResponse.json({
      status: updated.attributes.status,
      cancelAtPeriodEnd: true,
      nextBillingDate: updated.attributes.next_billing_schedule,
    })
  } catch (err) {
    logger.error('Failed to cancel staggered model', { userId: user.id }, err)
    return NextResponse.json({ error: 'Failed to cancel staggered model' }, { status: 500 })
  }
}
