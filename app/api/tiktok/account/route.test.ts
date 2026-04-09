import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
const getTikTokAccount = vi.hoisted(() => vi.fn())
const getValidTikTokAccessToken = vi.hoisted(() => vi.fn())
const queryTikTokCreatorInfo = vi.hoisted(() => vi.fn())
const updateTikTokCreatorProfile = vi.hoisted(() => vi.fn())
const revokeTikTokToken = vi.hoisted(() => vi.fn())
const deleteTikTokAccount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/tiktok', () => ({
  getTikTokAccount,
  getValidTikTokAccessToken,
  queryTikTokCreatorInfo,
  updateTikTokCreatorProfile,
  revokeTikTokToken,
  deleteTikTokAccount,
}))

import { GET, DELETE } from './route'

describe('/api/tiktok/account', () => {
  it('GET returns 401 for unauthenticated user', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns connected false when no account exists', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    getTikTokAccount.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ connected: false })
  })

  it('DELETE revokes and removes linked account', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    getTikTokAccount.mockResolvedValue({ access_token: 'token' })
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(revokeTikTokToken).toHaveBeenCalledWith('token')
    expect(deleteTikTokAccount).toHaveBeenCalledWith('u1')
  })
})
