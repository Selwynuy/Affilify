import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TicketCategory, TicketPriority } from '@/lib/types/support'
import { sanitizeText, verifySameOrigin } from '@/lib/security'

// GET /api/support/tickets — list user's tickets
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('support_tickets')
    .select('*, ticket_messages(count)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data ?? [] })
}

// POST /api/support/tickets — create a ticket + first message
export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json()
  const subject = sanitizeText(payload?.subject, { maxLength: 160 })
  const category = sanitizeText(payload?.category, { maxLength: 40 })
  const body = sanitizeText(payload?.body, { maxLength: 4000, allowNewlines: true })
  const priority = sanitizeText(payload?.priority, { maxLength: 20 })

  if (!subject?.trim() || !category || !body?.trim()) {
    return NextResponse.json({ error: 'subject, category, and body are required' }, { status: 400 })
  }

  const VALID_CATEGORIES: TicketCategory[] = ['billing', 'technical', 'general', 'feature_request']
  if (!VALID_CATEGORIES.includes(category as TicketCategory)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  const VALID_PRIORITIES: TicketPriority[] = ['low', 'normal', 'high']
  const finalPriority = VALID_PRIORITIES.includes(priority as TicketPriority)
    ? priority as TicketPriority
    : 'normal'

  const admin = createAdminClient()

  const { data: ticket, error: ticketErr } = await admin
    .from('support_tickets')
    .insert({
      user_id: user.id,
      subject: subject.trim(),
      category: category as TicketCategory,
      priority: finalPriority,
    })
    .select()
    .single()

  if (ticketErr) return NextResponse.json({ error: ticketErr.message }, { status: 500 })

  const { error: msgErr } = await admin.from('ticket_messages').insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    is_staff: false,
    body: body.trim(),
  })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  return NextResponse.json({ ticket }, { status: 201 })
}
