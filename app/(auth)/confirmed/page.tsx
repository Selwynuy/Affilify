import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  path: '/confirmed',
  title: 'Email confirmed',
  description: 'Your Genetrify account is now active.',
  noIndex: true,
})

export default function ConfirmedPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-text uppercase leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Email Confirmed</h2>
        <p className="text-brand-text/40 mt-2 text-sm">
          Your account is now active.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/8 px-5 py-4">
        <p className="text-sm text-brand-text/80">
          You can continue to your dashboard now.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-accent px-4 text-sm font-bold uppercase tracking-wide text-brand-bg shadow-lg shadow-brand-accent/20 transition-all hover:bg-brand-accent-hover"
      >
        Open dashboard
      </Link>
    </div>
  )
}
