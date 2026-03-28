'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLANS, TOPUP_PACKS } from '@/lib/data/plans'
import { Button } from '@/components/ui/button'
import {
  Zap, CheckCircle2, ArrowRight, CreditCard, RefreshCw, AlertTriangle, Sparkles,
} from 'lucide-react'
import type { Plan, PlanId, Subscription } from '@/lib/types/billing'

interface BalanceData {
  balance: number
  planId: PlanId | null
  plan: Plan | null
  subscription: Subscription | null
}

const INTERVAL_LABELS = { monthly: 'Monthly', annual: 'Annual (2 months free)' } as const

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<BalanceData | null>(null)
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')
  const [isPending, startTransition] = useTransition()
  const [actionPending, setActionPending] = useState<string | null>(null)

  const successMsg = searchParams.get('subscribed') === 'success'
    ? 'Subscription activated! Your tokens have been credited.'
    : searchParams.get('topup') === 'success'
    ? 'Top-up successful! Tokens added to your balance.'
    : null

  useEffect(() => {
    fetch('/api/billing/balance')
      .then((r) => r.json())
      .then(setData)
  }, [])

  function handleCheckout(planId: PlanId) {
    setActionPending(planId)
    startTransition(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
      setActionPending(null)
    })
  }

  function handlePortal() {
    setActionPending('portal')
    startTransition(async () => {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
      setActionPending(null)
    })
  }

  function handleTopup(planId: PlanId) {
    setActionPending(`topup-${planId}`)
    startTransition(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topupPlanId: planId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
      setActionPending(null)
    })
  }

  const currentPlanId = data?.planId
  const balance = data?.balance ?? 0
  const plan = data?.plan
  const tokensPerMonth = plan?.tokensPerMonth ?? 0
  const usedPercent = tokensPerMonth > 0 ? Math.min(100, Math.round((1 - balance / tokensPerMonth) * 100)) : 0

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-white/50">Manage your plan, tokens, and payment details.</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400">{successMsg}</p>
        </div>
      )}

      {/* Current plan + token balance */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Plan card */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Current Plan</p>
              {currentPlanId && (
                <button
                  onClick={handlePortal}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
                >
                  <CreditCard className="w-3 h-3" />
                  Manage
                </button>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {plan?.name ?? 'No plan'}
              </p>
              {plan && (
                <p className="text-sm text-white/40">
                  ${((interval === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents) / 100).toFixed(0)}/mo
                  {data.subscription?.billingInterval === 'annual' ? ' · billed annually' : ' · billed monthly'}
                </p>
              )}
              {data.subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
                  <AlertTriangle className="w-3 h-3" />
                  Cancels at end of period
                </div>
              )}
              {data.subscription?.currentPeriodEnd && (
                <p className="text-xs text-white/30 mt-1">
                  Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            {!currentPlanId && (
              <p className="text-xs text-white/40">Subscribe below to start generating.</p>
            )}
          </div>

          {/* Token balance card */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-4">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Token Balance</p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">{balance.toLocaleString()}</p>
              <p className="text-sm text-white/40">
                {tokensPerMonth > 0 ? `of ${tokensPerMonth.toLocaleString()} monthly tokens` : 'tokens remaining'}
              </p>
            </div>
            {tokensPerMonth > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      usedPercent > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
                    )}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <p className="text-xs text-white/30">{usedPercent}% used this period</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top-up pack (only if subscribed) */}
      {currentPlanId && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Need more tokens?</p>
          <div className="flex flex-wrap gap-3">
            {(() => {
              const pack = TOPUP_PACKS.find((p) => p.planId === currentPlanId)
              if (!pack) return null
              return (
                <button
                  key={pack.planId}
                  onClick={() => handleTopup(pack.planId)}
                  disabled={isPending}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 hover:border-violet-500/40 hover:bg-violet-500/5 px-4 py-3 transition-all"
                >
                  <Zap className="w-4 h-4 text-violet-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">+1,000 tokens</p>
                    <p className="text-xs text-white/40">${(pack.priceCents / 100).toFixed(0)} one-time</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/30 ml-2" />
                </button>
              )
            })()}
          </div>
        </div>
      )}

      {/* Plan selector */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {currentPlanId ? 'Change Plan' : 'Choose a Plan'}
          </p>
          {/* Billing interval toggle */}
          <div className="flex gap-1 p-1 bg-white/5 border border-white/8 rounded-lg">
            {(['monthly', 'annual'] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  interval === i ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white',
                )}
              >
                {INTERVAL_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            const price = interval === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents
            const isPopular = plan.id === 'growth'

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-5 space-y-5 transition-all',
                  isCurrent
                    ? 'border-violet-500 bg-violet-500/5'
                    : isPopular
                    ? 'border-fuchsia-500/40 bg-white/[0.03]'
                    : 'border-white/8 bg-white/[0.03]',
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[10px] font-semibold text-white whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-[10px] font-semibold text-white">
                    Current
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="text-2xl font-bold text-white">
                    ${(price / 100).toFixed(0)}
                    <span className="text-sm font-normal text-white/40">/mo</span>
                  </p>
                  {interval === 'annual' && (
                    <p className="text-[10px] text-emerald-400">2 months free</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                      <Sparkles className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent || isPending || actionPending === plan.id}
                  className={cn(
                    'w-full h-9 rounded-xl font-semibold text-sm transition-all',
                    isCurrent
                      ? 'bg-white/5 text-white/30 cursor-default'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20',
                  )}
                >
                  {actionPending === plan.id ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Redirecting…
                    </span>
                  ) : isCurrent ? 'Current plan' : 'Subscribe'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
