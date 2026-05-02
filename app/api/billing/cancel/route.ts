/**
 * POST /api/billing/cancel
 *
 * Marks a pending payment intent as cancelled/expired in our DB.
 * PayMongo does not expose a cancel endpoint for payment intents — they
 * expire automatically after 30 minutes. This route simply invalidates the
 * record on our side so it cannot be credited if the QR is scanned later.
 *
 * Body: { intentId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingPaymentForUser, updateBillingPaymentStatus } from '@/lib/billing/payments'
import { logger } from '@/lib/logger'
import { isUuid, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`billing-cancel:user:${user.id}`, RATE_LIMITS.billingCancel)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await req.json()
  const intentId = typeof body?.intentId === 'string' ? body.intentId.trim() : ''

  if (!intentId) {
    return NextResponse.json({ error: 'intentId is required' }, { status: 400 })
  }

  // Verify this intent belongs to the authenticated user
  const record = await getBillingPaymentForUser(user.id, intentId)
  if (!record) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // Only cancel if still pending — don't touch already-paid records
  if (record.status !== 'awaiting_payment') {
    return NextResponse.json({ error: 'Payment cannot be cancelled in its current state' }, { status: 409 })
  }

  try {
    await updateBillingPaymentStatus(intentId, 'expired')
    logger.info('Payment intent cancelled by user', { userId: user.id, intentId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Failed to cancel billing payment', { userId: user.id, intentId }, err)
    return NextResponse.json({ error: 'Failed to cancel payment' }, { status: 500 })
  }
}
