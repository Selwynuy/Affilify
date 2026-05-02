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

describe('POST /api/projects/[id]/regenerate', () => {
  it('returns 400 for invalid id', async () => {
    verifySameOrigin.mockReturnValue(null)
    const req = new NextRequest('http://localhost/api/projects/not-uuid/regenerate', { method: 'POST', body: '{}' })
    const res = await POST(req, { params: Promise.resolve({ id: 'not-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const req = new NextRequest('http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000/regenerate', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(401)
  })

  it('forwards request to /api/generate with session headers', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'p1', avatar: {} } })) })),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [{ id: 'prod_1' }] })) })),
            })),
          })),
        }
      }),
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"type":"done"}\n', { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } })))

    const req = new NextRequest('http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000/regenerate', {
      method: 'POST',
      body: JSON.stringify({ productDescription: 're-run' }),
      headers: { cookie: 'sb=1', origin: 'http://localhost:3000' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalled()
  })
})
