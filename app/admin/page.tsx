'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, MessageCircle, CreditCard, Video, AlertCircle } from 'lucide-react'

interface Stats {
  totalUsers: number
  activeSubscriptions: number
  openTickets: number
  inProgressTickets: number
  totalProjects: number
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false) })
  }, [])

  const cards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Open Tickets', value: stats.openTickets, icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Projects Generated', value: stats.totalProjects, icon: Video, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
  ] : []

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Admin Overview</h1>
        <p className="text-sm text-white/50">System-wide metrics and quick access.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/8 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-5 space-y-3 ${bg}`}>
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
                <p className="text-xs text-white/40 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {stats && stats.openTickets > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">
            {stats.openTickets} open ticket{stats.openTickets !== 1 ? 's' : ''} waiting for response.{' '}
            <Link href="/admin/tickets?status=open" className="underline hover:no-underline">View now →</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/tickets"
          className="rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-all duration-150 space-y-2"
        >
          <MessageCircle className="w-5 h-5 text-violet-400" />
          <p className="font-medium text-white">Support Tickets</p>
          <p className="text-xs text-white/40">View, filter, and respond to all user tickets.</p>
        </Link>
        <Link
          href="/admin/users"
          className="rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-all duration-150 space-y-2"
        >
          <Users className="w-5 h-5 text-fuchsia-400" />
          <p className="font-medium text-white">User Management</p>
          <p className="text-xs text-white/40">View all users, their plans, and token balances.</p>
        </Link>
      </div>
    </div>
  )
}
