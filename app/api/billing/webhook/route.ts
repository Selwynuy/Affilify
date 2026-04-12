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
import { getSubscription, verifyWebhookSignature } from '@/lib/billing/paymongo'
import { finalizeBillingPayment, updateBillingPaymentStatus } from '@/lib/billing/payments'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncSubscriptionTokenAccrual } from '@/lib/billing/tokens'
import type { PlanId } from '@/lib/types/billing'
import { logger } from '@/lib/logger'

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

const VALID_PLAN_IDS: readonly PlanId[] = ['starter', 'growth', 'pro', 'business']

function parsePlanId(value: string | undefined): PlanId | null {
  if (!value || !(VALID_PLAN_IDS as readonly string[]).includes(value)) return null
  return value as PlanId
}

export async function POST(req: NextRequest) {
  // NOTE: verifySameOrigin() is intentionally NOT used here.
  // PayMongo webhooks are server-to-server POST requests, not
  // browser-initiated requests, so browser Origin/Referer checks are
  // not the right control for this endpoint.
  // We authenticate the raw request with PayMongo's HMAC-SHA256
  // signature before any business logic runs.

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
  const admin = createAdminClient()

  switch (eventType) {
    case 'subscription.invoice.paid': {
      const invoice = eventData as {
        attributes: {
          subscription_id: string
          billing_date?: string
        }
      }

      const subId = invoice.attributes.subscription_id
      if (!subId) break

      let pmSub
      try {
        pmSub = await getSubscription(subId)
      } catch (err) {
        logger.error('webhook: failed to fetch staggered model', { subId }, err)
        break
      }

      const { data: subRow } = await admin
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('paymongo_subscription_id', subId)
        .single()

      if (!subRow?.user_id) {
        logger.error('webhook: no subscription row found for paymongo sub', { subId })
        break
      }

      const planId = parsePlanId(subRow.plan_id)
      if (!planId) {
        logger.error('webhook: invalid plan_id in subscription row', { subId, planId: subRow.plan_id })
        break
      }

      const currentPeriodStart = invoice.attributes.billing_date ?? new Date().toISOString()
      const currentPeriodEnd = pmSub.attributes.next_billing_schedule ?? null

      await admin.from('subscriptions').upsert({
        user_id: subRow.user_id,
        plan_id: planId,
        status: 'active',
        paymongo_subscription_id: subId,
        paymongo_customer_id: pmSub.attributes.customer_id,
        billing_interval: 'monthly',
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      await syncSubscriptionTokenAccrual(subRow.user_id)
      logger.info('subscription.invoice.paid: staggered model period synced', { userId: subRow.user_id, planId })
      break
    }

    case 'subscription.invoice.payment_failed': {
      const invoice = eventData as { attributes: { subscription_id: string } }
      const subId = invoice.attributes.subscription_id
      if (!subId) break

      await admin
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('paymongo_subscription_id', subId)

      logger.warn('subscription.invoice.payment_failed', { subId })
      break
    }

    case 'subscription.updated': {
      const pmSub = eventData as {
        id: string
        attributes: { status: string; next_billing_schedule: string | null }
      }

      await admin
        .from('subscriptions')
        .update({
          status: pmSub.attributes.status,
          current_period_end: pmSub.attributes.next_billing_schedule ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('paymongo_subscription_id', pmSub.id)
      break
    }

    case 'subscription.past_due':
    case 'subscription.unpaid': {
      const pmSub = eventData as { id: string }
      const newStatus = eventType === 'subscription.unpaid' ? 'unpaid' : 'past_due'

      await admin
        .from('subscriptions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('paymongo_subscription_id', pmSub.id)

      logger.warn(`webhook: ${eventType}`, { subId: pmSub.id })
      break
    }

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
