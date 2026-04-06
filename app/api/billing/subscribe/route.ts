/**
 * POST /api/billing/subscribe — DISABLED
 *
 * Subscriptions are temporarily unavailable while legal setup is completed.
 * Credit pack purchases via QRPH are available at /api/billing/checkout.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Subscriptions are not available at this time. Please purchase a credit pack instead.' },
    { status: 410 },
  )
}
