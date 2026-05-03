import { describe, expect, it } from 'vitest'
import { RATE_LIMITS } from './rate-limit-policy'

describe('RATE_LIMITS policy', () => {
  it('declares positive integers for every limit and windowMs', () => {
    for (const [name, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.limit, `${name}.limit`).toBeGreaterThan(0)
      expect(Number.isInteger(cfg.limit), `${name}.limit integer`).toBe(true)
      expect(cfg.windowMs, `${name}.windowMs`).toBeGreaterThan(0)
      expect(Number.isInteger(cfg.windowMs), `${name}.windowMs integer`).toBe(true)
    }
  })

  it('uses tighter limits for expensive third-party calls than for cheap reads', () => {
    expect(RATE_LIMITS.tiktokShare.limit).toBeLessThanOrEqual(RATE_LIMITS.tiktokAccount.limit)
    expect(RATE_LIMITS.userModelGenerate.limit).toBeLessThanOrEqual(RATE_LIMITS.preferences.limit)
    expect(RATE_LIMITS.billingSubscribe.limit).toBeLessThanOrEqual(RATE_LIMITS.billingCheckout.limit)
  })

  it('keeps support ticket creation strictly bounded per hour', () => {
    expect(RATE_LIMITS.supportTicketCreate.windowMs).toBe(60 * 60_000)
    expect(RATE_LIMITS.supportTicketCreate.limit).toBeLessThanOrEqual(10)
  })

  it('caps auth signup at no more than 10/hr/IP to slow brute-force account creation', () => {
    expect(RATE_LIMITS.authSignup.windowMs).toBeGreaterThanOrEqual(60 * 60_000)
    expect(RATE_LIMITS.authSignup.limit).toBeLessThanOrEqual(10)
  })

  it('declares a workflowTemplatesRead policy with a sensible read limit', () => {
    expect(RATE_LIMITS.workflowTemplatesRead).toBeDefined()
    expect(RATE_LIMITS.workflowTemplatesRead.limit).toBeGreaterThanOrEqual(30)
    expect(RATE_LIMITS.workflowTemplatesRead.windowMs).toBe(60_000)
  })
})
