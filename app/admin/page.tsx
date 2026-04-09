'use client'

import { useEffect, useState } from 'react'
import { useNotify } from '@/components/feedback/use-notify'
import {
  TrendingUp,
  Users,
  CreditCard,
  Zap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Analytics {
  kpis: {
    totalRevenueCentavos: number
    activeSubscriptions: number
    totalCustomers: number
    totalGenerations: number
  }
  revenueChart: { date: string; revenue: number }[]
  generationsChart: { date: string; generations: number }[]
  planDistribution: { name: string; value: number }[]
  tokens: { tokensCredited: number; tokensConsumed: number }
  profitability: {
    estimatedTokenValueUsd: number
    vendorSpendUsd: number
    estimatedGrossProfitUsd: number
    googleSpendUsd: number
    replicateSpendUsd: number
    trackedJobs: number
    unpricedGoogleJobs: number
  }
  recentPayments: {
    pack_name: string
    amount_centavos: number
    status: string
    credited_at: string | null
    created_at: string
  }[]
}

const PLAN_COLORS = ['#7c3aed', '#a855f7', '#c084fc', '#e879f9', '#f0abfc']

const STATUS_STYLES: Record<string, string> = {
  credited: 'bg-emerald-500/15 text-emerald-400',
  paid: 'bg-blue-500/15 text-blue-400',
  awaiting_payment: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-white/10 text-white/40',
  failed: 'bg-red-500/15 text-red-400',
}

function formatPHP(centavos: number) {
  return `₱${(centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function formatUSD(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, prefix = '', suffix = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1530] px-3 py-2 text-xs shadow-xl" style={{ color: '#fff' }}>
      {label && <p className="mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color && p.color !== '#000' && p.color !== 'black' ? p.color : '#c084fc' }} className="font-semibold">
          {p.name}: {prefix}{p.value.toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  )
}

export default function AdminOverviewPage() {
  const notify = useNotify()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetch('/api/admin/analytics')
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? 'Failed to load analytics')
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
        setLoading(false)
      })
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (error) {
      notify.error({ title: 'Analytics load failed', description: error })
    }
  }, [error, notify])

  const kpiCards = data ? [
    {
      label: 'Total Revenue',
      value: formatPHP(data.kpis.totalRevenueCentavos),
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      sub: 'All-time credited payments',
    },
    {
      label: 'Total Customers',
      value: data.kpis.totalCustomers.toLocaleString(),
      icon: Users,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      sub: 'Registered accounts',
    },
    {
      label: 'Active Subscriptions',
      value: data.kpis.activeSubscriptions.toLocaleString(),
      icon: CreditCard,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10 border-fuchsia-500/20',
      sub: 'Currently active plans',
    },
    {
      label: 'Images Generated',
      value: data.kpis.totalGenerations.toLocaleString(),
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      sub: 'AI-generated outputs (30d)',
    },
  ] : []

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-white/40">Revenue, customers, and platform usage.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50 transition-all hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.02]" />
            ))
          : kpiCards.map(({ label, value, icon: Icon, color, bg, sub }) => (
              <div key={label} className={`rounded-2xl border p-5 space-y-3 ${bg}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{label}</p>
                  <p className="text-[11px] text-white/25 mt-1">{sub}</p>
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={`profit-${i}`} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.02]" />
            ))
          : (
            <>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sky-300">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{formatUSD(data?.profitability.estimatedTokenValueUsd ?? 0)}</p>
                  <p className="text-xs text-white/40 mt-0.5">Estimated token value</p>
                  <p className="text-[11px] text-white/25 mt-1">Internal value estimate from consumed tokens</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-amber-300">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{formatUSD(data?.profitability.vendorSpendUsd ?? 0)}</p>
                  <p className="text-xs text-white/40 mt-0.5">Tracked vendor spend</p>
                  <p className="text-[11px] text-white/25 mt-1">Snapshot API cost from Google and Replicate</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{formatUSD(data?.profitability.estimatedGrossProfitUsd ?? 0)}</p>
                  <p className="text-xs text-white/40 mt-0.5">Estimated gross profit</p>
                  <p className="text-[11px] text-white/25 mt-1">Estimated token value minus tracked spend</p>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-violet-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{(data?.profitability.trackedJobs ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-white/40 mt-0.5">Tracked generation jobs</p>
                  <p className="text-[11px] text-white/25 mt-1">Rows with cost/value snapshots</p>
                </div>
              </div>
            </>
          )}
      </div>

      {!loading && data && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">Vendor Cost Comparison</h2>
            <p className="text-xs text-white/40 mt-0.5">Estimated token value versus tracked provider spend.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-white/45">
                <span>Google spend</span>
                <span>{formatUSD(data.profitability.googleSpendUsd)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-sky-400"
                  style={{
                    width: `${Math.min(
                      100,
                      data.profitability.vendorSpendUsd > 0
                        ? (data.profitability.googleSpendUsd / data.profitability.vendorSpendUsd) * 100
                        : 0,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-white/45">
                <span>Replicate spend</span>
                <span>{formatUSD(data.profitability.replicateSpendUsd)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-fuchsia-400"
                  style={{
                    width: `${Math.min(
                      100,
                      data.profitability.vendorSpendUsd > 0
                        ? (data.profitability.replicateSpendUsd / data.profitability.vendorSpendUsd) * 100
                        : 0,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {data.profitability.unpricedGoogleJobs > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              {data.profitability.unpricedGoogleJobs} Google job(s) are still unpriced. Set `GOOGLE_IMAGE_GEN_VENDOR_COST_USD` and/or `GOOGLE_MODEL_GEN_VENDOR_COST_USD` to complete the comparison.
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-white/30">
            Estimated token value is an internal estimate, not recognized accounting revenue. Treat this panel as operational margin monitoring unless payment and vendor invoices are reconciled separately.
          </p>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white">Revenue (Last 30 Days)</h2>
          <p className="text-xs text-white/40 mt-0.5">Credited payments in PHP</p>
        </div>
        {loading ? (
          <div className="h-56 animate-pulse rounded-xl bg-white/[0.03]" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.revenueChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₱${v}`}
              />
              <Tooltip content={<CustomTooltip prefix="₱" />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Generations + Plan Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Generations Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white">AI Generations (Last 30 Days)</h2>
            <p className="text-xs text-white/40 mt-0.5">Images generated per day</p>
          </div>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-white/[0.03]" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.generationsChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="generations" name="Generations" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white">Plan Distribution</h2>
            <p className="text-xs text-white/40 mt-0.5">Active subscriptions by plan</p>
          </div>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-white/[0.03]" />
          ) : !data?.planDistribution.length ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-xs text-white/30">No active subscriptions</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={data.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.planDistribution.map((_, i) => (
                      <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const entry = payload[0]
                      return (
                        <div className="rounded-xl border border-white/10 bg-[#1a1530] px-3 py-2 text-xs shadow-xl">
                          <p style={{ color: entry.payload.fill }} className="font-semibold">
                            {entry.name}: {entry.value}
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {data.planDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                      />
                      <span className="text-white/60">{item.name}</span>
                    </div>
                    <span className="font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Token Usage + Recent Payments */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Token Usage */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white">Token Usage</h2>
            <p className="text-xs text-white/40 mt-0.5">Credits purchased vs consumed</p>
          </div>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/[0.03]" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={[
                    { label: 'Credited', value: data?.tokens.tokensCredited ?? 0, color: '#7c3aed' },
                    { label: 'Consumed', value: data?.tokens.tokensConsumed ?? 0, color: '#e879f9' },
                  ]}
                  margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip suffix=" tokens" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="value" name="Tokens" radius={[6, 6, 0, 0]} fill="#7c3aed"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    shape={(props: any) => {
                      const { x, y, width, height, color } = props
                      return <rect x={x} y={y} width={width} height={height} fill={color} rx={6} ry={6} />
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
                  <p className="text-xs text-white/40">Credited</p>
                  <p className="text-lg font-bold text-violet-300 mt-0.5">
                    {(data?.tokens.tokensCredited ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 p-3">
                  <p className="text-xs text-white/40">Consumed</p>
                  <p className="text-lg font-bold text-fuchsia-300 mt-0.5">
                    {(data?.tokens.tokensConsumed ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">Recent Payments</h2>
            <p className="text-xs text-white/40 mt-0.5">Latest 10 billing transactions</p>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          ) : !data?.recentPayments.length ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-xs text-white/30">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.recentPayments.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{p.pack_name}</p>
                    <p className="text-white/30 mt-0.5">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[p.status] ?? 'bg-white/10 text-white/40'}`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-white">{formatPHP(p.amount_centavos)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
