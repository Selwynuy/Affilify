import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, AlertTriangle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteSignupForm } from './_components/invite-signup-form'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  path: '/invite',
  title: 'Claim your invite',
  description: 'Finish creating your Genetrify account.',
  noIndex: true,
})

interface InviteRow {
  id: string
  email: string
  invite_token: string
  invite_expires_at: string | null
  claimed_at: string | null
}

async function loadInvite(token: string): Promise<
  | { ok: true; row: InviteRow }
  | { ok: false; reason: 'not_found' | 'expired' | 'claimed' }
> {
  if (!token || token.length < 16 || !/^[a-f0-9]+$/i.test(token)) {
    return { ok: false, reason: 'not_found' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('waitlist')
    .select('id, email, invite_token, invite_expires_at, claimed_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (error || !data) return { ok: false, reason: 'not_found' }

  const row = data as InviteRow
  if (row.claimed_at) return { ok: false, reason: 'claimed' }

  if (row.invite_expires_at && new Date(row.invite_expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, row }
}

export default async function InviteRedemptionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // If the user is already signed in, send them to the dashboard.
  // (They probably clicked an old invite from the same email.)
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const result = await loadInvite(token)

  if (!result.ok) {
    return <InviteError reason={result.reason} />
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 mb-4 rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-[11px] font-semibold text-brand-accent uppercase tracking-widest">
          <Mail className="w-3 h-3" />
          You&rsquo;re invited
        </span>
        <h2
          className="text-3xl font-black text-brand-text uppercase leading-[0.85]"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
        >
          Claim your spot
        </h2>
        <p className="text-brand-text/40 mt-2 text-sm">
          Set a password to finish creating your Genetrify account.
        </p>
      </div>

      <InviteSignupForm email={result.row.email} token={result.row.invite_token} />

      <p className="mt-6 text-sm text-brand-text/30 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

function InviteError({ reason }: { reason: 'not_found' | 'expired' | 'claimed' }) {
  const copy = {
    not_found: {
      title: 'Invite not found',
      message:
        "This invite link isn't valid. It may have been mistyped, or it was never issued.",
    },
    expired: {
      title: 'Invite expired',
      message:
        'This invite has expired. Reply to your invite email and we can issue a new one.',
    },
    claimed: {
      title: 'Already claimed',
      message:
        "This invite has already been used. If you're the original recipient, just sign in below.",
    },
  }[reason]

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
        <AlertTriangle className="h-5 w-5 text-amber-300" />
      </div>
      <h2
        className="text-3xl font-black text-brand-text uppercase leading-[0.85]"
        style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
      >
        {copy.title}
      </h2>
      <p className="text-brand-text/55 mt-3 text-sm leading-relaxed">{copy.message}</p>

      <div className="mt-6 flex flex-col gap-2">
        {reason === 'claimed' ? (
          <Link
            href="/login"
            className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-brand-bg transition-colors hover:bg-brand-accent-hover"
          >
            Sign in
          </Link>
        ) : (
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-brand-text/80 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
          >
            Back to homepage
          </Link>
        )}
      </div>
    </div>
  )
}
