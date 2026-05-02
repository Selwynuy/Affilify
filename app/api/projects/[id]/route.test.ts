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

import { GET, PATCH, DELETE } from './route'

describe('/api/projects/[id]', () => {
  it('returns 400 for invalid project id', async () => {
    verifySameOrigin.mockReturnValue(null)
    const req = new NextRequest('http://localhost/api/projects/not-uuid')
    const res = await GET(req, { params: Promise.resolve({ id: 'not-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('PATCH returns unauthorized for missing session', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const req = new NextRequest('http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(401)
  })

  it('DELETE returns unauthorized for missing session', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const req = new NextRequest('http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(401)
  })

  it('PATCH rejects moving a project into another user folder', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'project_folders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null })),
                })),
              })),
            })),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    })

    const req = new NextRequest('http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: '550e8400-e29b-41d4-a716-446655440001' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(404)
  })
})
