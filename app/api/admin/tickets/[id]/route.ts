import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TicketStatus } from '@/lib/types/support'

// GET — ticket detail + messages (admin)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: ticket, error } = await admin
    .from('support_tickets')
    .select('*, user:user_id(email)')
    .eq('id', id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await admin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ticket, messages: messages ?? [] })
}

// PATCH — update status or add staff reply
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status, reply } = await req.json()
  const admin = createAdminClient()

  const VALID_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    await admin.from('support_tickets').update({ status }).eq('id', id)
  }

  if (reply?.trim()) {
    await admin.from('ticket_messages').insert({
      ticket_id: id,
      sender_id: user.id,
      is_staff: true,
      body: reply.trim(),
    })
  }

  return NextResponse.json({ ok: true })
}
