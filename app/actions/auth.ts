'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates/welcome'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
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

  const admin = createAdminClient()
  let page = 1
  let emailTaken = false

  while (!emailTaken) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (error) {
      return { error: 'Unable to verify email availability right now. Please try again.' }
    }

    emailTaken = data.users.some((user) => user.email?.toLowerCase() === email)

    if (emailTaken || !data.nextPage) {
      break
    }

    page = data.nextPage
  }

  if (emailTaken) {
    return { error: 'An account with that email already exists.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
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
    console.error('forgotPassword error (suppressed from user):', error.message)
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
