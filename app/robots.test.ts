import { describe, expect, it } from 'vitest'
import robots from './robots'

describe('app/robots', () => {
  it('allows root crawling', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    expect(rules[0].userAgent).toBe('*')
    expect(rules[0].allow).toBe('/')
  })

  it('disallows admin, API, and authenticated areas', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallow = rules[0].disallow as string[]
    for (const path of ['/api/', '/admin', '/dashboard', '/billing', '/projects', '/templates', '/auth/']) {
      expect(disallow.some(d => d.startsWith(path) || d === path)).toBe(true)
    }
  })

  it('points to the sitemap URL', () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/)
  })

  it('declares a host', () => {
    expect(robots().host).toMatch(/^https?:\/\//)
  })
})
