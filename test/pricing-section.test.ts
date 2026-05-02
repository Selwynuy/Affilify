import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Static-source assertions for the PricingSection. We don't have jsdom in the
 * vitest config (node env only), so instead of rendering the component we
 * verify structural invariants directly against the source file.
 *
 * If/when jsdom is added, swap these for a real RTL render that asserts on
 * data-badge="anchor" count.
 */

const SOURCE_PATH = join(process.cwd(), 'components/landing/sections/PricingSection.tsx')
const SOURCE = readFileSync(SOURCE_PATH, 'utf8')

describe('PricingSection — single anchor invariant', () => {
  it('renders exactly one data-badge="anchor" element across the section', () => {
    const matches = SOURCE.match(/data-badge="anchor"/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('does NOT render any "Best Value" pack badge that competes with the plan anchor', () => {
    expect(SOURCE).not.toContain('Best Value')
  })

  it('keeps the demoted pack indicator as a non-competing rate note', () => {
    expect(SOURCE).toContain('data-badge="rate-note"')
    expect(SOURCE).toContain('Best per-token rate')
  })

  it('removes very-low-opacity body text utilities flagged as a contrast risk', () => {
    // Pre-fix the section had text-brand-text/{25,30,40,45} on muted copy.
    // Disclaimer line was /25, header captions were /30 and /45, "monthly" was /40.
    expect(SOURCE).not.toContain('text-brand-text/25')
    expect(SOURCE).not.toMatch(/text-brand-text\/(30|40|45)\b/)
  })
})
