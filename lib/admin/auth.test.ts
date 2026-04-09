import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: (fn: unknown) => fn }
})

import { verifyAdmin } from './auth'

describe('verifyAdmin', () => {
  it('returns null when no authenticated user', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } })
    expect(await verifyAdmin()).toBeNull()
  })

  it('returns user when is_admin is true', async () => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { is_admin: true } })) })),
        })),
      })),
    })
    expect(await verifyAdmin()).toEqual({ id: 'u1' })
  })
})
