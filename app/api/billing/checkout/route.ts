/**
 * POST /api/billing/checkout
 *
 * Creates a QRPH payment for a credit pack purchase.
 * Server-side flow: PaymentIntent -> QRPH PaymentMethod -> attach -> return QR code.
 *
 * Subscriptions are disabled. Only credit pack purchases are accepted.
 *
 * Body: { packId: 'trial' | 'basic' | 'creator' | 'studio' }
 *
 * Response: { qrCode: string (base64 PNG), intentId: string, tokens: number, amountCentavos: number, packName: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent, createQRPHPaymentMethod, attachQRPHPaymentMethod } from '@/lib/billing/paymongo'
import { createBillingPayment } from '@/lib/billing/payments'
import { getCreditPack } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import { sanitizeText, verifySameOrigin } from '@/lib/security'

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 checkout attempts per user per 10 minutes
  const rl = await rateLimit(`checkout:${user.id}`, { limit: 5, windowMs: 10 * 60_000 })
  if (!rl.allowed) {
    logger.warn('Rate limit hit on /api/billing/checkout', { userId: user.id })
    return NextResponse.json(
      { error: 'Too many payment requests. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }
  if (!user.email) return NextResponse.json({ error: 'Account email is required for billing' }, { status: 400 })

  const body = await req.json()
  const packId = sanitizeText(body?.packId, { maxLength: 20 })

  if (!packId) {
    return NextResponse.json({ error: 'packId is required' }, { status: 400 })
  }

  const pack = getCreditPack(packId)
  if (!pack) {
    return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
  }

  try {
    // Idempotency key: user + pack + 10-minute window prevents duplicate intents on retries
    const windowKey = Math.floor(Date.now() / (10 * 60_000))
    const idempotencyKey = `topup-${user.id}-${pack.id}-${windowKey}`

    const intent = await createPaymentIntent(
      pack.priceCentavos,
      `Genetrify ${pack.name} pack - ${pack.tokens.toLocaleString()} tokens`,
      {
        userId: user.id,
        type: 'topup',
        packId: pack.id,
        packName: pack.name,
        tokens: String(pack.tokens),
        amountCentavos: String(pack.priceCentavos),
      },
      idempotencyKey,
    )

    await createBillingPayment({
      userId: user.id,
      email: user.email,
      packId: pack.id,
      packName: pack.name,
      tokens: pack.tokens,
      amountCentavos: pack.priceCentavos,
      paymentIntentId: intent.id,
    })

    const name = user.email.split('@')[0] ?? 'User'
    const paymentMethod = await createQRPHPaymentMethod(user.email, name)
    const attached = await attachQRPHPaymentMethod(intent.id, intent.attributes.client_key, paymentMethod.id)

    const qrCode = attached.attributes.next_action?.code?.image_url ?? null
    if (!qrCode) {
      logger.error('QRPH attach returned no QR code', { userId: user.id, intentId: intent.id })
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
    }

    return NextResponse.json({
      qrCode,
      intentId: intent.id,
      tokens: pack.tokens,
      amountCentavos: pack.priceCentavos,
      packName: pack.name,
    })
  } catch (err) {
    logger.error('QRPH checkout failed', { userId: user.id, packId }, err)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
