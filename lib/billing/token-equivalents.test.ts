import { describe, expect, it } from 'vitest'
import { formatTokenEquivalentsShort, getTokenEquivalents } from './token-equivalents'
import { TOKEN_COSTS, VIDEO_MODELS } from '@/lib/data/plans'

describe('getTokenEquivalents', () => {
  it('translates 300 signup tokens into the documented outcome counts', () => {
    const eq = getTokenEquivalents(300)
    expect(eq.photos).toBe(Math.floor(300 / TOKEN_COSTS.image_gen)) // 37
    expect(eq.tokens).toBe(300)
  })

  it('orders video equivalents from cheapest to most expensive', () => {
    const eq = getTokenEquivalents(10_000)
    const costs = eq.videosByModel.map(v => v.tokenCost)
    const sorted = [...costs].sort((a, b) => a - b)
    expect(costs).toEqual(sorted)
  })

  it('exposes one entry per VIDEO_MODELS row', () => {
    const eq = getTokenEquivalents(10_000)
    expect(eq.videosByModel.length).toBe(VIDEO_MODELS.length)
  })

  it('floors video counts (no fractional videos)', () => {
    const cheapestCost = Math.min(...VIDEO_MODELS.map(m => m.tokenCost))
    // Choose a balance that does NOT divide evenly into the cheapest cost.
    const tokens = cheapestCost * 3 + 1
    const eq = getTokenEquivalents(tokens)
    expect(eq.cheapestVideoCount).toBe(3)
  })

  it('clamps zero, negative, NaN, and Infinity to zero outcomes', () => {
    for (const v of [0, -100, Number.NaN, -Infinity, Infinity]) {
      const eq = getTokenEquivalents(v as number)
      expect(eq.tokens).toBe(0)
      expect(eq.photos).toBe(0)
      expect(eq.cheapestVideoCount).toBe(0)
      for (const vm of eq.videosByModel) {
        expect(vm.count).toBe(0)
      }
    }
  })

  it('handles very large balances without overflow', () => {
    const eq = getTokenEquivalents(60_000) // Business plan monthly grant
    expect(eq.photos).toBe(Math.floor(60_000 / TOKEN_COSTS.image_gen))
    expect(eq.cheapestVideoCount).toBeGreaterThan(0)
  })

  it('matches direct math for image_gen cost', () => {
    const eq = getTokenEquivalents(TOKEN_COSTS.image_gen * 5)
    expect(eq.photos).toBe(5)
  })
})

describe('formatTokenEquivalentsShort', () => {
  it('returns a "photos OR videos" label for non-zero balances', () => {
    const label = formatTokenEquivalentsShort(300)
    expect(label).toMatch(/\d+ photos? OR \d+ .+ videos?/)
  })

  it('renders singular forms when count is exactly 1', () => {
    const oneVideoTokens = Math.min(...VIDEO_MODELS.map(m => m.tokenCost))
    const label = formatTokenEquivalentsShort(oneVideoTokens)
    expect(label).toMatch(/ 1 .+ video(?!s)/)
  })

  it('returns a zero-state label when tokens are zero', () => {
    expect(formatTokenEquivalentsShort(0)).toBe('0 photos · 0 videos')
  })

  it('treats negatives like zero', () => {
    expect(formatTokenEquivalentsShort(-50)).toBe('0 photos · 0 videos')
  })
})
