import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage(props: PageProps<'/login'>) {
  const { error } = await props.searchParams
  const errorMessage = typeof error === 'string' ? error : null

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-text uppercase leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Welcome Back</h2>
        <p className="text-brand-text/40 mt-2 text-sm">Sign in to continue creating videos</p>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      <LoginForm />

      <p className="mt-6 text-sm text-brand-text/30 text-center">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors">
          Create one free
        </Link>
      </p>
    </div>
  )
}
