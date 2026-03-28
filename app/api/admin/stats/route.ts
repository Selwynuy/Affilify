import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const [
    { count: totalUsers },
    { count: activeSubscriptions },
    { data: ticketCounts },
    { count: totalProjects },
  ] = await Promise.all([
    admin.from('user_preferences').select('*', { count: 'exact', head: true }),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('support_tickets').select('status'),
    admin.from('projects').select('*', { count: 'exact', head: true }),
  ])

  const openTickets = ticketCounts?.filter((t) => t.status === 'open').length ?? 0
  const inProgressTickets = ticketCounts?.filter((t) => t.status === 'in_progress').length ?? 0

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    openTickets,
    inProgressTickets,
    totalProjects: totalProjects ?? 0,
  })
}
