import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/tickets — all tickets with filters
export async function GET(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')

  const admin = createAdminClient()
  let query = admin
    .from('support_tickets')
    .select('*, ticket_messages(count), user:user_id(email)')
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data ?? [] })
}
