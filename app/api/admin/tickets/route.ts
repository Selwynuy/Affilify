import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 20

async function getUserEmailMap(admin: ReturnType<typeof createAdminClient>, userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error || !data.user) return [id, null] as const
      return [id, data.user.email ?? null] as const
    }),
  )

  return new Map(entries)
}

// GET /api/admin/tickets — all tickets with filters
export async function GET(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const queryText = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))

  const admin = createAdminClient()
  let query = admin
    .from('support_tickets')
    .select('*, ticket_messages(count)', { count: 'exact' })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (queryText) query = query.ilike('subject', `%${queryText}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const emailMap = await getUserEmailMap(admin, (data ?? []).map((ticket) => ticket.user_id))
  const tickets = (data ?? []).map((ticket) => ({
    ...ticket,
    user: { email: emailMap.get(ticket.user_id) ?? null },
  }))

  return NextResponse.json({
    tickets,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    },
  })
}
