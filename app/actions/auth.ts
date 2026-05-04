'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates/welcome'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'
import { logger } from '@/lib/logger'
import { isWaitlistMode } from '@/lib/waitlist-mode'
import { grantStarterTokens } from '@/lib/billing/tokens'

// Beta tester starter grant. Image-only — video generation stays gated behind
// a paid topup or subscription (see /api/export). Sized for ~12 image gens
// (8 tokens each) — enough to evaluate quality, not enough to make the
// ₱99 Spark pack feel redundant for users who want to make videos.
const BETA_STARTER_TOKENS = 100

export async function login(formData: FormData) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const email = (formData.get('email') as string ?? '').trim().toLowerCase()

  // Rate limit: 10 attempts per IP per 15 minutes
  const rl = await rateLimit(`login:ip:${ip}`, { limit: 10, windowMs: 15 * 60_000 })
  if (!rl.allowed) {
    return { error: 'Too many login attempts. Please wait before trying again.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit: 5 signups per IP per hour
  const rl = await rateLimit(`signup:ip:${ip}`, { limit: 5, windowMs: 60 * 60_000 })
  if (!rl.allowed) {
    return { error: 'Too many signup attempts. Please wait before trying again.' }
  }

  const supabase = await createClient()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string
  const inviteTokenRaw = formData.get('inviteToken')
  const inviteToken = typeof inviteTokenRaw === 'string' ? inviteTokenRaw.trim() : ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!email) {
    return { error: 'Email is required.' }
  }
  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' }
  }

  // ── Waitlist gate ───────────────────────────────────────────────────────
  // When WAITLIST_MODE is on, only invited users can sign up. Validate the
  // invite token BEFORE creating the account — and bind the account to the
  // exact email on the invite (no reusing someone else's invite).
  let inviteRowId: string | null = null
  if (isWaitlistMode()) {
    if (!inviteToken) {
      return { error: 'Genetrify is currently invite-only. Join the waitlist to be notified when access opens.' }
    }
    if (!/^[a-f0-9]{16,}$/i.test(inviteToken)) {
      return { error: 'Invalid invite link.' }
    }

    const admin = createAdminClient()
    const { data: inviteRow } = await admin
      .from('waitlist')
      .select('id, email, claimed_at, invite_expires_at')
      .eq('invite_token', inviteToken)
      .maybeSingle()

    if (!inviteRow) return { error: 'Invite not found or has been revoked.' }
    if (inviteRow.claimed_at) return { error: 'This invite has already been used.' }
    if (
      inviteRow.invite_expires_at &&
      new Date(inviteRow.invite_expires_at).getTime() < Date.now()
    ) {
      return { error: 'This invite has expired. Please request a new one.' }
    }
    if (inviteRow.email.toLowerCase() !== email) {
      return { error: 'This invite was issued to a different email address.' }
    }

    inviteRowId = inviteRow.id as string
  }

  // signUp returns an obfuscated session when the email is already taken
  // (Supabase "prevent email enumeration" must be ON in Auth settings).
  // We no longer do a full user list scan — that was O(n) and leaked existence.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm`,
    },
  })

  if (error) {
    // Never reveal whether an email already exists
    logger.warn('signup error (suppressed from user)', { error: error.message })
    redirect(`/check-email?email=${encodeURIComponent(email)}`)
  }

  const newUserId = data.user?.id ?? null

  // Consume the invite — even if no immediate session, the account exists
  // so the invite is now spent. Fire-and-forget; failure to mark consumed
  // shouldn't block the user from logging in.
  if (inviteRowId) {
    try {
      const admin = createAdminClient()
      await admin
        .from('waitlist')
        .update({
          claimed_at: new Date().toISOString(),
          claimed_user_id: newUserId,
        })
        .eq('id', inviteRowId)
    } catch (err) {
      logger.error('Failed to mark waitlist invite as claimed', { inviteRowId, email }, err)
    }

    // Beta starter grant. Tied to the invite row id so the same invite can
    // never grant twice (grantStarterTokens is also idempotent on description).
    if (newUserId) {
      try {
        await grantStarterTokens(
          newUserId,
          BETA_STARTER_TOKENS,
          `Beta starter grant — invite ${inviteRowId}`,
        )
      } catch (err) {
        logger.error('Failed to grant beta starter tokens', { newUserId, inviteRowId }, err)
      }
    }
  }

  // Send welcome email (fire-and-forget — never block signup on email failure)
  if (data.session) {
    await Promise.allSettled([
      sendEmail({ to: email, ...welcomeEmail(email) }),
    ])

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  redirect(`/check-email?email=${encodeURIComponent(email)}`)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function forgotPassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate-limit IP before any DB or email work — this is unauthenticated.
  const rl = await rateLimit(`forgot:ip:${ip}`, RATE_LIMITS.authForgotPassword)
  if (!rl.allowed) {
    // Still return success to prevent enumeration: rate-limit hit looks
    // identical to "no such email" from the caller's perspective.
    return { success: true }
  }

  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://genetrify.com'

  // Supabase will send its own reset email unless you disable it in the dashboard.
  // We pass redirectTo so the magic link lands on our reset page.
  // To use only Resend emails: disable "Password Reset" in Supabase Auth > Email Templates,
  // then uncomment the Resend block below and remove the supabase call.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  if (error) {
    // Never reveal whether an email exists — return success regardless
    logger.warn('forgotPassword error (suppressed from user)', { error: error.message })
  }

  // Always return success to prevent email enumeration attacks
  return { success: true }
}

export async function resetPassword(formData: FormData): Promise<{ error?: string }> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
