import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Date helpers
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const isoStart = thirtyDaysAgo.toISOString()

  const [
    paymentsResult,
    subscriptionsResult,
    usersResult,
    generatedImagesResult,
    tokenLedgerResult,
    vendorCostEventsResult,
    recentPaymentsResult,
    plansResult,
  ] = await Promise.all([
    // All credited payments for revenue
    admin
      .from('billing_payments')
      .select('amount_centavos, credited_at, pack_name')
      .eq('status', 'credited')
      .order('credited_at', { ascending: true }),

    // Subscriptions with plan
    admin
      .from('subscriptions')
      .select('status, plan_id, created_at'),

    // All users (via user_preferences as proxy)
    admin
      .from('user_preferences')
      .select('user_id'),

    // Generated images over last 30 days
    admin
      .from('project_images')
      .select('created_at')
      .eq('kind', 'generated')
      .gte('created_at', isoStart),

    // Token ledger for credit/debit breakdown
    admin
      .from('token_ledger')
      .select('type, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(500),

    admin
      .from('vendor_cost_events')
      .select('provider, operation, model, vendor_cost_usd, estimated_token_value_usd'),

    // Recent payments
    admin
      .from('billing_payments')
      .select('pack_name, amount_centavos, status, credited_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10),

    // Plans
    admin.from('plans').select('id, name, monthly_price_cents'),
  ])

  const payments = paymentsResult.data ?? []
  const subscriptions = subscriptionsResult.data ?? []
  const users = usersResult.data ?? []
  const generatedImages = generatedImagesResult.data ?? []
  const tokenLedger = tokenLedgerResult.data ?? []
  const vendorCostEvents = vendorCostEventsResult.data ?? []
  const recentPayments = recentPaymentsResult.data ?? []
  const plans = plansResult.data ?? []

  // --- KPI Totals ---
  const totalRevenueCentavos = payments.reduce((sum, p) => sum + (p.amount_centavos ?? 0), 0)
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length
  const totalCustomers = users.length
  const totalGenerations = generatedImages.length

  // --- Revenue over last 30 days ---
  const revenueByDay = buildDailyMap(isoStart)
  for (const p of payments) {
    if (!p.credited_at) continue
    const day = p.credited_at.slice(0, 10)
    if (day in revenueByDay) {
      revenueByDay[day] = (revenueByDay[day] as number) + (p.amount_centavos ?? 0)
    }
  }
  const revenueChart = Object.entries(revenueByDay).map(([date, amount]) => ({
    date: formatShortDate(date),
    revenue: Math.round((amount as number) / 100),
  }))

  // --- Generations over last 30 days ---
  const genByDay = buildDailyMap(isoStart)
  for (const img of generatedImages) {
    const day = img.created_at.slice(0, 10)
    if (day in genByDay) {
      genByDay[day] = (genByDay[day] as number) + 1
    }
  }
  const generationsChart = Object.entries(genByDay).map(([date, count]) => ({
    date: formatShortDate(date),
    generations: count as number,
  }))

  // --- Plan distribution ---
  const planMap: Record<string, number> = {}
  for (const s of subscriptions) {
    if (s.status === 'active') {
      planMap[s.plan_id] = (planMap[s.plan_id] ?? 0) + 1
    }
  }
  const planNames = Object.fromEntries(plans.map((p) => [p.id, p.name]))
  const planDistribution = Object.entries(planMap).map(([planId, count]) => ({
    name: planNames[planId] ?? planId,
    value: count,
  }))

  // --- Token ledger summary ---
  const tokensCredited = tokenLedger
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const tokensConsumed = tokenLedger
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const estimatedTokenValueUsd = vendorCostEvents
    .reduce((sum, row) => sum + Number(row.estimated_token_value_usd ?? 0), 0)
  const vendorSpendUsd = vendorCostEvents
    .reduce((sum, row) => sum + Number(row.vendor_cost_usd ?? 0), 0)
  const googleSpendUsd = vendorCostEvents
    .filter((row) => row.provider === 'google')
    .reduce((sum, row) => sum + Number(row.vendor_cost_usd ?? 0), 0)
  const replicateSpendUsd = vendorCostEvents
    .filter((row) => row.provider === 'replicate')
    .reduce((sum, row) => sum + Number(row.vendor_cost_usd ?? 0), 0)
  const unpricedGoogleJobs = vendorCostEvents.filter(
    (row) => row.provider === 'google' && row.vendor_cost_usd == null,
  ).length
  const estimatedGrossProfitUsd = estimatedTokenValueUsd - vendorSpendUsd

  return NextResponse.json({
    kpis: {
      totalRevenueCentavos,
      activeSubscriptions,
      totalCustomers,
      totalGenerations,
    },
    revenueChart,
    generationsChart,
    planDistribution,
    tokens: { tokensCredited, tokensConsumed },
    profitability: {
      estimatedTokenValueUsd,
      vendorSpendUsd,
      estimatedGrossProfitUsd,
      googleSpendUsd,
      replicateSpendUsd,
      trackedJobs: vendorCostEvents.length,
      unpricedGoogleJobs,
    },
    recentPayments,
  })
}

function buildDailyMap(isoStart: string): Record<string, number> {
  const map: Record<string, number> = {}
  const start = new Date(isoStart)
  const now = new Date()
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = 0
  }
  return map
}

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(month) - 1]} ${parseInt(day)}`
}
