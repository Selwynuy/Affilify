'use client'

import { useActionState } from 'react'
import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await forgotPassword(formData) ?? null
    },
    null
  )

  if (state?.success) {
    return (
      <div className="rounded-lg bg-brand-accent/10 border border-brand-accent/20 px-5 py-6 text-center">
        <p className="text-brand-accent font-semibold mb-1">Check your email</p>
        <p className="text-sm text-brand-text/60">
          If an account exists for that address, we&apos;ve sent a password reset link.
          Check your inbox (and spam folder).
        </p>
      </div>
    )
  }

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
          className="bg-brand-surface border-white/10 text-brand-text placeholder:text-brand-text/25 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 h-11 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#393E46] [&:-webkit-autofill]:[-webkit-text-fill-color:#EEEEEE]"
        />
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
            Sending…
          </span>
        ) : 'Send reset link'}
      </Button>
    </form>
  )
}
