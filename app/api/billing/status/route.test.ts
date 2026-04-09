import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const retrievePaymentIntent = vi.hoisted(() => vi.fn())
const finalizeBillingPayment = vi.hoisted(() => vi.fn())
const getBillingPaymentForUser = vi.hoisted(() => vi.fn())
const updateBillingPaymentStatus = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/billing/paymongo', () => ({ retrievePaymentIntent }))
vi.mock('@/lib/billing/payments', () => ({
  finalizeBillingPayment,
  getBillingPaymentForUser,
  updateBillingPaymentStatus,
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))

import { GET } from './route'

describe('GET /api/billing/status', () => {
  it('returns 400 when intentId missing', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    })
    const res = await GET(new NextRequest('http://localhost/api/billing/status'))
    expect(res.status).toBe(400)
  })

  it('finalizes credited payment on succeeded intent', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    })
    getBillingPaymentForUser.mockResolvedValue({
      status: 'awaiting_payment',
      created_at: new Date().toISOString(),
      credited_at: null,
    })
    retrievePaymentIntent.mockResolvedValue({
      attributes: { status: 'succeeded', payments: [{ id: 'p1', attributes: { paid_at: 1710000000 } }] },
    })
    finalizeBillingPayment.mockResolvedValue({ record: { status: 'credited' }, balance: 500 })

    const res = await GET(new NextRequest('http://localhost/api/billing/status?intentId=pi_1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paid).toBe(true)
    expect(body.balance).toBe(500)
  })

  it('expires stale awaiting payment records', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    })
    getBillingPaymentForUser.mockResolvedValue({
      status: 'awaiting_payment',
      created_at: new Date(Date.now() - 31 * 60_000).toISOString(),
      credited_at: null,
    })
    retrievePaymentIntent.mockResolvedValue({ attributes: { status: 'awaiting_payment', payments: [] } })

    const res = await GET(new NextRequest('http://localhost/api/billing/status?intentId=pi_2'))
    expect(res.status).toBe(200)
    expect(updateBillingPaymentStatus).toHaveBeenCalledWith('pi_2', 'expired')
  })
})
