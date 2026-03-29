'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Plus, MessageCircle, ChevronRight, X, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS,
  type SupportTicket, type TicketCategory,
} from '@/lib/types/support'

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'feature_request', label: 'Feature Request' },
]

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<TicketCategory>('general')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, body }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      onCreated()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 bg-brand-bg p-4 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">New Support Ticket</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Briefly describe your issue"
              required
              maxLength={160}
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-accent/50 focus:bg-white/5 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent/50 transition-colors appearance-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-brand-bg">{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Please describe your issue in detail…"
              required
              rows={5}
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-accent/50 focus:bg-white/5 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/8 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !subject.trim() || !body.trim()}
              className="flex-1 h-10 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg text-sm font-bold shadow-lg shadow-brand-accent/20 disabled:opacity-50"
            >
              {isPending ? 'Submitting…' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function loadTickets() {
    setLoading(true)
    const res = await fetch('/api/support/tickets')
    const data = await res.json()
    setTickets(data.tickets ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [])

  function handleCreated() {
    setShowNew(false)
    loadTickets()
  }

  return (
    <>
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}

      <div className="space-y-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Help</p>
            <h1 className="text-[32px] font-black uppercase text-brand-text leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Support</h1>
            <p className="text-sm text-brand-text/40">Create and track your support requests.</p>
          </div>
          <Button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg text-sm font-bold shadow-lg shadow-brand-accent/20 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-5 w-16 rounded-full bg-white/5" />
                  <div className="h-5 w-24 rounded-full bg-white/5" />
                </div>
                <div className="h-4 w-2/3 rounded bg-white/5 mb-2" />
                <div className="h-3 w-24 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white/20" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white/50">No tickets yet</p>
              <p className="text-xs text-white/30">Have a question? Open a support ticket and we'll help you out.</p>
            </div>
            <Button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Open a ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => router.push(`/support/${ticket.id}`)}
                className="w-full text-left rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12 p-5 flex items-center gap-4 transition-all duration-150 group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-[10px] font-medium border rounded-full px-2 py-0.5',
                      STATUS_COLORS[ticket.status],
                    )}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                    <span className="text-[10px] text-white/30 border border-white/8 rounded-full px-2 py-0.5">
                      {CATEGORY_LABELS[ticket.category]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                  <p className="text-xs text-white/30">
                    {new Date(ticket.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
