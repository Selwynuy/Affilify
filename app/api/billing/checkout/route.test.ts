import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
const createPaymentIntent = vi.hoisted(() => vi.fn())
const createQRPHPaymentMethod = vi.hoisted(() => vi.fn())
const attachQRPHPaymentMethod = vi.hoisted(() => vi.fn())
const createBillingPayment = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const getCreditPack = vi.hoisted(() => vi.fn())
const getBillingControls = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({})) }))
vi.mock('@/lib/billing/paymongo', () => ({
  createPaymentIntent,
  createQRPHPaymentMethod,
  attachQRPHPaymentMethod,
}))
vi.mock('@/lib/billing/payments', () => ({ createBillingPayment }))
vi.mock('@/lib/billing/launch-control', () => ({ getBillingControls }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/data/plans', () => ({ getCreditPack }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { POST } from './route'

function withUser(email = 'buyer@example.com') {
  createClient.mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1', email } } })) },
  })
}

describe('POST /api/billing/checkout', () => {
  it('returns 401 when unauthenticated', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const res = await POST(new Request('http://localhost/api/billing/checkout', { method: 'POST', body: '{}' }) as never)
    expect(res.status).toBe(401)
  })

  it('returns 429 on rate limit hit', async () => {
    verifySameOrigin.mockReturnValue(null)
    withUser()
    getBillingControls.mockResolvedValue({ topupsEnabled: true, topupMessage: null })
    rateLimit.mockResolvedValue({ allowed: false, resetAt: Date.now() + 60_000 })
    const res = await POST(new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ packId: 'basic' }),
    }) as never)
    expect(res.status).toBe(429)
  })

  it('creates checkout and returns QR code payload', async () => {
    verifySameOrigin.mockReturnValue(null)
    withUser()
    getBillingControls.mockResolvedValue({ topupsEnabled: true, topupMessage: null })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getCreditPack.mockReturnValue({ id: 'basic', name: 'Basic', tokens: 100, priceCentavos: 9900 })
    createPaymentIntent.mockResolvedValue({ id: 'pi_1', attributes: { client_key: 'ck_1' } })
    createQRPHPaymentMethod.mockResolvedValue({ id: 'pm_1' })
    attachQRPHPaymentMethod.mockResolvedValue({
      attributes: { next_action: { code: { image_url: 'https://qr.example/img.png' } } },
    })

    const res = await POST(new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ packId: 'basic' }),
    }) as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.intentId).toBe('pi_1')
    expect(body.qrCode).toContain('https://qr.example')
    expect(createBillingPayment).toHaveBeenCalled()
  })

  it('returns 409 when top-ups are paused by funding controls', async () => {
    verifySameOrigin.mockReturnValue(null)
    withUser()
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getCreditPack.mockReturnValue({ id: 'basic', name: 'Basic', tokens: 100, priceCentavos: 9900 })
    getBillingControls.mockResolvedValue({
      topupsEnabled: false,
      topupMessage: 'Token top-ups are temporarily paused because the funded token allocation has been fully reserved.',
    })

    const res = await POST(new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ packId: 'basic' }),
    }) as never)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('temporarily paused')
  })
})
