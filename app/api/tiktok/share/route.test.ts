import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 1000, remaining: 99 })))
const getValidTikTokAccessToken = vi.hoisted(() => vi.fn())
const queryTikTokCreatorInfo = vi.hoisted(() => vi.fn())
const initTikTokDirectPost = vi.hoisted(() => vi.fn())
const uploadVideoToTikTok = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/tiktok', () => ({
  fetchTikTokPublishStatus: vi.fn(async () => null),
  getValidTikTokAccessToken,
  initTikTokDirectPost,
  queryTikTokCreatorInfo,
  uploadVideoToTikTok,
}))

import { POST } from './route'

describe('POST /api/tiktok/share', () => {
  it('returns 400 if storageFileId is missing', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    const req = new NextRequest('http://localhost/api/tiktok/share', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when storage file is not found', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              })),
            })),
          })),
        })),
      })),
    })
    const req = new NextRequest('http://localhost/api/tiktok/share', {
      method: 'POST',
      body: JSON.stringify({ storageFileId: '550e8400-e29b-41d4-a716-446655440000', privacyLevel: 'SELF_ONLY' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('uploads and returns publish id on success', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { public_url: 'https://cdn.example/video.mp4', file_type: 'generated_video' },
                  error: null,
                })),
              })),
            })),
          })),
        })),
      })),
    })
    getValidTikTokAccessToken.mockResolvedValue({ accessToken: 'token' })
    queryTikTokCreatorInfo.mockResolvedValue({
      privacy_level_options: ['SELF_ONLY'],
      comment_disabled: false,
      duet_disabled: false,
      stitch_disabled: false,
    })
    initTikTokDirectPost.mockResolvedValue({ upload_url: 'https://upload', publish_id: 'pub_1' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('video', { status: 200, headers: { 'content-type': 'video/mp4' } })))

    const req = new NextRequest('http://localhost/api/tiktok/share', {
      method: 'POST',
      body: JSON.stringify({ storageFileId: '550e8400-e29b-41d4-a716-446655440000', privacyLevel: 'SELF_ONLY' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, publishId: 'pub_1' })
    expect(uploadVideoToTikTok).toHaveBeenCalled()
  })
})
