'use client'

import { useState, useTransition, useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CREDIT_PACKS, PLANS } from '@/lib/data/plans'
import { Button } from '@/components/ui/button'
import { useNotify } from '@/components/feedback/use-notify'
import { CheckCircle2, Check, X, RefreshCw, Clock } from 'lucide-react'
import type { CreditPack, PlanId, Subscription } from '@/lib/types/billing'

interface BalanceData {
  balance: number
  planId: PlanId | null
  subscription: Subscription | null
  billingControls?: {
    subscriptionsEnabled: boolean
    topupsEnabled: boolean
    topupMessage: string | null
    subscriptionMessage: string | null
    capacity: {
      maxFundedTokens: number | null
      outstandingTokens: number
    }
  } | null
}

interface PaymentStatusResult {
  paid: boolean
  status?: string
  balance?: number
  error?: string
}

function phpFormat(centavos: number): string {
  return 'P' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatBillingDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Short blurbs under each monthly tier (reference-style pricing cards). */
const PLAN_TAGLINES: Partial<Record<PlanId, string>> = {
  starter: 'For individuals getting started with virtual photoshoots.',
  growth: 'For creators who need more monthly tokens and rollover.',
  pro: 'For teams that need maximum volume, storage, and rollover.',
}

/** Middle tier: accent border + primary CTA (matches dashboard GeneratePanel pattern). */
const SUBSCRIPTION_FEATURED_PLAN_ID: PlanId = 'growth'

function FeatureCheck({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-brand-text/70">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-accent/35 bg-brand-accent/10">
        <Check className="h-2.5 w-2.5 text-brand-accent" strokeWidth={2.5} />
      </span>
      <span>{children}</span>
    </li>
  )
}

interface QRModalProps {
  qrCode: string
  intentId: string
  tokens: number
  amountCentavos: number
  packName: string
  onClose: () => void
  onRefresh: (intentId: string) => Promise<PaymentStatusResult>
}

const QR_EXPIRY_SECONDS = 1800

function QRModal({ qrCode, intentId, tokens, amountCentavos, packName, onClose, onRefresh }: QRModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  async function handleConfirmedCancel() {
    setCancelling(true)
    try {
      await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId }),
      })
    } finally {
      setCancelling(false)
      onClose()
    }
  }

  const [refreshing, setRefreshing] = useState(false)
  const [paid, setPaid] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const checkStatusRef = useRef<((silent?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  const expired = secondsLeft === 0

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timerLabel = `${mins}:${secs.toString().padStart(2, '0')}`

  async function checkStatus(silent = false) {
    if (!silent) setRefreshing(true)
    const result = await onRefresh(intentId)
    if (!silent) setRefreshing(false)

    if (result.paid) {
      setPaid(true)
      setStatusNote(null)
      return
    }

    if (!silent) {
      setStatusNote(
        result.status === 'expired'
          ? 'This QR code has expired. Generate a new one to continue.'
          : result.error ?? 'Payment not confirmed yet. Complete the payment, then check again.',
      )
    }
  }

  useEffect(() => {
    checkStatusRef.current = checkStatus
  })

  useEffect(() => {
    if (expired || paid) return

    const poll = setInterval(() => {
      void checkStatusRef.current?.(true)
    }, 10000)

    return () => clearInterval(poll)
  }, [expired, paid])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-brand-surface shadow-2xl shadow-black/50">
        <button
          onClick={() => (paid || expired) ? onClose() : setConfirmingCancel(true)}
          className="absolute right-4 top-4 text-brand-text/35 hover:text-brand-text/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-text/35">Scan to pay</p>
            <h2 className="text-xl font-bold text-brand-text">{packName} Pack</h2>
            <p className="text-sm text-brand-text/50">{tokens.toLocaleString()} tokens · {phpFormat(amountCentavos)}</p>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">Payment received!</p>
              <p className="text-xs text-brand-text/45 text-center">Your tokens have been added. Close this window to continue.</p>
              <Button onClick={onClose} className="mt-2 h-9 px-6 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-bold text-sm">
                Done
              </Button>
            </div>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Clock className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-medium text-amber-400">QR code expired</p>
              <p className="text-xs text-brand-text/45 text-center">Generate a new one to continue.</p>
              <Button onClick={onClose} className="mt-2 h-9 px-5 rounded-xl border border-white/10 bg-white/[0.06] text-brand-text hover:bg-white/10 text-sm">
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QRPH payment QR code" className="w-48 h-48 object-contain" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-brand-text/45">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in <span className={cn('font-mono font-semibold', secondsLeft < 120 ? 'text-amber-400' : 'text-brand-text/60')}>{timerLabel}</span></span>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 space-y-1">
                <p className="text-xs text-brand-text/45 leading-relaxed">
                  Open your banking app (BPI, BDO, GCash, Maya, etc.), scan this QR code, and complete the payment. We only mark this as paid after the server confirms it.
                </p>
              </div>

              {statusNote && (
                <p className="text-xs text-center text-brand-text/45">{statusNote}</p>
              )}

              <Button
                onClick={() => void checkStatus()}
                disabled={refreshing}
                className="w-full h-10 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-bold text-sm"
              >
                {refreshing
                  ? <span className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...</span>
                  : 'Check payment status'
                }
              </Button>

              {confirmingCancel ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 space-y-3">
                  <p className="text-xs text-brand-text/55 text-center">Cancel this payment? The QR code will no longer be valid.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingCancel(false)}
                      disabled={cancelling}
                      className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs text-brand-text/50 hover:text-brand-text/80 transition-colors disabled:opacity-50"
                    >
                      Keep waiting
                    </button>
                    <button
                      onClick={() => void handleConfirmedCancel()}
                      disabled={cancelling}
                      className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="w-full text-center text-xs text-brand-text/35 hover:text-brand-text/60 transition-colors py-1"
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function BillingPageClient({ initialData }: { initialData: BalanceData }) {
  const notify = useNotify()
  const [balance, setBalance] = useState(initialData.balance ?? 0)
  const [planId, setPlanId] = useState<PlanId | null>(initialData.planId ?? null)
  const [subscription, setSubscription] = useState<Subscription | null>(initialData.subscription ?? null)
  const [billingControls, setBillingControls] = useState(initialData.billingControls ?? null)
  const [isPending, startTransition] = useTransition()
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [qrData, setQrData] = useState<{
    qrCode: string
    intentId: string
    tokens: number
    amountCentavos: number
    packName: string
  } | null>(null)

  async function refreshBalance() {
    const res = await fetch('/api/billing/balance')
    const json = await res.json()
    setBalance(json.balance ?? 0)
    setPlanId(json.planId ?? null)
    setSubscription(json.subscription ?? null)
    setBillingControls(json.billingControls ?? null)
  }

  async function refreshPayment(intentId: string): Promise<PaymentStatusResult> {
    const res = await fetch(`/api/billing/status?intentId=${encodeURIComponent(intentId)}`)
    const json = await res.json()
    if (typeof json.balance === 'number') {
      setBalance(json.balance)
    }
    return json as PaymentStatusResult
  }

  function handleBuyPack(pack: CreditPack) {
    if (billingControls && !billingControls.topupsEnabled) {
      notify.error({
        title: 'Top-ups unavailable',
        description: billingControls.topupMessage ?? 'Token top-ups are temporarily unavailable.',
      })
      return
    }

    setActionPending(pack.id)
    startTransition(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      })
      const json = await res.json()
      if (json.qrCode) {
        setQrData({
          qrCode: json.qrCode,
          intentId: json.intentId,
          tokens: json.tokens,
          amountCentavos: json.amountCentavos,
          packName: json.packName,
        })
      } else {
        notify.error({
          title: 'Checkout failed',
          description: json.error ?? 'Failed to generate QR code. Please try again.',
        })
      }
      setActionPending(null)
    })
  }

  function handleStartPlan(planId: PlanId) {
    if (billingControls && !billingControls.subscriptionsEnabled) {
      notify.error({
        title: 'Plans unavailable',
        description: billingControls.subscriptionMessage ?? 'Plans are temporarily unavailable.',
      })
      return
    }

    setActionPending(`plan-${planId}`)
    startTransition(async () => {
      const res = await fetch('/api/billing/plan-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const json = await res.json()
      if (json.qrCode) {
        setQrData({
          qrCode: json.qrCode,
          intentId: json.intentId,
          tokens: json.tokens,
          amountCentavos: json.amountCentavos,
          packName: `${json.planName} plan (30 days)`,
        })
      } else {
        notify.error({
          title: 'Checkout failed',
          description: json.error ?? 'Failed to start plan checkout. Please try again.',
        })
      }
      setActionPending(null)
    })
  }

  function handleCancelPlan() {
    setActionPending('cancel-plan')
    startTransition(async () => {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        notify.error({
          title: 'Could not update subscription',
          description: json.error ?? 'Failed to schedule cancellation. Please try again.',
        })
        setActionPending(null)
        return
      }

      notify.success({
        title: 'Cancellation scheduled',
        description: json.nextBillingDate
          ? `Your plan stays active until ${formatBillingDate(json.nextBillingDate) ?? 'the end of this period'}.`
          : 'Your plan stays active through the end of the current billing period.',
      })

      await refreshBalance()
      setActionPending(null)
    })
  }

  const popularId = 'creator'
  const hasVerificationPack = CREDIT_PACKS.some((pack) => pack.id === 'verify')
  const activePlanId = subscription?.status === 'active' ? planId : null
  const hasActiveSubscription = Boolean(activePlanId)
  const nextBillingDate = formatBillingDate(subscription?.currentPeriodEnd ?? null)

  // For Path B (manual renewal via QRPH), surface a "Renew now" CTA when
  // the current period ends within a week so users can buy the next month.
  const daysUntilPeriodEnd = (() => {
    const end = subscription?.currentPeriodEnd
    if (!end) return null
    const ms = new Date(end).getTime() - Date.now()
    if (Number.isNaN(ms)) return null
    return Math.ceil(ms / (24 * 60 * 60 * 1000))
  })()
  const renewalDueSoon = daysUntilPeriodEnd != null && daysUntilPeriodEnd <= 7

  return (
    <div className="w-full space-y-14 pb-4">
      {qrData && (
        <QRModal
          {...qrData}
          onClose={() => setQrData(null)}
          onRefresh={refreshPayment}
        />
      )}

      <header className="text-center">
        <p className="text-sm font-medium text-brand-text/50">Billing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-text sm:text-4xl">
          Select the option that fits your workflow
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-brand-text/45">
          Subscribe for steady monthly tokens, or buy a credit pack when you need a one-time top-up.
        </p>
      </header>

      <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-white/[0.08] bg-brand-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-text/40">Token balance</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-brand-text">
            {balance.toLocaleString()}
          </p>
          <p className="text-sm text-brand-text/35">tokens available</p>
        </div>
        <button
          type="button"
          onClick={refreshBalance}
          disabled={isPending}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-xs font-medium text-brand-text/70 transition-colors hover:border-brand-accent/45 hover:bg-brand-accent/15 hover:text-brand-text disabled:opacity-50 sm:self-center"
          aria-label="Refresh balance"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-brand-text">Monthly plans</h2>
          <p className="mt-1 text-sm text-brand-text/40">Billed monthly · tokens released in daily installments</p>
        </div>

        {hasActiveSubscription && (
          <div className="rounded-xl border border-brand-accent/25 bg-brand-surface px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-brand-text">
                Active plan:{' '}
                <span className="text-brand-accent">
                  {PLANS.find((p) => p.id === activePlanId)?.name ?? 'Subscription'}
                </span>
              </p>
              <p className="text-sm text-brand-text/45">
                {subscription?.cancelAtPeriodEnd
                  ? `Cancellation scheduled${nextBillingDate ? ` for ${nextBillingDate}` : ''}.`
                  : nextBillingDate
                    ? `Next billing date: ${nextBillingDate}.`
                    : 'Your subscription is active.'}
              </p>
            </div>

            {!subscription?.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={handleCancelPlan}
                disabled={isPending || actionPending === 'cancel-plan'}
                className="mt-4 h-10 shrink-0 rounded-lg border-white/[0.12] bg-transparent text-brand-text hover:border-brand-accent/35 hover:bg-brand-accent/10 sm:mt-0"
              >
                {actionPending === 'cancel-plan' ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Updating…
                  </span>
                ) : (
                  'Cancel at period end'
                )}
              </Button>
            )}
          </div>
        )}

        {billingControls && !billingControls.subscriptionsEnabled && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3">
            <p className="text-sm font-medium text-amber-200">Monthly plans are paused</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
              {billingControls.subscriptionMessage ?? 'New subscriptions are not available at this time.'}
            </p>
            {billingControls.capacity.maxFundedTokens != null && (
              <p className="mt-2 text-[11px] text-amber-100/55">
                Reserved exposure:{' '}
                {billingControls.capacity.outstandingTokens.toLocaleString()} /{' '}
                {billingControls.capacity.maxFundedTokens.toLocaleString()} funded tokens
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {PLANS.slice(0, 3).map((plan) => {
            const isCurrentPlan = activePlanId === plan.id
            const isFeaturedPlan = plan.id === SUBSCRIPTION_FEATURED_PLAN_ID
            const dailyBase = Math.floor(plan.tokensPerMonth / plan.monthlyReleaseTranches)
            const dailyHigh = Math.ceil(plan.tokensPerMonth / plan.monthlyReleaseTranches)
            const cadence =
              dailyBase === dailyHigh
                ? `${dailyBase.toLocaleString()} tokens released daily`
                : `${dailyBase.toLocaleString()}–${dailyHigh.toLocaleString()} tokens released daily`
            const modelAccess = plan.id === 'starter' ? 'Standard models' : 'Standard + Pro models'
            const features = [
              `${plan.tokensPerMonth.toLocaleString()} tokens / month`,
              cadence,
              modelAccess,
              `${plan.storageGb} GB storage`,
              plan.rolloverDays > 0 ? `${plan.rolloverDays}-day token rollover` : 'No rollover',
            ]

            const subsOff = Boolean(billingControls && !billingControls.subscriptionsEnabled)
            const ctaFeatured = isFeaturedPlan && !subsOff

            return (
              <div
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-xl border bg-brand-surface',
                  isCurrentPlan
                    ? 'border-brand-accent/55 ring-1 ring-brand-accent/25'
                    : isFeaturedPlan
                      ? 'border-brand-accent/45 ring-1 ring-brand-accent/15'
                      : 'border-white/[0.08]',
                )}
              >
                <div className="flex flex-1 flex-col px-6 pb-6 pt-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 text-xs font-medium text-brand-text/90">
                      {plan.name}
                    </span>
                    {isFeaturedPlan && !isCurrentPlan && (
                      <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-semibold text-brand-bg">
                        Most popular
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="rounded-full border border-brand-accent/40 bg-brand-accent/15 px-2.5 py-0.5 text-xs font-medium text-brand-accent">
                        Current plan
                      </span>
                    )}
                  </div>

                  <p className="mt-6 text-3xl font-semibold tracking-tight text-brand-text">
                    {phpFormat(plan.monthlyPriceCentavos)}
                    <span className="text-base font-normal text-brand-text/45">/month</span>
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-brand-text/45">
                    {PLAN_TAGLINES[plan.id] ?? 'Flexible monthly access to tokens and storage.'}
                  </p>

                  <div className="my-6 border-t border-white/[0.08]" />

                  <ul className="flex flex-1 flex-col gap-3">
                    {features.map((feature) => (
                      <FeatureCheck key={feature}>{feature}</FeatureCheck>
                    ))}
                  </ul>

                  <div className="mt-8 border-t border-white/[0.08] pt-6">
                    {isCurrentPlan && renewalDueSoon ? (
                      <Button
                        type="button"
                        disabled={isPending || actionPending === `plan-${plan.id}` || subsOff}
                        onClick={() => handleStartPlan(plan.id)}
                        className="h-11 w-full rounded-lg bg-brand-accent text-brand-bg text-sm font-bold uppercase tracking-wider hover:bg-brand-accent-hover disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {actionPending === `plan-${plan.id}` ? 'Loading…' : 'Renew now'}
                      </Button>
                    ) : isCurrentPlan ? (
                      <Button
                        disabled
                        className="h-11 w-full rounded-lg border border-white/[0.1] bg-white/[0.05] text-sm font-medium text-brand-text/45"
                      >
                        Current plan
                      </Button>
                    ) : hasActiveSubscription ? (
                      <Button
                        disabled
                        className="h-11 w-full rounded-lg border border-white/[0.08] bg-transparent text-sm font-medium text-brand-text/35"
                      >
                        One active plan only
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={isPending || actionPending === `plan-${plan.id}` || subsOff}
                        onClick={() => handleStartPlan(plan.id)}
                        className={cn(
                          'h-11 w-full rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                          subsOff
                            ? 'border border-white/[0.08] bg-transparent text-brand-text/30'
                            : ctaFeatured
                              ? 'bg-brand-accent text-brand-bg hover:bg-brand-accent-hover'
                              : 'border border-white/[0.1] bg-white/[0.06] text-brand-text hover:border-brand-accent/35 hover:bg-brand-accent/10',
                        )}
                      >
                        {actionPending === `plan-${plan.id}`
                          ? 'Loading…'
                          : subsOff
                            ? 'Unavailable'
                            : 'Start plan'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {!hasActiveSubscription && (
          <p className="text-center text-xs text-brand-text/35">
            Pay once via QRPH for 30 days of access. Tokens release daily. No auto-renewal — renew when ready.
          </p>
        )}
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-brand-text">Credit packs</h2>
          <p className="mt-1 text-sm text-brand-text/40">One-time QRPH purchase · no subscription required</p>
        </div>

        {billingControls && !billingControls.topupsEnabled && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3">
            <p className="text-sm font-medium text-amber-200">Top-ups are paused</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
              {billingControls.topupMessage ?? 'Token top-ups are temporarily unavailable.'}
            </p>
            {billingControls.capacity.maxFundedTokens != null && (
              <p className="mt-2 text-[11px] text-amber-100/55">
                Reserved exposure:{' '}
                {billingControls.capacity.outstandingTokens.toLocaleString()} /{' '}
                {billingControls.capacity.maxFundedTokens.toLocaleString()} funded tokens
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CREDIT_PACKS.map((pack) => {
            const isPopular = pack.id === popularId
            const isVerificationPack = pack.id === 'verify'
            const perToken = (pack.priceCentavos / pack.tokens / 100).toFixed(3)
            const topupsOff = Boolean(billingControls && !billingControls.topupsEnabled)

            return (
              <div
                key={pack.id}
                className={cn(
                  'flex flex-col rounded-xl border bg-brand-surface px-5 pb-5 pt-6',
                  isPopular
                    ? 'border-brand-accent/50 ring-1 ring-brand-accent/20'
                    : 'border-white/[0.08]',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 text-xs font-medium text-brand-text/90">
                    {pack.name}
                  </span>
                  {isPopular && (
                    <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-semibold text-brand-bg">
                      Best value
                    </span>
                  )}
                </div>

                {isVerificationPack && (
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-amber-400/90">
                    Verification only
                  </p>
                )}

                <p className="mt-4 text-2xl font-semibold tracking-tight text-brand-text">
                  {phpFormat(pack.priceCentavos)}
                </p>
                <p className="text-xs text-brand-text/40">₱{perToken} per token</p>

                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  <FeatureCheck>
                    <span className="text-brand-text/70">{pack.tokens.toLocaleString()} tokens</span>
                  </FeatureCheck>
                  <FeatureCheck>
                    <span className="text-brand-text/70">~{Math.floor(pack.tokens / 40)} video runs</span>
                  </FeatureCheck>
                </ul>

                <Button
                  onClick={() => handleBuyPack(pack)}
                  disabled={isPending || actionPending === pack.id || topupsOff}
                  className={cn(
                    'mt-6 h-10 w-full rounded-lg text-sm font-medium',
                    isPopular
                      ? 'bg-brand-accent text-brand-bg hover:bg-brand-accent-hover'
                      : 'border border-white/[0.1] bg-white/[0.06] text-brand-text hover:border-brand-accent/35 hover:bg-brand-accent/10',
                  )}
                >
                  {actionPending === pack.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Preparing…
                    </span>
                  ) : (
                    'Buy'
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-brand-text/35">
          Pay with QRPH (major PH banks and e-wallets). Tokens credit after payment is confirmed.
        </p>
        {hasVerificationPack && (
          <p className="text-center text-xs text-amber-400/85">
            The Verify pack is for payment smoke tests only — disable it in production.
          </p>
        )}
      </section>
    </div>
  )
}
