import { describe, expect, it, vi, beforeEach } from 'vitest'

const createAdminClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { stripPii, track } from './track'

interface InsertedRow {
  user_id: string | null
  event: string
  props: Record<string, unknown>
}

function mockAdmin(insertResult: { error: { code?: string; message: string } | null } = { error: null }) {
  const inserted: InsertedRow[] = []
  const insertFn = vi.fn(async (row: InsertedRow) => {
    inserted.push(row)
    return insertResult
  })
  createAdminClient.mockReturnValue({
    from: vi.fn(() => ({ insert: insertFn })),
  })
  return { inserted, insertFn }
}

beforeEach(() => {
  createAdminClient.mockReset()
})

describe('stripPii', () => {
  it('removes known PII keys regardless of case', () => {
    const cleaned = stripPii({
      Email: 'a@b.com',
      ip: '1.2.3.4',
      PASSWORD: 'p',
      access_token: 't',
      project_id: 'keep-me',
    })
    expect(cleaned).toEqual({ project_id: 'keep-me' })
  })

  it('returns empty object for undefined input', () => {
    expect(stripPii(undefined)).toEqual({})
  })

  it('preserves non-PII keys including nested objects', () => {
    const cleaned = stripPii({ count: 3, meta: { foo: 'bar' } })
    expect(cleaned).toEqual({ count: 3, meta: { foo: 'bar' } })
  })
})

describe('track', () => {
  it('inserts user_id, event, and PII-scrubbed props', async () => {
    const { inserted } = mockAdmin()
    await track('first_image_generated', {
      userId: 'u1',
      props: { email: 'leak@example.com', projectId: 'p1' },
    })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toEqual({
      user_id: 'u1',
      event: 'first_image_generated',
      props: { projectId: 'p1' },
    })
  })

  it('allows anonymous events with null user_id', async () => {
    const { inserted } = mockAdmin()
    await track('signup', { props: { source: 'landing' } })
    expect(inserted[0].user_id).toBeNull()
  })

  it('swallows 23505 unique_violation silently (first_* idempotency)', async () => {
    mockAdmin({ error: { code: '23505', message: 'unique violation' } })
    await expect(
      track('first_image_generated', { userId: 'u1' }),
    ).resolves.toBeUndefined()
  })

  it('does not throw when the admin client throws', async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error('admin init failed')
    })
    await expect(track('signup', { userId: 'u1' })).resolves.toBeUndefined()
  })

  it('does not throw when insert returns a non-unique-violation error', async () => {
    mockAdmin({ error: { code: '42P01', message: 'relation does not exist' } })
    await expect(track('signup', { userId: 'u1' })).resolves.toBeUndefined()
  })

  it('defaults props to {} when omitted', async () => {
    const { inserted } = mockAdmin()
    await track('signup', { userId: 'u1' })
    expect(inserted[0].props).toEqual({})
  })
})
