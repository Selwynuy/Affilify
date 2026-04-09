import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 25

interface AuthUserRecord {
  id: string
  email?: string | null
  created_at: string
  last_sign_in_at?: string | null
}

export async function GET(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const query = searchParams.get('q')?.trim().toLowerCase() ?? ''

  const admin = createAdminClient()
  let users: AuthUserRecord[] = []
  let total = 0

  if (query) {
    let authPage = 1
    let totalUsers = 0
    const matches: AuthUserRecord[] = []

    while (true) {
      const { data: authData, error } = await admin.auth.admin.listUsers({ page: authPage, perPage: 100 })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const chunk = (authData?.users ?? []) as AuthUserRecord[]
      totalUsers = (authData && 'total' in authData ? authData.total : null) ?? totalUsers
      matches.push(...chunk.filter((entry) => entry.email?.toLowerCase().includes(query)))

      if (chunk.length < 100 || matches.length > totalUsers) break
      authPage += 1
    }

    total = matches.length
    users = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  } else {
    const { data: authData, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    users = (authData?.users ?? []) as AuthUserRecord[]
    total = (authData && 'total' in authData ? authData.total : null) ?? 0
  }

  const userIds = users.map((entry) => entry.id)

  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id, plan_id, status, created_at')
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const { data: ledger } = await admin
    .from('token_ledger')
    .select('user_id, amount')
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

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
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  })
}
