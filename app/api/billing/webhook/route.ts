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
import { verifyWebhookSignature } from '@/lib/billing/paymongo'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTokenBalance } from '@/lib/billing/tokens'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email/resend'
import { topupConfirmedEmail } from '@/lib/email/templates/topup-confirmed'
import { getCreditPack } from '@/lib/data/plans'

/** Look up a user's email via the admin auth API. Returns null on failure. */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

/** Format centavo amount to PHP string e.g. "₱1,099.00" */
function formatPHP(centavos: number): string {
  return '₱' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

/** Format ISO date string to readable e.g. "April 29, 2026" */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
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
    // ── Subscription events — disabled, no-op ─────────────────────────────────
    case 'subscription.invoice.paid':
    case 'subscription.invoice.payment_failed':
    case 'subscription.updated':
    case 'subscription.past_due':
    case 'subscription.unpaid':
      logger.warn(`webhook: subscription event received while subscriptions are disabled (${eventType})`)
      break

    // ── One-time payment paid (credit pack purchase) ───────────────────────────
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
      const packId = meta.packId
      const pack = packId ? getCreditPack(packId) : undefined
      const packName = pack?.name ?? meta.packName ?? 'Credit pack'

      if (!userId || !tokens) {
        logger.error('payment.paid topup: missing metadata', { paymentId: payment.id })
        break
      }

      await admin.from('token_ledger').insert({
        user_id: userId,
        amount: tokens,
        type: 'topup',
        description: `${packName} pack — ${tokens.toLocaleString()} tokens`,
      })

      logger.info('payment.paid: credit pack tokens granted', { userId, tokens, packId })

      // Send top-up confirmation email
      const topupEmail = await getUserEmail(userId)
      if (topupEmail) {
        const newBalance = await getTokenBalance(userId)
        const amountCentavos = parseInt(meta.amountCentavos ?? '0')
        const tpl = topupConfirmedEmail({
          email: topupEmail,
          tokens,
          amountPaid: amountCentavos ? formatPHP(amountCentavos) : '—',
          newBalance,
        })
        await sendEmail({ to: topupEmail, ...tpl })
      }
      break
    }

    default:
      // Unhandled event — acknowledge and move on
      break
  }

  return NextResponse.json({ received: true })
}
