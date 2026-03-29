'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowLeft, Send, AlertCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS,
  type SupportTicket, type TicketMessage,
} from '@/lib/types/support'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function load() {
    const res = await fetch(`/api/support/tickets/${id}`)
    if (!res.ok) { router.push('/support'); return }
    const data = await res.json()
    setTicket(data.ticket)
    setMessages(data.messages ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send reply'); return }
      setReply('')
      load()
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

  if (!ticket) return null

  const isClosed = ticket.status === 'closed'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/support')}
        className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to tickets
      </button>

      {/* Ticket header */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-base font-semibold text-white leading-snug">{ticket.subject}</h1>
          <span className={cn(
            'text-[10px] font-medium border rounded-full px-2 py-0.5 shrink-0',
            STATUS_COLORS[ticket.status],
          )}>
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="border border-white/8 rounded-full px-2 py-0.5">{CATEGORY_LABELS[ticket.category]}</span>
          <span>Opened {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'rounded-2xl border p-4 space-y-2',
              msg.is_staff
                ? 'border-brand-accent/20 bg-brand-accent/[0.04]'
                : 'border-white/8 bg-white/[0.02]',
            )}
          >
            <div className="flex items-center gap-2">
              {msg.is_staff ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-brand-accent" />
                  </div>
                  <span className="text-xs font-medium text-brand-accent">Support Team</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                    U
                  </div>
                  <span className="text-xs font-medium text-white/60">You</span>
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

      {/* Reply form */}
      {!isClosed ? (
        <form onSubmit={sendReply} className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            rows={4}
            className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-accent/50 focus:bg-white/5 transition-colors resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending || !reply.trim()}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg text-sm font-bold shadow-lg shadow-brand-accent/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isPending ? 'Sending…' : 'Send Reply'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-center text-xs text-white/30 py-4">This ticket is closed. Open a new ticket if you need further assistance.</p>
      )}
    </div>
  )
}
