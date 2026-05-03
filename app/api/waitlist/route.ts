/**
 * POST /api/waitlist
 *
 * Public endpoint that captures email signups from the landing page hero.
 * Rate-limited per IP (5/hr). Inserts into the `waitlist` table via the
 * service role (RLS blocks anon writes by design).
 *
 * Body: { email: string, source?: string }
 * Response: { ok: true, alreadyOnList?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'
import { sanitizeText } from '@/lib/security'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email/resend'
import { waitlistConfirmationEmail } from '@/lib/email/templates/waitlist-confirmation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  const rl = await rateLimit(`waitlist:ip:${ip}`, RATE_LIMITS.waitlistSignup)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many signups from this network. Please try again later.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = body as { email?: string; source?: string }
  const email = sanitizeText(data?.email, { maxLength: 200 }).toLowerCase()
  const source = sanitizeText(data?.source, { maxLength: 60 }) || 'landing_hero'

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null

  const admin = createAdminClient()
  const { data: inserted, error } = await admin
    .from('waitlist')
    .insert({
      email,
      source,
      ip,
      user_agent: userAgent,
    })
    .select('id')
    .single()

  if (error) {
    // Treat unique-violation as success — user already on the list.
    // Don't resend the confirmation email; they got it on the first signup.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, alreadyOnList: true })
    }
    logger.error('Waitlist insert failed', { email, source }, error)
    return NextResponse.json({ error: 'Could not save your email. Please try again.' }, { status: 500 })
  }

  logger.info('Waitlist signup', { email, source })

  // Fire-and-forget confirmation email. sendEmail() never throws; it logs
  // its own failures so the API response stays clean either way.
  const tpl = waitlistConfirmationEmail(email)
  await sendEmail({ to: email, ...tpl })

  // Mark the row as "email sent" so we can audit deliveries later.
  if (inserted?.id) {
    await admin
      .from('waitlist')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', inserted.id)
  }

  return NextResponse.json({ ok: true, alreadyOnList: false })
}
