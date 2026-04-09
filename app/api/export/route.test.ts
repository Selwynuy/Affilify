import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const getTokenBalance = vi.hoisted(() => vi.fn())
const getUserPlanId = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/billing/tokens', () => ({ deductTokens: vi.fn(), getTokenBalance, getUserPlanId }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { POST } from './route'

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
      body: JSON.stringify({ projectId: '11111111-1111-1111-1111-111111111111', imageIds: [], motionPrompt: 'x' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid payload', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    getUserPlanId.mockResolvedValue('pro')
    getTokenBalance.mockResolvedValue(1000)

    const req = new NextRequest('http://localhost/api/export', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'bad', imageIds: [], motionPrompt: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
