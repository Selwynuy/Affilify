import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const getTokenBalance = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/billing/tokens', () => ({ deductTokens: vi.fn(), getTokenBalance }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { POST } from './route'

describe('POST /api/user-models/generate', () => {
  it('returns 401 when unauthorized', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const req = new NextRequest('http://localhost/api/user-models/generate', { method: 'POST', body: '{}' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 on rate limit hit', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: false, resetAt: Date.now() + 30_000 })
    const req = new NextRequest('http://localhost/api/user-models/generate', { method: 'POST', body: '{}' })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 402 for low token balance', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 30_000 })
    getTokenBalance.mockResolvedValue(0)
    const req = new NextRequest('http://localhost/api/user-models/generate', {
      method: 'POST',
      body: JSON.stringify({ useCustomFace: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(402)
  })
})
