import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const getValidTikTokAccessToken = vi.hoisted(() => vi.fn())
const fetchTikTokPublishStatus = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/tiktok', () => ({ getValidTikTokAccessToken, fetchTikTokPublishStatus }))

import { GET } from './route'

describe('GET /api/tiktok/publish-status', () => {
  it('returns 400 when publishId missing', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    const req = new NextRequest('http://localhost/api/tiktok/publish-status')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns publish status for valid request', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    getValidTikTokAccessToken.mockResolvedValue({ accessToken: 'token' })
    fetchTikTokPublishStatus.mockResolvedValue({ status: 'PROCESSING' })
    const req = new NextRequest('http://localhost/api/tiktok/publish-status?publishId=pub_1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ publishId: 'pub_1', status: { status: 'PROCESSING' } })
  })
})
