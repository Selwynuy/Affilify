import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
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
