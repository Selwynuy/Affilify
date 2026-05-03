import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Static-source assertions for the PricingSection. We don't have jsdom in the
 * vitest config (node env only), so instead of rendering the component we
 * verify structural invariants directly against the source file.
 *
 * Updated for the waitlist-era design (Path B):
 *   - Top-up grid is removed from the landing page; only 3 monthly plans
 *     (Starter / Growth / Pro) plus the ₱99 Spark hero remain.
 *   - Single anchor invariant now means: Growth is the only plan tagged
 *     "Most Popular", and Spark is the only price-led hero.
 *   - All CTAs route to the waitlist (#top) while we collect early-access
 *     signups instead of running paid signups.
 */

const SOURCE_PATH = join(process.cwd(), 'components/landing/sections/PricingSection.tsx')
const SOURCE = readFileSync(SOURCE_PATH, 'utf8')

describe('PricingSection — waitlist-era invariants', () => {
  it('renders exactly one "Most Popular" plan anchor', () => {
    const matches = SOURCE.match(/Most Popular/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('does NOT render the legacy top-up grid badges', () => {
    // The old design had data-badge="anchor" on a featured pack and
    // data-badge="rate-note" on the demoted "Best per-token rate" tile.
    // The new design ships only plans + the Spark hero — those badges
    // must not return.
    expect(SOURCE).not.toContain('data-badge="anchor"')
    expect(SOURCE).not.toContain('data-badge="rate-note"')
    expect(SOURCE).not.toContain('Best per-token rate')
    expect(SOURCE).not.toContain('Best Value')
  })

  it('promotes the ₱99 Spark hero as the one launch offer', () => {
    expect(SOURCE).toContain('Special launch offer')
    expect(SOURCE).toContain('PHP 99')
  })

  it('routes all CTAs to the waitlist while early access is open', () => {
    // Plan + Spark CTAs should anchor to the hero waitlist (#top), not /signup.
    // Note: plan CTAs are templated (one source occurrence renders 3 cards),
    // so we check for presence rather than per-card multiplicity.
    expect(SOURCE).not.toContain('href="/signup"')
    expect(SOURCE).not.toContain('href="/signup?')
    const hashTopMatches = SOURCE.match(/href="#top"/g) ?? []
    expect(hashTopMatches.length).toBeGreaterThanOrEqual(2)
    expect(SOURCE).toContain('Join waitlist')
  })

  it('keeps muted body text within readable contrast utilities', () => {
    // Ban the very-low-opacity text utilities that previously failed the
    // accessibility audit. /60 and /65 are accepted minimums.
    expect(SOURCE).not.toContain('text-brand-text/25')
    expect(SOURCE).not.toMatch(/text-brand-text\/(30|40|45)\b/)
  })
})
