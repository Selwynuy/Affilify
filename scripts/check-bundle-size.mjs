#!/usr/bin/env node
/**
 * Bundle-size budget gate (Task X.2).
 *
 * Parses the Next.js build output (.next/build-manifest.json + per-route
 * client chunk sizes) and compares the first-load JS for the routes
 * listed in BUDGETS against a stored baseline.
 *
 * Modes:
 *   --warn    (default) Emit warnings for any regression; exit 0 always.
 *   --enforce Exit 1 when any route regresses by more than ALLOWED_GROWTH.
 *   --update  Write the current measurement back to the baseline.
 *
 * Baseline lives at scripts/bundle-size.baseline.json.
 *
 * Note: this is intentionally a small, dependency-free script. It does
 * NOT attempt to be precise about gzip — Next.js' build manifest gives
 * raw byte counts and that is good enough for trend detection. If/when
 * we want true gzip we can wire in `next build --profile`.
 */

import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const BUDGETS = {
  '/': 350_000,        // landing page first-load JS, raw bytes
  '/dashboard': 600_000, // studio page; current StudioCanvas is huge (155KB source)
}

const ALLOWED_GROWTH_PCT = 5

const BASELINE_PATH = resolve(__dirname, 'bundle-size.baseline.json')

const args = new Set(process.argv.slice(2))
const MODE = args.has('--enforce') ? 'enforce' : args.has('--update') ? 'update' : 'warn'

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function warn(msg) {
  console.warn(`⚠ ${msg}`)
}

function ok(msg) {
  console.log(`✓ ${msg}`)
}

function readManifest() {
  const manifestPath = resolve(ROOT, '.next/build-manifest.json')
  if (!existsSync(manifestPath)) {
    fail(`No build manifest at ${manifestPath}. Run \`next build\` first.`)
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

function fileSize(relPath) {
  const abs = resolve(ROOT, '.next', relPath)
  if (!existsSync(abs)) return 0
  return statSync(abs).size
}

function measureRoute(manifest, route) {
  // Next 16 manifest schema:
  //   manifest.pages['/'] = ['static/chunks/...js', ...]
  //   manifest.rootMainFiles = ['static/chunks/...js', ...]   (always loaded)
  const pages = manifest.pages?.[route] ?? manifest.pages?.[`${route}/page`] ?? []
  const root = manifest.rootMainFiles ?? []
  const seen = new Set()
  let total = 0
  for (const f of [...root, ...pages]) {
    if (seen.has(f)) continue
    seen.add(f)
    total += fileSize(f)
  }
  return total
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return {}
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

function saveBaseline(data) {
  writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function fmtBytes(n) {
  return `${(n / 1024).toFixed(1)} KB`
}

function main() {
  const manifest = readManifest()
  const baseline = loadBaseline()
  const current = {}
  let regressions = 0
  let budgetBreaches = 0

  for (const [route, budget] of Object.entries(BUDGETS)) {
    const size = measureRoute(manifest, route)
    current[route] = size
    const prev = baseline[route]
    const growthPct = prev ? ((size - prev) / prev) * 100 : 0

    if (size > budget) {
      budgetBreaches++
      warn(`${route} ${fmtBytes(size)} exceeds hard budget ${fmtBytes(budget)}`)
    }

    if (prev) {
      if (growthPct > ALLOWED_GROWTH_PCT) {
        regressions++
        warn(`${route} grew ${growthPct.toFixed(1)}% (${fmtBytes(prev)} → ${fmtBytes(size)})`)
      } else if (growthPct < -1) {
        ok(`${route} shrank ${Math.abs(growthPct).toFixed(1)}% (${fmtBytes(prev)} → ${fmtBytes(size)})`)
      } else {
        ok(`${route} stable at ${fmtBytes(size)} (Δ ${growthPct.toFixed(1)}%)`)
      }
    } else {
      ok(`${route} baseline recorded at ${fmtBytes(size)}`)
    }
  }

  if (MODE === 'update') {
    saveBaseline(current)
    ok(`Baseline written to ${BASELINE_PATH}`)
    return
  }

  if (MODE === 'enforce' && (regressions > 0 || budgetBreaches > 0)) {
    fail(`Bundle gate failed: ${regressions} regression(s), ${budgetBreaches} budget breach(es).`)
  }

  if (regressions > 0 || budgetBreaches > 0) {
    warn(`Bundle gate (warn-only): ${regressions} regression(s), ${budgetBreaches} budget breach(es).`)
  }
}

main()
