import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))

describe('billing token accrual', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('rounds daily tranche amounts and preserves the monthly total', async () => {
    const { __testing__ } = await import('./tokens')

    const amounts = Array.from({ length: 30 }, (_, index) => __testing__.getTrancheAmount(4000, 30, index))
    expect(amounts.slice(0, 10).every((amount) => amount === 134)).toBe(true)
    expect(amounts.slice(10).every((amount) => amount === 133)).toBe(true)
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(4000)
  })

  it('only releases the next daily tranche when the next day arrives', async () => {
    vi.setSystemTime(new Date('2026-04-12T10:00:00.000Z'))
    const { __testing__ } = await import('./tokens')

    const periodStart = new Date('2026-04-12T00:00:00.000Z')
    const periodEnd = new Date('2026-05-12T00:00:00.000Z')

    expect(__testing__.getDueTrancheCount(periodStart, periodEnd, 30, new Date('2026-04-12T23:59:59.000Z'))).toBe(1)
    expect(__testing__.getDueTrancheCount(periodStart, periodEnd, 30, new Date('2026-04-13T00:00:00.000Z'))).toBe(2)
    expect(__testing__.getDueTrancheCount(periodStart, periodEnd, 30, new Date('2026-04-14T00:00:00.000Z'))).toBe(3)
  })

  it('normalizes corrupted legacy grant descriptions', async () => {
    const { __testing__ } = await import('./tokens')

    expect(__testing__.normalizeGrantDescription('Monthly grant Ã¢â‚¬â€ Starter plan')).toBe('Monthly grant — Starter plan')
    expect(__testing__.normalizeGrantDescription('Monthly grant â€” Starter plan')).toBe('Monthly grant — Starter plan')
  })

  it('does not add daily accrual on top of a legacy upfront monthly grant in the same period', async () => {
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))

    const subscriptionsSingle = vi.fn(async () => ({
      data: {
        plan_id: 'starter',
        status: 'active',
        current_period_start: '2026-04-12T00:00:00.000Z',
        current_period_end: '2026-05-12T00:00:00.000Z',
      },
    }))
    const insert = vi.fn()

    createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: subscriptionsSingle,
              })),
            })),
          }
        }

        if (table === 'token_ledger') {
          return {
            select: vi.fn((columns: string) => {
              if (columns === 'description, created_at') {
                return {
                  eq: vi.fn(() => ({
                    eq: vi.fn(async () => ({
                      data: [{
                        description: 'Monthly grant Ã¢â‚¬â€ Starter plan',
                        created_at: '2026-04-12T00:30:00.000Z',
                      }],
                    })),
                  })),
                }
              }

              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({ data: null })),
                    })),
                  })),
                })),
              }
            }),
            insert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const { syncSubscriptionTokenAccrual } = await import('./tokens')
    await syncSubscriptionTokenAccrual('u1')

    expect(insert).not.toHaveBeenCalled()
  })

  it('does not backfill all missed days in a single sync', async () => {
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))

    const subscriptionsSingle = vi.fn(async () => ({
      data: {
        plan_id: 'starter',
        status: 'active',
        current_period_start: '2026-04-12T00:00:00.000Z',
        current_period_end: '2026-05-12T00:00:00.000Z',
      },
    }))
    const insert = vi.fn()
    const maybeSingle = vi.fn(async () => ({ data: null }))

    createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: subscriptionsSingle,
              })),
            })),
          }
        }

        if (table === 'token_ledger') {
          return {
            select: vi.fn((columns: string) => {
              if (columns === 'description, created_at') {
                return {
                  eq: vi.fn(() => ({
                    eq: vi.fn(async () => ({ data: [] })),
                  })),
                }
              }

              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      maybeSingle,
                    })),
                  })),
                })),
              }
            }),
            insert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const { syncSubscriptionTokenAccrual } = await import('./tokens')
    await syncSubscriptionTokenAccrual('u1')

    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      amount: 134,
      description: 'Subscription accrual 4/30 - Starter - 2026-04-12T00:00:00.000Z',
    }))
  })

  it('does not grant duplicate or backfilled tokens when sync runs twice on the same day', async () => {
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))

    const subscriptionsSingle = vi.fn(async () => ({
      data: {
        plan_id: 'starter',
        status: 'active',
        current_period_start: '2026-04-12T00:00:00.000Z',
        current_period_end: '2026-05-12T00:00:00.000Z',
      },
    }))

    const insert = vi.fn()
    let currentGrantExists = false

    createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: subscriptionsSingle,
              })),
            })),
          }
        }

        if (table === 'token_ledger') {
          return {
            select: vi.fn((columns: string) => {
              if (columns === 'description, created_at') {
                return {
                  eq: vi.fn(() => ({
                    eq: vi.fn(async () => ({ data: [] })),
                  })),
                }
              }

              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({
                        data: currentGrantExists ? { user_id: 'u1' } : null,
                      })),
                    })),
                  })),
                })),
              }
            }),
            insert: vi.fn(async (payload: unknown) => {
              currentGrantExists = true
              return insert(payload)
            }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const { syncSubscriptionTokenAccrual } = await import('./tokens')
    await syncSubscriptionTokenAccrual('u1')
    await syncSubscriptionTokenAccrual('u1')

    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      amount: 134,
      description: 'Subscription accrual 4/30 - Starter - 2026-04-12T00:00:00.000Z',
    }))
  })
})
