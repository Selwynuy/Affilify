/**
 * POST /api/admin/waitlist/invite
 *
 * Generates a single-use invite token for a waitlist row, marks invited_at,
 * and sends the invite email via Resend.
 *
 * If the row already has a non-claimed token, this resends the email with
 * a fresh token + extended expiry (idempotent for "resend invite" UX).
 *
 * Body: { id: string }
 * Response: { ok: true, inviteUrl: string, expiresAt: string }
 */

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { waitlistInviteEmail } from '@/lib/email/templates/waitlist-invite'
import { sanitizeText, isUuid } from '@/lib/security'
import { logger } from '@/lib/logger'
import { SITE_URL } from '@/lib/seo'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

const INVITE_EXPIRY_DAYS = 14

function generateInviteToken(): string {
  // 32 bytes → 64 hex chars. URL-safe and unguessable.
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = await rateLimit(`waitlist-invite:admin:${user.id}`, RATE_LIMITS.adminMutate)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const id = sanitizeText((body as { id?: string })?.id, { maxLength: 100 })
  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: 'Invalid waitlist id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: row, error: fetchError } = await admin
    .from('waitlist')
    .select('id, email, claimed_at')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
  }

  if (row.claimed_at) {
    return NextResponse.json(
      { error: 'This waitlist entry has already been claimed.' },
      { status: 409 },
    )
  }

  const token = generateInviteToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const { error: updateError } = await admin
    .from('waitlist')
    .update({
      invited_at: now.toISOString(),
      invite_token: token,
      invite_expires_at: expiresAt.toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    logger.error('Failed to mark waitlist row as invited', { id, email: row.email }, updateError)
    return NextResponse.json({ error: 'Could not save invite token.' }, { status: 500 })
  }

  const inviteUrl = `${SITE_URL}/invite/${token}`
  const tpl = waitlistInviteEmail({
    email: row.email,
    inviteUrl,
    expiresInDays: INVITE_EXPIRY_DAYS,
  })

  await sendEmail({ to: row.email, ...tpl })

  logger.info('Waitlist invite sent', { id, email: row.email, expiresAt: expiresAt.toISOString() })

  return NextResponse.json({
    ok: true,
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
  })
}
