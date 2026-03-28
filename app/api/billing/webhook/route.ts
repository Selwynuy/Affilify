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
 *   - payment.paid  (for one-time top-ups)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, getSubscription } from '@/lib/billing/paymongo'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantMonthlyTokens } from '@/lib/billing/tokens'
import type { PlanId } from '@/lib/types/billing'
import { logger } from '@/lib/logger'

const VALID_PLAN_IDS: readonly PlanId[] = ['starter', 'growth', 'pro', 'business']

function parsePlanId(value: string | undefined): PlanId | null {
  if (!value || !(VALID_PLAN_IDS as readonly string[]).includes(value)) return null
  return value as PlanId
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
  const admin = createAdminClient()

  switch (eventType) {
    // ── Subscription invoice paid (new sub activated or renewal) ──────────────
    case 'subscription.invoice.paid': {
      const invoice = eventData as {
        id: string
        attributes: {
          subscription_id: string
          amount: number
          billing_date: string
        }
      }

      const subId = invoice.attributes.subscription_id
      if (!subId) break

      // Fetch full subscription to get metadata / plan info
      let pmSub
      try {
        pmSub = await getSubscription(subId)
      } catch (err) {
        logger.error('webhook: failed to fetch subscription', { subId }, err)
        break
      }

      // Resolve userId from our DB via paymongo_subscription_id
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

      const nextBilling = pmSub.attributes.next_billing_schedule

      await admin.from('subscriptions').upsert({
        user_id: subRow.user_id,
        plan_id: planId,
        status: 'active',
        paymongo_subscription_id: subId,
        paymongo_customer_id: pmSub.attributes.customer_id,
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: nextBilling ?? null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      await grantMonthlyTokens(subRow.user_id, planId)
      logger.info('subscription.invoice.paid: tokens granted', { userId: subRow.user_id, planId })
      break
    }

    // ── Invoice payment failed ─────────────────────────────────────────────────
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

    // ── Subscription updated (upgrade / downgrade / cancel scheduled) ──────────
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

    // ── Subscription past_due / unpaid (all retries exhausted) ────────────────
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

    // ── One-time payment paid (top-up) ─────────────────────────────────────────
    case 'payment.paid': {
      const payment = eventData as {
        id: string
        attributes: {
          status: string
          metadata: Record<string, string>
        }
      }

      const meta = payment.attributes.metadata ?? {}
      if (meta.type !== 'topup') break

      const userId = meta.userId
      const tokens = parseInt(meta.tokens ?? '0')
      const planId = meta.planId

      if (!userId || !tokens) {
        logger.error('payment.paid topup: missing metadata', { paymentId: payment.id })
        break
      }

      await admin.from('token_ledger').insert({
        user_id: userId,
        amount: tokens,
        type: 'topup',
        description: `Top-up — 1,000 tokens (${planId} rate)`,
      })

      logger.info('payment.paid: top-up tokens granted', { userId, tokens })
      break
    }

    default:
      // Unhandled event — acknowledge and move on
      break
  }

  return NextResponse.json({ received: true })
}
