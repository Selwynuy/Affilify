/**
 * POST /api/billing/webhook
 *
 * Handles PayMongo webhook events.
 * Register this URL in PayMongo dashboard with events:
 *   - subscription.invoice.paid
 *   - subscription.invoice.payment_failed
 *   - subscription.updated
 *   - subscription.past_due
 *   - subscription.unpaid
 *   - payment.paid
 *   - payment.failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/billing/paymongo'
import { finalizeBillingPayment, updateBillingPaymentStatus } from '@/lib/billing/payments'
import { logger } from '@/lib/logger'

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('paymongo-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let valid: boolean
  try {
    valid = verifyWebhookSignature(rawBody, sig)
  } catch (err) {
    logger.error('Webhook signature verification threw', {}, err)
    return NextResponse.json({ error: 'Signature error' }, { status: 400 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { data: { attributes: { type: string; data: Record<string, unknown> } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.data.attributes.type
  const eventData = event.data.attributes.data as Record<string, unknown>

  switch (eventType) {
    case 'subscription.invoice.paid':
    case 'subscription.invoice.payment_failed':
    case 'subscription.updated':
    case 'subscription.past_due':
    case 'subscription.unpaid':
      logger.warn(`webhook: subscription event received while subscriptions are disabled (${eventType})`)
      break

    case 'payment.paid': {
      const payment = eventData as {
        id: string
        attributes: {
          payment_intent_id?: string
          paid_at?: number
        }
      }

      const intentId = payment.attributes.payment_intent_id
      if (!intentId) {
        logger.error('payment.paid missing payment_intent_id', { paymentId: payment.id })
        break
      }

      const paidAt = toIsoFromUnix(payment.attributes.paid_at)
      const result = await finalizeBillingPayment(intentId, payment.id, paidAt)

      logger.info('payment.paid: credit pack tokens granted', {
        intentId,
        paymentId: payment.id,
        userId: result.record?.user_id,
        tokens: result.record?.tokens,
      })
      break
    }

    case 'payment.failed': {
      const payment = eventData as {
        id: string
        attributes: {
          payment_intent_id?: string
        }
      }

      const intentId = payment.attributes.payment_intent_id
      if (intentId) {
        await updateBillingPaymentStatus(intentId, 'failed', { paymentId: payment.id })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
