'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/feedback/use-notify'
import { Search, Users, Zap } from 'lucide-react'
import type { PlanId } from '@/lib/types/billing'

const PLAN_COLORS: Record<string, string> = {
  starter: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  growth: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  pro: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  business: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
}

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in: string | null
  plan_id: PlanId | null
  sub_status: string | null
  token_balance: number
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
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

export default function AdminUsersPage() {
  const notify = useNotify()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)

  function load(nextPage: number, nextQuery: string) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    if (nextQuery.trim()) params.set('q', nextQuery.trim())

    fetch(`/api/admin/users?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Could not load users')
        setUsers(data.users ?? [])
        setPagination(data.pagination ?? EMPTY_PAGINATION)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load users')
        setLoading(false)
      })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load(page, query)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [page, query])

  useEffect(() => {
    if (error) {
      notify.error({ title: 'Users load failed', description: error })
    }
  }, [error, notify])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm text-white/50">{pagination.total.toLocaleString()} total users</p>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex max-w-md">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by email..."
            className="w-full rounded-l-xl rounded-r-none border border-white/8 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/25 transition-colors focus:border-violet-500/50 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-l-none rounded-r-xl border border-l-0 border-white/8 bg-white/[0.03] px-3 text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl border border-white/8 bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-red-300">Could not load users</p>
            <p className="text-xs text-red-300/80">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => load(page, query)}
            className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Users className="h-8 w-8 text-white/15" />
          <p className="text-sm text-white/30">
            {query ? `No users found for "${query}"` : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Email</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 md:table-cell">Plan</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 lg:table-cell">Tokens</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 lg:table-cell">Joined</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 xl:table-cell">Last active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-white/70">{u.email}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {u.plan_id ? (
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', PLAN_COLORS[u.plan_id] ?? '')}>
                          {u.plan_id}
                        </span>
                      ) : (
                        <span className="text-xs text-white/25">-</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-violet-400" />
                        <span className="text-xs text-white/50">{u.token_balance.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-white/30 lg:table-cell">
                      {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-white/30 xl:table-cell">
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
