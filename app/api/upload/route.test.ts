import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 1000, remaining: 99 })))

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})

import { POST } from './route'

describe('POST /api/upload', () => {
  it('returns 401 when user is not authenticated', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: new FormData() })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('validates onboarding face upload presence', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue({
      storage: { from: vi.fn(() => ({ upload: vi.fn(), createSignedUrl: vi.fn() })) },
    })
    const form = new FormData()
    form.set('onboardingFaceOnly', 'true')
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
