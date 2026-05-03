'use client'

import { useEffect, useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/feedback/use-notify'
import { Mail, Send, Inbox, CheckCircle2, RefreshCw, Filter } from 'lucide-react'

type WaitlistStatus = 'pending' | 'invited' | 'claimed'

interface WaitlistRow {
  id: string
  email: string
  source: string
  status: WaitlistStatus
  emailSentAt: string | null
  invitedAt: string | null
  inviteExpiresAt: string | null
  claimedAt: string | null
  claimedUserId: string | null
  createdAt: string
}

interface Counts {
  pending: number
  invited: number
  claimed: number
  total: number
}

const EMPTY_COUNTS: Counts = { pending: 0, invited: 0, claimed: 0, total: 0 }

const STATUS_STYLES: Record<WaitlistStatus, string> = {
  pending: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  invited: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  claimed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

const STATUS_LABEL: Record<WaitlistStatus, string> = {
  pending: 'Pending',
  invited: 'Invited',
  claimed: 'Claimed',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminWaitlistPage() {
  const notify = useNotify()
  const [rows, setRows] = useState<WaitlistRow[]>([])
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function load() {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)

    fetch(`/api/admin/waitlist?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Could not load waitlist')
        setRows(data.rows ?? [])
        setCounts(data.counts ?? EMPTY_COUNTS)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load waitlist')
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    if (error) notify.error({ title: 'Waitlist load failed', description: error })
  }, [error, notify])

  function handleInvite(row: WaitlistRow) {
    if (row.status === 'claimed') {
      notify.error({
        title: 'Already claimed',
        description: 'This person has already finished signing up.',
      })
      return
    }

    setInvitingId(row.id)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/waitlist/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id }),
        })
        const data = await res.json()

        if (!res.ok) {
          notify.error({
            title: 'Invite failed',
            description: data.error ?? 'Could not send the invite. Try again.',
          })
        } else {
          notify.success({
            title: row.status === 'invited' ? 'Invite resent' : 'Invite sent',
            description: `Email sent to ${row.email}. Expires ${formatDate(data.expiresAt)}.`,
          })
          load()
        }
      } finally {
        setInvitingId(null)
      }
    })
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Waitlist</h1>
        <p className="text-sm text-white/50">
          {counts.total.toLocaleString()} total signups · invite people to grant them access.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Inbox} label="Pending" value={counts.pending} accent="text-blue-400" />
        <StatCard icon={Send} label="Invited" value={counts.invited} accent="text-amber-400" />
        <StatCard icon={CheckCircle2} label="Claimed" value={counts.claimed} accent="text-emerald-400" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-white/40" />
        {(['all', 'pending', 'invited', 'claimed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors capitalize',
              statusFilter === s
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                : 'border-white/8 bg-white/[0.02] text-white/55 hover:border-white/15 hover:text-white/80',
            )}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl border border-white/8 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Mail className="h-8 w-8 text-white/15" />
          <p className="text-sm text-white/30">
            {statusFilter === 'all' ? 'No waitlist signups yet.' : `No ${statusFilter} entries.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Email</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 sm:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 md:table-cell">Source</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 lg:table-cell">Signed up</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 xl:table-cell">Invited</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]">
                  <td className="max-w-[260px] truncate px-4 py-3 font-medium text-white/75">
                    {row.email}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        STATUS_STYLES[row.status],
                      )}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-white/40 md:table-cell">
                    {row.source}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-white/40 lg:table-cell">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-white/40 xl:table-cell">
                    {formatDate(row.invitedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status === 'claimed' ? (
                      <span className="text-xs text-white/30">Joined</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInvite(row)}
                        disabled={invitingId === row.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          row.status === 'invited'
                            ? 'border-white/10 bg-white/[0.04] text-white/65 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300'
                            : 'border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      >
                        {invitingId === row.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        {row.status === 'invited' ? 'Resend invite' : 'Send invite'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-3.5 w-3.5', accent)} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  )
}
