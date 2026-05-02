import { describe, expect, it, vi, beforeEach } from 'vitest'

const createAdminClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))

import {
  InsufficientBalanceError,
  commitTokenReservation,
  releaseExpiredTokenReservations,
  releaseTokenReservation,
  reserveTokens,
} from './reservations'

interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

function mockAdmin(handlers: Record<string, (args: Record<string, unknown>) => unknown>) {
  const calls: RpcCall[] = []
  createAdminClient.mockReturnValue({
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args })
      const handler = handlers[fn]
      if (!handler) return { data: null, error: { message: `unhandled rpc: ${fn}` } }
      const result = handler(args)
      if (result && typeof result === 'object' && 'error' in (result as object)) {
        return result
      }
      return { data: result, error: null }
    }),
  })
  return calls
}

beforeEach(() => {
  createAdminClient.mockReset()
})

describe('reserveTokens', () => {
  it('returns the reservation id from the RPC', async () => {
    mockAdmin({ reserve_tokens: () => '00000000-0000-0000-0000-000000000001' })
    const id = await reserveTokens({
      userId: 'u1',
      amount: 8,
      type: 'image_gen',
      description: 'Image generation',
      projectId: 'p1',
    })
    expect(id).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('throws InsufficientBalanceError when the RPC returns null', async () => {
    mockAdmin({ reserve_tokens: () => null })
    await expect(
      reserveTokens({ userId: 'u1', amount: 8, type: 'image_gen', description: 'Image generation' }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError)
  })

  it('passes through ttlSeconds (default 300) and project_id (default null)', async () => {
    const calls = mockAdmin({ reserve_tokens: () => 'r1' })
    await reserveTokens({ userId: 'u1', amount: 8, type: 'image_gen', description: 'd' })
    expect(calls[0].args).toMatchObject({
      p_user_id: 'u1',
      p_amount: 8,
      p_type: 'image_gen',
      p_description: 'd',
      p_project_id: null,
      p_ttl_seconds: 300,
    })
  })

  it('honors a custom ttlSeconds', async () => {
    const calls = mockAdmin({ reserve_tokens: () => 'r1' })
    await reserveTokens({ userId: 'u1', amount: 8, type: 'image_gen', description: 'd', ttlSeconds: 60 })
    expect(calls[0].args.p_ttl_seconds).toBe(60)
  })

  it('surfaces RPC errors verbatim', async () => {
    mockAdmin({ reserve_tokens: () => ({ data: null, error: { message: 'db down' } }) })
    await expect(
      reserveTokens({ userId: 'u1', amount: 8, type: 'image_gen', description: 'd' }),
    ).rejects.toThrow('db down')
  })
})

describe('commitTokenReservation', () => {
  it('returns true when the RPC commits successfully', async () => {
    mockAdmin({ commit_token_reservation: () => true })
    expect(await commitTokenReservation('r1')).toBe(true)
  })

  it('returns false when the reservation expired or was already released', async () => {
    mockAdmin({ commit_token_reservation: () => false })
    expect(await commitTokenReservation('r1')).toBe(false)
  })

  it('passes the reservation id to the RPC', async () => {
    const calls = mockAdmin({ commit_token_reservation: () => true })
    await commitTokenReservation('r1')
    expect(calls[0].args).toMatchObject({ p_reservation_id: 'r1' })
  })

  it('surfaces RPC errors', async () => {
    mockAdmin({ commit_token_reservation: () => ({ data: null, error: { message: 'rpc fail' } }) })
    await expect(commitTokenReservation('r1')).rejects.toThrow('rpc fail')
  })
})

describe('releaseTokenReservation', () => {
  it('returns true on successful release', async () => {
    mockAdmin({ release_token_reservation: () => true })
    expect(await releaseTokenReservation('r1', 'timeout')).toBe(true)
  })

  it('passes the reason through to the RPC and defaults to "released"', async () => {
    const calls = mockAdmin({ release_token_reservation: () => true })
    await releaseTokenReservation('r1')
    expect(calls[0].args).toMatchObject({ p_reservation_id: 'r1', p_reason: 'released' })

    await releaseTokenReservation('r1', 'timeout')
    expect(calls[1].args.p_reason).toBe('timeout')
  })

  it('returns false when the reservation does not exist', async () => {
    mockAdmin({ release_token_reservation: () => false })
    expect(await releaseTokenReservation('missing')).toBe(false)
  })
})

describe('releaseExpiredTokenReservations', () => {
  it('returns the count of expired rows', async () => {
    mockAdmin({ release_expired_token_reservations: () => 7 })
    expect(await releaseExpiredTokenReservations()).toBe(7)
  })

  it('coerces null to 0', async () => {
    mockAdmin({ release_expired_token_reservations: () => null })
    expect(await releaseExpiredTokenReservations()).toBe(0)
  })

  it('surfaces RPC errors', async () => {
    mockAdmin({ release_expired_token_reservations: () => ({ data: null, error: { message: 'cron fail' } }) })
    await expect(releaseExpiredTokenReservations()).rejects.toThrow('cron fail')
  })
})
