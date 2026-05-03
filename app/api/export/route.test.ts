import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const getUserPlanId = vi.hoisted(() => vi.fn())
const getVideoEligibleBalance = vi.hoisted(() => vi.fn())
const syncSubscriptionTokenAccrual = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/billing/tokens', () => ({
  deductTokens: vi.fn(),
  getUserPlanId,
  getVideoEligibleBalance,
  refundTokens: vi.fn(),
  syncSubscriptionTokenAccrual,
}))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { POST } from './route'

// Strict v4 UUIDs — third group starts with 4, fourth with 8/9/a/b. The
// route validates with a strict regex; loose all-1s/2s won't pass.
const VALID_UUID = '11111111-1111-4111-8111-111111111111'
const VALID_IMAGE_UUID = '22222222-2222-4222-8222-222222222222'

describe('POST /api/export', () => {
  it('returns 401 when user is missing', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'p1', imageIds: [], motionPrompt: 'x' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 on rate limiting', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: false, resetAt: Date.now() + 60_000 })
    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({ projectId: VALID_UUID, imageIds: [], motionPrompt: 'x' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid payload (gate already passed for paid user)', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getUserPlanId.mockResolvedValue('pro')
    getVideoEligibleBalance.mockResolvedValue(1000)

    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'bad', imageIds: [], motionPrompt: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('blocks beta tester with 402 + top-up message when eligible balance is 0', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getUserPlanId.mockResolvedValue(null)
    getVideoEligibleBalance.mockResolvedValue(0)

    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({
        projectId: VALID_UUID,
        imageIds: [VALID_IMAGE_UUID],
        motionPrompt: 'walk by the camera',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.error).toMatch(/top-?up/i)
  })

  it('returns 402 with insufficient-tokens message when paid user has too few video tokens', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getUserPlanId.mockResolvedValue(null)
    // Just topped up a tiny amount but the requested video costs more.
    getVideoEligibleBalance.mockResolvedValue(10)

    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({
        projectId: VALID_UUID,
        imageIds: [VALID_IMAGE_UUID],
        motionPrompt: 'walk by the camera',
        videoModelId: 'hailuo-fast',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.error).toMatch(/insufficient/i)
    expect(body.error).toMatch(/video/i)
  })

  it('allows paid users with sufficient video-eligible tokens past the gate', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getUserPlanId.mockResolvedValue(null)
    getVideoEligibleBalance.mockResolvedValue(5000)

    // Invalid payload after the gate so we don't have to mock the full Replicate
    // pipeline — getting past 402 to the 400 validation proves the gate opened.
    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'bad', imageIds: [], motionPrompt: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
