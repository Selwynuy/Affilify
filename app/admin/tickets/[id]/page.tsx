'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/feedback/use-notify'
import { ArrowLeft, Send, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS,
  type SupportTicket, type TicketMessage, type TicketStatus,
} from '@/lib/types/support'

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

type AdminTicket = SupportTicket & { user?: { email: string } }

export default function AdminTicketDetailPage() {
  const notify = useNotify()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [ticket, setTicket] = useState<AdminTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setError(null)
    const res = await fetch(`/api/admin/tickets/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not load ticket')
      setLoading(false)
      return
    }
    const data = await res.json()
    setTicket(data.ticket)
    setMessages(data.messages ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (error) notify.error({ title: 'Ticket action failed', description: error })
  }, [error, notify])
  useEffect(() => {
    if (notice) notify.success({ description: notice })
  }, [notice, notify])

  function updateStatus(status: TicketStatus) {
    startTransition(async () => {
      setError(null)
      setNotice(null)
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not update ticket status')
        return
      }
      setNotice('Ticket status updated')
      await load()
    })
  }

  function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    startTransition(async () => {
      setError(null)
      setNotice(null)
      const nextReply = reply.trim()
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: nextReply }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not send reply')
        return
      }
      setReply('')
      setNotice('Reply sent')
      await load()
    })
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-40 rounded-2xl bg-white/[0.02] animate-pulse" />
      </div>
    )
  }
  if (!ticket) {
    return (
      <div className="max-w-2xl space-y-4">
        <button
          onClick={() => router.push('/admin/tickets')}
          className="flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to tickets
        </button>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-sm font-medium text-red-300">Ticket unavailable</p>
          <p className="mt-1 text-xs text-red-300/80">{error ?? 'This ticket could not be loaded.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <button
        onClick={() => router.push('/admin/tickets')}
        className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to tickets
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-white">{ticket.subject}</h1>
            <p className="text-xs text-white/30">{ticket.user?.email}</p>
          </div>
          <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5 shrink-0', STATUS_COLORS[ticket.status])}>
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/30">
          <span className="border border-white/8 rounded-full px-2 py-0.5">{CATEGORY_LABELS[ticket.category]}</span>
          <span>Opened {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>

        {/* Status changer */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Change Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={isPending || ticket.status === s}
                className={cn(
                  'text-[10px] font-medium border rounded-full px-2.5 py-1 transition-all',
                  ticket.status === s
                    ? STATUS_COLORS[s] + ' opacity-100'
                    : 'border-white/8 text-white/30 hover:text-white hover:border-white/20',
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'rounded-2xl border p-4 space-y-2',
              msg.is_staff
                ? 'border-violet-500/20 bg-violet-500/[0.04]'
                : 'border-white/8 bg-white/[0.02]',
            )}
          >
            <div className="flex items-center gap-2">
              {msg.is_staff ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-violet-400">Support Team (you)</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">U</div>
                  <span className="text-xs font-medium text-white/60">{ticket.user?.email}</span>
                </>
              )}
              <span className="ml-auto text-[10px] text-white/25">
                {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Staff reply */}
      <form onSubmit={sendReply} className="space-y-3">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a staff reply…"
          rows={4}
            className="w-full rounded-xl border border-violet-500/20 bg-violet-500/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
            disabled={isPending}
          />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !reply.trim()}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? 'Sending…' : 'Send Reply'}
          </Button>
        </div>
      </form>
    </div>
  )
}
