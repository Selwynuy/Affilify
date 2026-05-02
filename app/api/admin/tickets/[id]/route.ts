import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TicketStatus } from '@/lib/types/support'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

// GET — ticket detail + messages (admin)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: ticket, error } = await admin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: authUser } = await admin.auth.admin.getUserById(ticket.user_id)

  const { data: messages } = await admin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    ticket: {
      ...ticket,
      user: { email: authUser.user?.email ?? null },
    },
    messages: messages ?? [],
  })
}

// PATCH — update status or add staff reply
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = await rateLimit(`admin-tickets:user:${user.id}`, RATE_LIMITS.adminMutate)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const payload = await req.json()
  const status = sanitizeText(payload?.status, { maxLength: 20 })
  const reply = sanitizeText(payload?.reply, { maxLength: 4000, allowNewlines: true })
  const admin = createAdminClient()

  const VALID_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

  if (status) {
    if (!VALID_STATUSES.includes(status as TicketStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { error } = await admin.from('support_tickets').update({ status: status as TicketStatus }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (reply?.trim()) {
    const { error } = await admin.from('ticket_messages').insert({
      ticket_id: id,
      sender_id: user.id,
      is_staff: true,
      body: reply.trim(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
