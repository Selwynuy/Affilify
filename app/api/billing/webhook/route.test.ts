import { describe, expect, it, vi } from 'vitest'

const verifyWebhookSignature = vi.hoisted(() => vi.fn())
const finalizeBillingPayment = vi.hoisted(() => vi.fn())
const updateBillingPaymentStatus = vi.hoisted(() => vi.fn())

vi.mock('@/lib/billing/paymongo', () => ({ verifyWebhookSignature }))
vi.mock('@/lib/billing/payments', () => ({ finalizeBillingPayment, updateBillingPaymentStatus }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from './route'

describe('POST /api/billing/webhook', () => {
  it('rejects missing signature', async () => {
    const req = new Request('http://localhost/api/billing/webhook', { method: 'POST', body: '{}' })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing signature' })
  })

  it('rejects invalid signature', async () => {
    verifyWebhookSignature.mockReturnValue(false)
    const req = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'paymongo-signature': 'bad' },
      body: '{}',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid signature' })
  })

  it('handles payment.paid and finalizes credits', async () => {
    verifyWebhookSignature.mockReturnValue(true)
    finalizeBillingPayment.mockResolvedValue({ record: { user_id: 'u1', tokens: 150 } })
    const req = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'paymongo-signature': 'ok' },
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'payment.paid',
            data: {
              id: 'pay_1',
              attributes: { payment_intent_id: 'pi_1', paid_at: 1710000000 },
            },
          },
        },
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(finalizeBillingPayment).toHaveBeenCalledWith('pi_1', 'pay_1', expect.any(String))
  })

  it('handles payment.failed and marks failed status', async () => {
    verifyWebhookSignature.mockReturnValue(true)
    const req = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'paymongo-signature': 'ok' },
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'payment.failed',
            data: { id: 'pay_2', attributes: { payment_intent_id: 'pi_2' } },
          },
        },
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(updateBillingPaymentStatus).toHaveBeenCalledWith('pi_2', 'failed', { paymentId: 'pay_2' })
  })
})
