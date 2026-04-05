import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'

// GET /api/support/tickets/[id] — ticket detail + messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: ticket, error: ticketErr } = await admin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (ticketErr || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await admin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ticket, messages: messages ?? [] })
}

// POST /api/support/tickets/[id] — add a reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json()
  const body = sanitizeText(payload?.body, { maxLength: 4000, allowNewlines: true })
  if (!body?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify ticket belongs to user and is not closed
  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.status === 'closed') return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 })

  const { data: message, error } = await admin
    .from('ticket_messages')
    .insert({ ticket_id: id, sender_id: user.id, is_staff: false, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Reopen ticket if resolved when user replies
  if (ticket.status === 'resolved') {
    await admin.from('support_tickets').update({ status: 'open' }).eq('id', id)
  }

  return NextResponse.json({ message }, { status: 201 })
}
