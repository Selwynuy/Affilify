'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotify } from '@/components/feedback/use-notify'
import { Eye, EyeOff } from 'lucide-react'

export function SignupForm() {
  const notify = useNotify()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await signup(formData)
      if (result?.error) {
        setPassword('')
        setConfirm('')
      }
      return result ?? null
    },
    null
  )

  useEffect(() => {
    if (state?.error) {
      notify.error({ title: 'Signup failed', description: state.error })
    }
  }, [notify, state?.error])

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-brand-text/60 text-sm font-medium">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-brand-surface border-white/10 text-brand-text placeholder:text-brand-text/25 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 h-11 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#393E46] [&:-webkit-autofill]:[-webkit-text-fill-color:#EEEEEE]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-brand-text/60 text-sm font-medium">Password</Label>
          <span className="text-xs text-brand-text/25">At least 8 characters</span>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-brand-surface border-white/10 text-brand-text placeholder:text-brand-text/25 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 h-11 pr-11 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#393E46] [&:-webkit-autofill]:[-webkit-text-fill-color:#EEEEEE]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-brand-text/30 hover:text-brand-text/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-brand-text/60 text-sm font-medium">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirm"
            name="confirm"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-brand-surface border-white/10 text-brand-text placeholder:text-brand-text/25 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 h-11 pr-11 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#393E46] [&:-webkit-autofill]:[-webkit-text-fill-color:#EEEEEE]"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-brand-text/30 hover:text-brand-text/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-bold uppercase tracking-wide shadow-lg shadow-brand-accent/20 transition-all disabled:opacity-60"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Creating account...
          </span>
        ) : 'Create account'}
      </Button>

      <p className="text-xs text-brand-text/25 text-center">
        By creating an account you agree to our{' '}
        <Link href="/terms" className="text-brand-text/40 underline underline-offset-4 transition-colors hover:text-brand-text">
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-brand-text/40 underline underline-offset-4 transition-colors hover:text-brand-text">
          Privacy Policy
        </Link>
      </p>
    </form>
  )
}
