import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Static contract test for scripts/check-bundle-size.mjs. We don't run
 * the script here (that would require a Next.js build artifact); instead
 * we lock in the public contract so a careless refactor can't silently
 * drop the warn/enforce/update modes or change the growth tolerance.
 */
const SCRIPT = readFileSync(join(process.cwd(), 'scripts/check-bundle-size.mjs'), 'utf8')

describe('scripts/check-bundle-size.mjs', () => {
  it('declares budgets for / and /dashboard routes', () => {
    expect(SCRIPT).toMatch(/['"]\/['"]\s*:\s*\d+/)
    expect(SCRIPT).toMatch(/['"]\/dashboard['"]\s*:\s*\d+/)
  })

  it('uses a 5% growth tolerance', () => {
    expect(SCRIPT).toMatch(/ALLOWED_GROWTH_PCT\s*=\s*5\b/)
  })

  it('supports warn (default), enforce, and update modes', () => {
    expect(SCRIPT).toContain("'enforce'")
    expect(SCRIPT).toContain("'update'")
    expect(SCRIPT).toContain("'warn'")
  })

  it('reads the build manifest from .next/build-manifest.json', () => {
    expect(SCRIPT).toContain('.next/build-manifest.json')
  })

  it('persists baseline to scripts/bundle-size.baseline.json', () => {
    expect(SCRIPT).toMatch(/bundle-size\.baseline\.json/)
  })

  it('exits non-zero only in enforce mode', () => {
    // grep for the enforce-gate exit
    expect(SCRIPT).toMatch(/MODE === 'enforce'[\s\S]*?process\.exit\(1\)|fail\(/)
  })
})
