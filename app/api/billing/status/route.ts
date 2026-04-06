import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { retrievePaymentIntent } from '@/lib/billing/paymongo'
import {
  finalizeBillingPayment,
  getBillingPaymentForUser,
  updateBillingPaymentStatus,
} from '@/lib/billing/payments'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/security'

const QRPH_EXPIRY_MS = 30 * 60 * 1000

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const intentId = sanitizeText(req.nextUrl.searchParams.get('intentId'), { maxLength: 100 })
  if (!intentId) {
    return NextResponse.json({ error: 'intentId is required' }, { status: 400 })
  }

  const payment = await getBillingPaymentForUser(user.id, intentId)
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  if (payment.credited_at) {
    return NextResponse.json({ paid: true, status: 'credited' })
  }

  try {
    const intent = await retrievePaymentIntent(intentId)
    const paymongoStatus = intent.attributes.status
    const latestPayment = intent.attributes.payments?.[0]
    const paidAt = toIsoFromUnix(latestPayment?.attributes?.paid_at)

    if (paymongoStatus === 'succeeded') {
      const result = await finalizeBillingPayment(intentId, latestPayment?.id ?? null, paidAt)
      return NextResponse.json({
        paid: true,
        status: result.record?.status ?? 'credited',
        balance: result.balance,
      })
    }

    const expired = Date.now() - new Date(payment.created_at).getTime() >= QRPH_EXPIRY_MS
    if (expired && payment.status === 'awaiting_payment') {
      await updateBillingPaymentStatus(intentId, 'expired')
    }

    return NextResponse.json({
      paid: false,
      status: expired ? 'expired' : paymongoStatus,
      expired,
    })
  } catch (err) {
    logger.error('Failed to reconcile billing payment status', { userId: user.id, intentId }, err)
    return NextResponse.json(
      { paid: false, status: payment.status, error: 'Unable to verify payment right now' },
      { status: 200 },
    )
  }
}
