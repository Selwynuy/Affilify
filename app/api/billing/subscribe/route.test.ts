import { describe, expect, it, vi } from 'vitest'

vi.stubEnv('PAYMONGO_PLAN_STARTER', 'plan_starter')

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const getBillingControls = vi.hoisted(() => vi.fn())
const createSubscription = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 1000, remaining: 99 })))

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/billing/launch-control', () => ({ getBillingControls }))
vi.mock('@/lib/billing/paymongo', () => ({ createSubscription }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})

function withUser(email = 'buyer@example.com') {
  createClient.mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1', email } } })) },
  })
}

function withAdmin() {
  const single = vi.fn()
  createAdminClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single,
            })),
          })),
          upsert: vi.fn(async () => ({ error: null })),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  })
  return { single }
}

describe('POST /api/billing/subscribe', () => {
  it('returns 401 when unauthenticated', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/billing/subscribe', { method: 'POST', body: '{}' }) as never)
    expect(res.status).toBe(401)
  })

  it('returns 409 when staggered models are paused', async () => {
    verifySameOrigin.mockReturnValue(null)
    withUser()
    createAdminClient.mockReturnValue({})
    getBillingControls.mockResolvedValue({
      subscriptionsEnabled: false,
      subscriptionMessage: 'Staggered models are not available at this time.',
    })
    const { POST } = await import('./route')

    const res = await POST(new Request('http://localhost/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'cus_1', planId: 'starter', paymentMethodId: 'pm_1' }),
    }) as never)

    expect(res.status).toBe(409)
  })

  it('creates a staggered model record', async () => {
    verifySameOrigin.mockReturnValue(null)
    withUser()
    const { single } = withAdmin()
    single.mockResolvedValue({ data: null })
    getBillingControls.mockResolvedValue({
      subscriptionsEnabled: true,
      subscriptionMessage: null,
    })
    createSubscription.mockResolvedValue({
      id: 'sub_1',
      attributes: {
        status: 'incomplete',
        next_billing_schedule: '2026-05-12T00:00:00.000Z',
        latest_invoice: null,
        setup_intent: null,
      },
    })
    const { POST } = await import('./route')

    const res = await POST(new Request('http://localhost/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'cus_1', planId: 'starter', paymentMethodId: 'pm_1' }),
    }) as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.subscriptionId).toBe('sub_1')
  })
})
