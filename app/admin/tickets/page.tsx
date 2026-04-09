'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, MessageCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/feedback/use-notify'
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
} from '@/lib/types/support'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'feature_request', label: 'Feature Request' },
]

type AdminTicket = SupportTicket & { user?: { email: string } }

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
}

function buildHref(status: string, category: string, query: string, page: number) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (category) params.set('category', category)
  if (query.trim()) params.set('q', query.trim())
  if (page > 1) params.set('page', String(page))
  const search = params.toString()
  return search ? `/admin/tickets?${search}` : '/admin/tickets'
}

function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <p className="text-xs text-white/40">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function AdminTicketsPage() {
  const notify = useNotify()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? '')
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [page, setPage] = useState(Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1))
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)

  function syncUrl(nextStatus: string, nextCategory: string, nextQuery: string, nextPage: number) {
    router.replace(buildHref(nextStatus, nextCategory, nextQuery, nextPage))
  }

  async function load(nextStatus: string, nextCategory: string, nextQuery: string, nextPage: number) {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (nextStatus) params.set('status', nextStatus)
    if (nextCategory) params.set('category', nextCategory)
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    params.set('page', String(nextPage))

    const res = await fetch(`/api/admin/tickets?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) {
      setTickets([])
      setPagination(EMPTY_PAGINATION)
      setError(data.error ?? 'Could not load tickets')
      setLoading(false)
      return
    }

    setTickets(data.tickets ?? [])
    setPagination(data.pagination ?? EMPTY_PAGINATION)
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(status, category, query, page)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [status, category, query, page])

  useEffect(() => {
    if (error) {
      notify.error({ title: 'Tickets load failed', description: error })
    }
  }, [error, notify])

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
    syncUrl(value, category, query, 1)
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    setPage(1)
    syncUrl(status, value, query, 1)
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextQuery = searchInput.trim()
    setQuery(nextQuery)
    setPage(1)
    syncUrl(status, category, nextQuery, 1)
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    syncUrl(status, category, query, nextPage)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Support Tickets</h1>
        <p className="text-sm text-white/50">{pagination.total.toLocaleString()} tickets across all queues.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleStatusChange(filter.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                status === filter.value
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/8 text-white/40 hover:border-white/15 hover:text-white',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <form onSubmit={handleSearchSubmit} className="flex flex-1">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search ticket subject..."
                className="w-full rounded-l-xl rounded-r-none border border-white/8 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/25 transition-colors focus:border-violet-500/50 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              aria-label="Search tickets"
              className="inline-flex items-center justify-center rounded-l-none rounded-r-xl border border-l-0 border-white/8 bg-white/[0.03] px-3 text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <select
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors focus:border-violet-500/50 focus:outline-none md:w-56"
          >
            {CATEGORY_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value} className="bg-[#0d0d14] text-white">
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl border border-white/8 bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-red-300">Could not load tickets</p>
            <p className="text-xs text-red-300/80">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void load(status, category, query, page)}
            className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <MessageCircle className="h-8 w-8 text-white/15" />
          <p className="text-sm text-white/30">No tickets match the current filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left transition-all duration-150 hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[ticket.status as TicketStatus])}>
                      {STATUS_LABELS[ticket.status as TicketStatus]}
                    </span>
                    <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-white/30">
                      {CATEGORY_LABELS[ticket.category as TicketCategory]}
                    </span>
                    {ticket.user?.email && (
                      <span className="text-[10px] text-white/25">{ticket.user.email}</span>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-white">{ticket.subject}</p>
                  <p className="text-xs text-white/30">
                    Updated {new Date(ticket.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
              </button>
            ))}
          </div>

          <PaginationControls page={pagination.page} totalPages={pagination.totalPages} onChange={handlePageChange} />
        </div>
      )}
    </div>
  )
}
