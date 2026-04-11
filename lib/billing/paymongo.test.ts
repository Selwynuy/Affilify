import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { verifyWebhookSignature } from './paymongo'

const RAW_BODY = JSON.stringify({
  data: {
    id: 'evt_123',
    attributes: { type: 'payment.paid' },
  },
})

function buildSignatureHeader(timestamp: number, body = RAW_BODY, secret = 'whsec_test') {
  const payload = `${timestamp}.${body}`
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `t=${timestamp},te=${signature}`
}

describe('verifyWebhookSignature', () => {
  afterEach(() => {
    delete process.env.PAYMONGO_WEBHOOK_SECRET
    vi.useRealTimers()
  })

  it('accepts a valid recent signature', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'))

    const timestamp = Math.floor(Date.now() / 1000)
    const header = buildSignatureHeader(timestamp)

    expect(verifyWebhookSignature(RAW_BODY, header)).toBe(true)
  })

  it('rejects a stale signature even when the HMAC matches', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'))

    const staleTimestamp = Math.floor(Date.now() / 1000) - (5 * 60 + 1)
    const header = buildSignatureHeader(staleTimestamp)

    expect(verifyWebhookSignature(RAW_BODY, header)).toBe(false)
  })

  it('rejects a malformed timestamp', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test'

    expect(verifyWebhookSignature(RAW_BODY, 't=not-a-timestamp,te=abcd')).toBe(false)
  })
})
