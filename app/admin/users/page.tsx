'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Users, Zap } from 'lucide-react'
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setLoading(false) })
  }, [])

  const filtered = users.filter((u) =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm text-white/50">{users.length.toLocaleString()} total users</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email…"
        className="w-full max-w-sm rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
      />

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="h-14 rounded-xl bg-white/[0.02] border border-white/8 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="w-8 h-8 text-white/15" />
          <p className="text-sm text-white/30">No users found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden md:table-cell">Plan</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden lg:table-cell">Tokens</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden lg:table-cell">Joined</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden xl:table-cell">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white/70 font-medium truncate max-w-[200px]">{u.email}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.plan_id ? (
                      <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5', PLAN_COLORS[u.plan_id] ?? '')}>
                        {u.plan_id}
                      </span>
                    ) : (
                      <span className="text-xs text-white/25">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-violet-400" />
                      <span className="text-xs text-white/50">{u.token_balance.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-white/30">
                    {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-white/30">
                    {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
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
