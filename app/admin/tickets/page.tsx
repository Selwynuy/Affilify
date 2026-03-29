'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronRight, MessageCircle } from 'lucide-react'
import {
  CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS,
  type SupportTicket, type TicketStatus, type TicketCategory,
} from '@/lib/types/support'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

type AdminTicket = SupportTicket & { user?: { email: string } }

export default function AdminTicketsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')

  async function load(s: string) {
    setLoading(true)
    const params = new URLSearchParams()
    if (s) params.set('status', s)
    const res = await fetch(`/api/admin/tickets?${params}`)
    const data = await res.json()
    setTickets(data.tickets ?? [])
    setLoading(false)
  }

  useEffect(() => { void load(status) }, [status]) // eslint-disable-line react-hooks/set-state-in-effect

  function handleStatusChange(s: string) {
    setStatus(s)
    router.replace(s ? `/admin/tickets?status=${s}` : '/admin/tickets')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Support Tickets</h1>
        <p className="text-sm text-white/50">Manage and respond to all user support requests.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusChange(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              status === f.value
                ? 'bg-white/10 border-white/20 text-white'
                : 'border-white/8 text-white/40 hover:text-white hover:border-white/15',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/[0.02] border border-white/8 animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <MessageCircle className="w-8 h-8 text-white/15" />
          <p className="text-sm text-white/30">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
              className="w-full text-left rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-5 flex items-center gap-4 transition-all duration-150 group"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5', STATUS_COLORS[ticket.status as TicketStatus])}>
                    {STATUS_LABELS[ticket.status as TicketStatus]}
                  </span>
                  <span className="text-[10px] text-white/30 border border-white/8 rounded-full px-2 py-0.5">
                    {CATEGORY_LABELS[ticket.category as TicketCategory]}
                  </span>
                  {ticket.user?.email && (
                    <span className="text-[10px] text-white/25">{ticket.user.email}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                <p className="text-xs text-white/30">
                  Updated {new Date(ticket.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
