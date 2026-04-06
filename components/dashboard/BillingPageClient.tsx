'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CREDIT_PACKS } from '@/lib/data/plans'
import { Button } from '@/components/ui/button'
import {
  Zap, CheckCircle2, X, RefreshCw, Sparkles, Clock,
} from 'lucide-react'
import type { CreditPack } from '@/lib/types/billing'

interface BalanceData {
  balance: number
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
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1d22] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/30 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Scan to pay</p>
            <h2 className="text-xl font-bold text-white">{packName} Pack</h2>
            <p className="text-sm text-white/50">{tokens.toLocaleString()} tokens · {phpFormat(amountCentavos)}</p>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">Payment received!</p>
              <p className="text-xs text-white/40 text-center">Your tokens have been added. Close this window to continue.</p>
              <Button onClick={onClose} className="mt-2 h-9 px-6 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-bold text-sm">
                Done
              </Button>
            </div>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Clock className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-medium text-amber-400">QR code expired</p>
              <p className="text-xs text-white/40 text-center">Generate a new one to continue.</p>
              <Button onClick={onClose} className="mt-2 h-9 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm">
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

              <div className="flex items-center justify-center gap-2 text-sm text-white/40">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in <span className={cn('font-mono font-semibold', secondsLeft < 120 ? 'text-amber-400' : 'text-white/60')}>{timerLabel}</span></span>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/3 px-4 py-3 space-y-1">
                <p className="text-xs text-white/40 leading-relaxed">
                  Open your banking app (BPI, BDO, GCash, Maya, etc.), scan this QR code, and complete the payment. We only mark this as paid after the server confirms it.
                </p>
              </div>

              {statusNote && (
                <p className="text-xs text-center text-white/45">{statusNote}</p>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function BillingPageClient({ initialData }: { initialData: BalanceData }) {
  const [balance, setBalance] = useState(initialData.balance ?? 0)
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
        alert(json.error ?? 'Failed to generate QR code. Please try again.')
      }
      setActionPending(null)
    })
  }

  const popularId = 'creator'

  return (
    <div className="space-y-10 max-w-4xl">
      {qrData && (
        <QRModal
          {...qrData}
          onClose={() => setQrData(null)}
          onRefresh={refreshPayment}
        />
      )}

      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Account</p>
        <h1 className="text-[32px] font-black uppercase text-brand-text leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Billing</h1>
        <p className="text-sm text-brand-text/40">Purchase token credits to start generating videos.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-brand-surface p-5 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Token Balance</p>
          <p className="text-3xl font-bold text-white">{balance.toLocaleString()}</p>
          <p className="text-sm text-white/30">tokens remaining</p>
        </div>
        <button
          onClick={refreshBalance}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          aria-label="Refresh balance"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Credit Packs</p>
          <p className="text-xs text-white/20">One-time · QRPH · No subscription</p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {CREDIT_PACKS.map((pack) => {
            const isPopular = pack.id === popularId
            const perToken = (pack.priceCentavos / pack.tokens / 100).toFixed(3)
            return (
              <div
                key={pack.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-5 space-y-4 transition-all',
                  isPopular
                    ? 'border-brand-accent/40 bg-brand-surface'
                    : 'border-white/[0.07] bg-brand-surface',
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-accent text-[10px] font-semibold text-brand-bg whitespace-nowrap">
                    Best Value
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{pack.name}</p>
                  <p className="text-2xl font-bold text-white">
                    {phpFormat(pack.priceCentavos)}
                  </p>
                  <p className="text-xs text-white/30">P{perToken}/token</p>
                </div>

                <ul className="space-y-2 flex-1">
                  <li className="flex items-center gap-2 text-xs text-white/60">
                    <Zap className="w-3 h-3 text-brand-accent shrink-0" />
                    {pack.tokens.toLocaleString()} tokens
                  </li>
                  <li className="flex items-center gap-2 text-xs text-white/60">
                    <Sparkles className="w-3 h-3 text-brand-accent shrink-0" />
                    ~{Math.floor(pack.tokens / 40)} video runs
                  </li>
                </ul>

                <Button
                  onClick={() => handleBuyPack(pack)}
                  disabled={isPending || actionPending === pack.id}
                  className={cn(
                    'w-full h-9 rounded-xl font-semibold text-sm transition-all',
                    isPopular
                      ? 'bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-bold shadow-lg shadow-brand-accent/20'
                      : 'bg-white/[0.07] hover:bg-white/10 text-white',
                  )}
                >
                  {actionPending === pack.id ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Generating...
                    </span>
                  ) : 'Buy'}
                </Button>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-white/20 text-center">
          Payments via QRPH · Scan with any major Philippine banking app or e-wallet · Tokens are credited once payment is confirmed
        </p>
      </div>
    </div>
  )
}
