import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  path: '/forgot-password',
  title: 'Reset your password',
  description: 'Send yourself a Genetrify password reset link.',
})

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-text uppercase leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Reset Password</h2>
        <p className="text-brand-text/40 mt-2 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-sm text-brand-text/30 text-center">
        Remembered it?{' '}
        <Link href="/login" className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
