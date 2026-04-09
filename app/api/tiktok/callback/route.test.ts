import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
const cookies = vi.hoisted(() => vi.fn())
const exchangeTikTokCode = vi.hoisted(() => vi.fn())
const queryTikTokCreatorInfo = vi.hoisted(() => vi.fn())
const upsertTikTokAccount = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies }))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/tiktok', () => ({
  exchangeTikTokCode,
  queryTikTokCreatorInfo,
  upsertTikTokAccount,
}))

import { GET } from './route'

function cookieStore(state = 's1', verifier = 'v1') {
  return {
    get: vi.fn((key: string) => {
      if (key === 'tiktok_oauth_state') return { value: state }
      if (key === 'tiktok_oauth_verifier') return { value: verifier }
      return undefined
    }),
    delete: vi.fn(),
  }
}

describe('GET /api/tiktok/callback', () => {
  it('returns failure html when oauth params invalid', async () => {
    cookies.mockResolvedValue(cookieStore())
    const res = await GET(new Request('http://localhost/api/tiktok/callback?state=bad') as never)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('could not be verified')
  })

  it('returns success html after token exchange and upsert', async () => {
    cookies.mockResolvedValue(cookieStore('ok', 'verifier'))
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    })
    exchangeTikTokCode.mockResolvedValue({ access_token: 'token' })
    queryTikTokCreatorInfo.mockResolvedValue({ creator_username: 'creator' })
    upsertTikTokAccount.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost/api/tiktok/callback?code=abc&state=ok') as never)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('TikTok connected')
    expect(upsertTikTokAccount).toHaveBeenCalled()
  })
})
