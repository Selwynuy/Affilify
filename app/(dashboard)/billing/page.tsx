'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLANS, TOPUP_PACKS } from '@/lib/data/plans'
import { Button } from '@/components/ui/button'
import {
  Zap, CheckCircle2, ArrowRight, RefreshCw, AlertTriangle, Sparkles, XCircle,
} from 'lucide-react'
import type { Plan, PlanId, Subscription } from '@/lib/types/billing'

interface BalanceData {
  balance: number
  planId: PlanId | null
  plan: Plan | null
  subscription: Subscription | null
}

/** Format PHP centavos → "₱1,099" */
function phpFormat(centavos: number): string {
  return '₱' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<BalanceData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

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
        body: JSON.stringify({ planId }),
      })
      const json = await res.json()
      // Redirect to PayMongo card-entry / 3DS page
      if (json.nextActionUrl) {
        window.location.href = json.nextActionUrl
      } else if (json.error) {
        alert(json.error)
      }
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
      const json = await res.json()
      // Top-up uses PayMongo.js client_key — for now open PayMongo checkout URL
      if (json.nextActionUrl) {
        window.location.href = json.nextActionUrl
      } else if (json.error) {
        alert(json.error)
      }
      setActionPending(null)
    })
  }

  function handleCancel() {
    setActionPending('cancel')
    startTransition(async () => {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setCancelDone(true)
        setCancelConfirm(false)
        // Refresh balance data
        fetch('/api/billing/balance').then((r) => r.json()).then(setData)
      } else {
        alert(json.error ?? 'Failed to cancel subscription')
      }
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
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Account</p>
        <h1 className="text-[32px] font-black uppercase text-brand-text leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Billing</h1>
        <p className="text-sm text-brand-text/40">Manage your plan, tokens, and payment details.</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400">{successMsg}</p>
        </div>
      )}

      {/* Cancel success banner */}
      {cancelDone && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">Subscription will cancel at the end of the current billing period.</p>
        </div>
      )}

      {/* Current plan + token balance */}
      {!data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          <div className="rounded-2xl border border-white/[0.07] bg-brand-surface p-5 space-y-4">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-7 w-32 rounded bg-white/5" />
            <div className="h-3 w-40 rounded bg-white/5" />
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-brand-surface p-5 space-y-4">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-7 w-20 rounded bg-white/5" />
            <div className="h-2 w-full rounded-full bg-white/5" />
          </div>
        </div>
      )}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Plan card */}
          <div className="rounded-2xl border border-white/[0.07] bg-brand-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Current Plan</p>
              {currentPlanId && !cancelDone && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors"
                >
                  Cancel plan
                </button>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">{plan?.name ?? 'No plan'}</p>
              {plan && (
                <p className="text-sm text-white/40">
                  {phpFormat(plan.monthlyPriceCentavos)}/mo · billed monthly
                </p>
              )}
              {data.subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
                  <AlertTriangle className="w-3 h-3" />
                  Cancels at end of billing period
                </div>
              )}
              {data.subscription?.currentPeriodEnd && (
                <p className="text-xs text-white/30 mt-1">
                  {data.subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews'}{' '}
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            {!currentPlanId && (
              <p className="text-xs text-white/40">Subscribe below to start generating.</p>
            )}

            {/* Cancel confirmation inline */}
            {cancelConfirm && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">
                    Your subscription will remain active until the end of the current period. No refunds are issued for partial months.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="h-8 px-3 text-xs bg-red-600/80 hover:bg-red-600 text-white rounded-lg"
                  >
                    {actionPending === 'cancel' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Confirm cancel'}
                  </Button>
                  <Button
                    onClick={() => setCancelConfirm(false)}
                    className="h-8 px-3 text-xs bg-white/5 hover:bg-white/10 text-white/60 rounded-lg"
                  >
                    Keep plan
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Token balance card */}
          <div className="rounded-2xl border border-white/[0.07] bg-brand-surface p-5 space-y-4">
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
                      usedPercent > 80 ? 'bg-amber-500' : 'bg-brand-accent',
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
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-brand-surface hover:border-brand-accent/40 hover:bg-brand-accent/5 px-4 py-3 transition-all"
                >
                  <Zap className="w-4 h-4 text-brand-accent shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">+1,000 tokens</p>
                    <p className="text-xs text-white/40">{phpFormat(pack.priceCentavos)} one-time</p>
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
          <p className="text-xs text-white/30">Billed monthly · PHP pricing</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            const isPopular = plan.id === 'growth'

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-5 space-y-5 transition-all',
                  isCurrent
                    ? 'border-brand-accent bg-brand-accent/5'
                    : isPopular
                    ? 'border-brand-accent/40 bg-brand-surface'
                    : 'border-white/[0.07] bg-brand-surface',
                )}
              >
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full bg-brand-accent text-[10px] font-semibold text-brand-bg whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-accent text-[10px] font-semibold text-brand-bg">
                    Current
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="text-2xl font-bold text-white">
                    {phpFormat(plan.monthlyPriceCentavos)}
                    <span className="text-sm font-normal text-white/40">/mo</span>
                  </p>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                      <Sparkles className="w-3 h-3 text-brand-accent shrink-0 mt-0.5" />
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
                      : 'bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-bold shadow-lg shadow-brand-accent/20',
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

        <p className="text-xs text-white/20 text-center">
          Payments processed securely by PayMongo · Card and Maya accepted · Cancel anytime
        </p>
      </div>
    </div>
  )
}
