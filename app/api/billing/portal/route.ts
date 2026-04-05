/**
 * POST /api/billing/portal
 *
 * Cancels the user's subscription at period end via PayMongo API.
 * PayMongo has no hosted billing portal — cancellation is handled inline.
 *
 * Returns the updated subscription status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelSubscription } from '@/lib/billing/paymongo'
import { logger } from '@/lib/logger'
import { verifySameOrigin } from '@/lib/security'

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('paymongo_subscription_id, status')
    .eq('user_id', user.id)
    .single()

  if (!sub?.paymongo_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  if (sub.status === 'canceled') {
    return NextResponse.json({ error: 'Subscription already canceled' }, { status: 400 })
  }

  try {
    const updated = await cancelSubscription(sub.paymongo_subscription_id)

    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    logger.info('subscription cancel_at_period_end set', { userId: user.id })

    return NextResponse.json({
      status: updated.attributes.status,
      cancelAtPeriodEnd: true,
      nextBillingDate: updated.attributes.next_billing_schedule,
    })
  } catch (err) {
    logger.error('Failed to cancel subscription', { userId: user.id }, err)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}
