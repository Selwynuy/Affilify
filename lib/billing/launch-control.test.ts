import { describe, expect, it, vi, afterEach } from 'vitest'

describe('billing launch control', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('derives funded token capacity from float and per-token cost', async () => {
    vi.stubEnv('BILLING_FUNDED_CAP_USD', '100')
    vi.stubEnv('BILLING_FUNDED_TOKEN_COST_USD', '0.002')

    const { getFundedTokenCapacityFromUsd } = await import('./launch-control')
    expect(getFundedTokenCapacityFromUsd(100)).toBe(50000)
  })

  it('uses the safer default token cost when no override is configured', async () => {
    vi.stubEnv('BILLING_FUNDED_CAP_USD', '100')

    const { getFundedTokenCapacityFromUsd } = await import('./launch-control')
    expect(getFundedTokenCapacityFromUsd(100)).toBe(21052)
  })
})
