import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 100

export async function GET(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))

  const admin = createAdminClient()

  // Paginated auth user list
  const { data: authData } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
  const users = authData?.users ?? []
  const total = authData?.total ?? 0

  // Get subscriptions for all users
  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id, plan_id, status, created_at')

  // Get token balances grouped
  const { data: ledger } = await admin
    .from('token_ledger')
    .select('user_id, amount')

  const subMap = new Map(subs?.map((s) => [s.user_id, s]) ?? [])
  const tokenMap = new Map<string, number>()
  for (const row of ledger ?? []) {
    tokenMap.set(row.user_id, (tokenMap.get(row.user_id) ?? 0) + row.amount)
  }

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
    plan_id: subMap.get(u.id)?.plan_id ?? null,
    sub_status: subMap.get(u.id)?.status ?? null,
    token_balance: tokenMap.get(u.id) ?? 0,
  }))

  return NextResponse.json({
    users: result,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  })
}
