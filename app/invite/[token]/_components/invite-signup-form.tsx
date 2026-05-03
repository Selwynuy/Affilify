'use client'

import { useActionState, useEffect, useState } from 'react'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotify } from '@/components/feedback/use-notify'
import { Eye, EyeOff, Lock } from 'lucide-react'

interface Props {
  email: string
  token: string
}

export function InviteSignupForm({ email, token }: Props) {
  const notify = useNotify()
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
    null,
  )

  useEffect(() => {
    if (state?.error) notify.error({ title: 'Signup failed', description: state.error })
  }, [notify, state?.error])

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="inviteToken" value={token} />

      <div className="space-y-2">
        <Label htmlFor="email" className="text-brand-text/60 text-sm font-medium">
          Email
        </Label>
        <div className="relative">
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            readOnly
            required
            className="bg-brand-surface/60 border-white/10 text-brand-text/80 h-11 cursor-not-allowed pr-10"
          />
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-text/30" />
        </div>
        <p className="text-[11px] text-brand-text/35">
          This account is tied to your invite. To use a different email, request a new invite.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-brand-text/60 text-sm font-medium">
            Password
          </Label>
          <span className="text-xs text-brand-text/25">At least 8 characters</span>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-brand-surface border-white/10 text-brand-text placeholder:text-brand-text/25 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-brand-text/30 hover:text-brand-text/70 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-brand-text/60 text-sm font-medium">
          Confirm password
        </Label>
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
            className="bg-brand-surface border-white/10 text-brand-text placeholder:text-brand-text/25 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-brand-text/30 hover:text-brand-text/70 transition-colors"
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
        {pending ? 'Creating account…' : 'Claim my spot'}
      </Button>
    </form>
  )
}
