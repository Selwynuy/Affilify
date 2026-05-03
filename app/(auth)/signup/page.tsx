import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import { SignupForm } from '@/components/auth/signup-form'
import { pageMetadata } from '@/lib/seo'
import { isWaitlistMode } from '@/lib/waitlist-mode'

export const metadata = pageMetadata({
  path: '/signup',
  title: 'Create your account',
  description: 'Create a free Genetrify account and start generating AI fashion model photography and TikTok-ready videos.',
})

export default function SignupPage() {
  if (isWaitlistMode()) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="inline-flex items-center gap-2 mb-5 rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-[11px] font-semibold text-brand-accent uppercase tracking-widest">
          <Mail className="w-3 h-3" />
          Currently invite-only
        </span>

        <h2
          className="text-3xl font-black text-brand-text uppercase leading-[0.85]"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
        >
          Public signups are closed.
        </h2>

        <p className="text-brand-text/55 mt-3 text-sm leading-relaxed">
          Genetrify is in early access. Join the waitlist and we&rsquo;ll
          email you a private invite when your spot opens up.
        </p>

        <div className="mt-7 flex flex-col gap-2">
          <Link
            href="/#top"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-accent px-5 py-3 text-sm font-bold uppercase tracking-wider text-brand-bg transition-colors hover:bg-brand-accent-hover"
          >
            Join the waitlist
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-brand-text/80 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
          >
            I already have an account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-text uppercase leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Create Your Account</h2>
        <p className="text-brand-text/40 mt-2 text-sm">Start generating affiliate videos for free</p>
      </div>

      <SignupForm />

      <p className="mt-6 text-sm text-brand-text/30 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
