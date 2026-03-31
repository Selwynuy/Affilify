import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates/welcome'

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return '/confirmed'
  }

  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') ?? 'email'
  const next = getSafeNext(searchParams.get('next'))
  const supabase = await createClient()

  let errorMessage: string | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    errorMessage = error?.message ?? null
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    errorMessage = error?.message ?? null
  } else {
    errorMessage = 'Missing confirmation token.'
  }

  if (errorMessage) {
    const errorUrl = new URL('/login', origin)
    errorUrl.searchParams.set('error', errorMessage)
    return NextResponse.redirect(errorUrl)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    const tpl = welcomeEmail(user.email)
    await sendEmail({ to: user.email, ...tpl })
  }

  return NextResponse.redirect(new URL(next, origin))
}
