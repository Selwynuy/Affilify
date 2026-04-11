#!/usr/bin/env node
/**
 * Compare pinned `replicateVersion` values in lib/data/plans.ts against
 * Replicate's `latest_version.id` for each VIDEO_MODELS slug.
 *
 * Usage (from repo root):
 *   REPLICATE_API_KEY=r8_... node scripts/verify-replicate-model-versions.mjs
 *
 * Exit 0: every pinned hash matches latest (or API returned no latest — warn).
 * Exit 1: mismatch, missing key, or fetch error.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const plansPath = join(repoRoot, 'lib', 'data', 'plans.ts')

/** Load `.env.local` / `.env` like Next.js — plain `node` does not read them. Shell vars win if already set. */
function loadDotenvFiles(rootDir) {
  for (const name of ['.env.local', '.env']) {
    const filePath = join(rootDir, name)
    try {
      const text = readFileSync(filePath, 'utf8')
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        let key = trimmed.slice(0, eq).trim()
        if (key.startsWith('export ')) key = key.slice(7).trim()
        let val = trimmed.slice(eq + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        val = val.trim()
        if (process.env[key] === undefined) process.env[key] = val
      }
    } catch {
      /* missing or unreadable */
    }
  }
}

loadDotenvFiles(repoRoot)

const token = process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN
if (!token) {
  console.error(
    'No Replicate token found. Set REPLICATE_API_KEY in .env.local (or REPLICATE_API_TOKEN), or export it in your shell.',
  )
  process.exit(1)
}

const plansSource = readFileSync(plansPath, 'utf8')

/** @type {{ id: string; slug: string; pinned: string }[]} */
const pinned = []
const videoBlock = plansSource.includes('export const VIDEO_MODELS')
  ? plansSource.slice(plansSource.indexOf('export const VIDEO_MODELS'))
  : plansSource

for (const m of videoBlock.matchAll(
  /id:\s*'([^']+)'[\s\S]*?replicateSlug:\s*'([^']+)'[\s\S]*?replicateVersion:\s*'([a-f0-9]{64})'/g,
)) {
  pinned.push({ id: m[1], slug: m[2], pinned: m[3] })
}

if (pinned.length === 0) {
  console.error('Could not parse VIDEO_MODELS entries from lib/data/plans.ts')
  process.exit(1)
}

let failed = false

for (const row of pinned) {
  const [owner, name] = row.slug.split('/')
  if (!owner || !name) {
    console.error(`Bad slug for ${row.id}: ${row.slug}`)
    failed = true
    continue
  }

  const url = `https://api.replicate.com/v1/models/${owner}/${name}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`${row.id} (${row.slug}): API ${res.status} — ${body.slice(0, 200)}`)
    failed = true
    continue
  }

  const data = await res.json()
  const latest = data.latest_version?.id ?? null

  if (!latest) {
    console.warn(`${row.id}: no latest_version.id in API response — skipped compare`)
    continue
  }

  const match = latest === row.pinned
  const status = match ? 'OK' : 'MISMATCH'
  console.log(`${status}  ${row.id}  pinned=${row.pinned.slice(0, 12)}…  latest=${latest.slice(0, 12)}…`)

  if (!match) {
    console.error(`  Update lib/data/plans.ts replicateVersion for ${row.id} to:\n  ${latest}`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log('All pinned versions match Replicate latest_version.')
