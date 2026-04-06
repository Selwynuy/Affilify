/**
 * POST /api/billing/portal — DISABLED
 *
 * Subscription cancellation is not applicable while subscriptions are unavailable.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Subscriptions are not available at this time.' },
    { status: 410 },
  )
}
