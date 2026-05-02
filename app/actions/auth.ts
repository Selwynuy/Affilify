'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates/welcome'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'
import { logger } from '@/lib/logger'

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
