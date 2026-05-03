/**
 * GET /api/admin/waitlist
 *
 * Admin-only listing of waitlist signups, newest first. Includes derived
 * status: pending | invited | claimed.
 *
 * Query: ?status=pending|invited|claimed (optional filter)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export type WaitlistStatus = 'pending' | 'invited' | 'claimed'

interface WaitlistRow {
  id: string
  email: string
  source: string
  email_sent_at: string | null
  invited_at: string | null
  invite_token: string | null
  invite_expires_at: string | null
  claimed_at: string | null
  claimed_user_id: string | null
  created_at: string
}

function deriveStatus(row: WaitlistRow): WaitlistStatus {
  if (row.claimed_at) return 'claimed'
  if (row.invited_at) return 'invited'
  return 'pending'
}

export async function GET(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = new URL(req.url).searchParams.get('status') as WaitlistStatus | null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('waitlist')
    .select('id, email, source, email_sent_at, invited_at, invite_token, invite_expires_at, claimed_at, claimed_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((data ?? []) as WaitlistRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    source: row.source,
    status: deriveStatus(row),
    emailSentAt: row.email_sent_at,
    invitedAt: row.invited_at,
    inviteExpiresAt: row.invite_expires_at,
    claimedAt: row.claimed_at,
    claimedUserId: row.claimed_user_id,
    createdAt: row.created_at,
  }))

  const filtered = status ? rows.filter((r) => r.status === status) : rows

  return NextResponse.json({
    rows: filtered,
    counts: {
      pending: rows.filter((r) => r.status === 'pending').length,
      invited: rows.filter((r) => r.status === 'invited').length,
      claimed: rows.filter((r) => r.status === 'claimed').length,
      total: rows.length,
    },
  })
}
