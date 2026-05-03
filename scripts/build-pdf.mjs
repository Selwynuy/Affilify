#!/usr/bin/env node
/**
 * Convert a Markdown doc → printable PDF via Playwright's headless Chromium.
 *
 * Usage:
 *   node scripts/build-pdf.mjs [input.md] [output.pdf]
 *
 * Defaults:
 *   input  = docs/TESTER-WALKTHROUGH.md
 *   output = docs/TESTER-WALKTHROUGH.pdf
 *
 * No new npm deps — uses the @playwright/test chromium that's already
 * installed for E2E. The Markdown parser is a small inline implementation
 * targeting the subset we actually use (headings, lists, tables, code,
 * blockquote, bold/italic, links). For richer markdown, swap in `marked`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const inputArg = process.argv[2] ?? 'docs/TESTER-WALKTHROUGH.md'
const outputArg = process.argv[3] ?? 'docs/TESTER-WALKTHROUGH.pdf'
const inputPath = resolve(repoRoot, inputArg)
const outputPath = resolve(repoRoot, outputArg)

if (!existsSync(inputPath)) {
  console.error(`✗ Input file not found: ${inputPath}`)
  process.exit(1)
}

console.log(`→ Reading ${inputArg}`)
const markdown = readFileSync(inputPath, 'utf8')

// ── Tiny markdown → HTML converter ─────────────────────────────────────────
// Handles only what TESTER-WALKTHROUGH uses. Order matters: process block-
// level constructs (code fences, tables, headings, lists) before inline
// formatting (bold/italic/links/code).

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text) {
  // inline code first so we don't double-format inside it
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
  // bold (**)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italic (*) — careful not to match list bullets at line starts
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  // links [text](href)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return text
}

function renderTable(lines) {
  // First line: header. Second line: alignment row (---|---). Rest: body.
  const rows = lines.map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
  const header = rows[0]
  const body = rows.slice(2)
  const head = `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>`
  const bodyHtml = body
    .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table>${head}<tbody>${bodyHtml}</tbody></table>`
}

function markdownToHtml(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0
  let inList = null // null | 'ul' | 'ol'

  function closeList() {
    if (inList) {
      out.push(`</${inList}>`)
      inList = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // Code fence
    if (line.startsWith('```')) {
      closeList()
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      out.push(
        `<pre class="lang-${escapeHtml(lang)}"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      )
      continue
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      closeList()
      out.push('<hr/>')
      i++
      continue
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const level = h[1].length
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`)
      i++
      continue
    }

    // Table — detect header line followed by alignment row
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-: |]+\s*\|?\s*$/.test(lines[i + 1])) {
      closeList()
      const tableLines = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      out.push(renderTable(tableLines))
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      closeList()
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      out.push(`<blockquote><p>${renderInline(quoteLines.join(' '))}</p></blockquote>`)
      continue
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      if (inList !== 'ul') {
        closeList()
        out.push('<ul>')
        inList = 'ul'
      }
      // Checkboxes - [ ] / - [x]
      const cb = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/)
      if (cb) {
        const checked = cb[1].toLowerCase() === 'x'
        out.push(
          `<li class="checkbox"><span class="box ${checked ? 'on' : ''}">${checked ? '✓' : ''}</span> ${renderInline(cb[2])}</li>`,
        )
      } else {
        const m = line.match(/^\s*[-*]\s+(.*)$/)
        out.push(`<li>${renderInline(m[1])}</li>`)
      }
      i++
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        closeList()
        out.push('<ol>')
        inList = 'ol'
      }
      const m = line.match(/^\s*\d+\.\s+(.*)$/)
      out.push(`<li>${renderInline(m[1])}</li>`)
      i++
      continue
    }

    // Blank line — close any open list, do nothing else
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // Plain paragraph — collect consecutive non-empty lines
    closeList()
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !/^\s*[-*\d]/.test(lines[i]) && !lines[i].startsWith('> ')) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      out.push(`<p>${renderInline(paraLines.join(' '))}</p>`)
    }
  }

  closeList()
  return out.join('\n')
}

const bodyHtml = markdownToHtml(markdown)

// ── HTML wrapper with print-friendly styles ────────────────────────────────
const docTitle = (markdown.match(/^#\s+(.+)$/m)?.[1] ?? basename(inputPath, '.md'))
  .replace(/<[^>]*>/g, '')
  .trim()

const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 22mm 16mm;
    }
    :root {
      --accent: #8b5cf6;
      --ink: #1a1a23;
      --muted: #555;
      --bg-soft: #f6f3fb;
      --rule: #e5e0ee;
    }
    * { box-sizing: border-box; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: var(--ink);
      font-size: 11pt;
      line-height: 1.55;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 {
      font-size: 24pt;
      letter-spacing: -0.01em;
      margin: 0 0 0.4em;
      page-break-after: avoid;
    }
    h2 {
      font-size: 16pt;
      margin: 1.6em 0 0.5em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid var(--rule);
      page-break-after: avoid;
    }
    h3 {
      font-size: 13pt;
      margin: 1.2em 0 0.4em;
      page-break-after: avoid;
    }
    h4 { font-size: 11.5pt; margin: 1em 0 0.3em; page-break-after: avoid; }
    p { margin: 0.5em 0; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { color: var(--ink); }
    code {
      font-family: 'SF Mono', Menlo, Consolas, monospace;
      font-size: 0.9em;
      background: var(--bg-soft);
      padding: 0.1em 0.35em;
      border-radius: 4px;
      color: #5a3aa8;
    }
    pre {
      background: var(--bg-soft);
      border: 1px solid var(--rule);
      border-radius: 6px;
      padding: 12px 14px;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
      font-size: 9.5pt;
      line-height: 1.5;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: var(--ink);
    }
    ul, ol { padding-left: 1.4em; margin: 0.5em 0; }
    li { margin: 0.2em 0; }
    li.checkbox { list-style: none; margin-left: -1em; }
    li.checkbox .box {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1.4px solid var(--accent);
      border-radius: 3px;
      vertical-align: middle;
      text-align: center;
      line-height: 11px;
      font-size: 10px;
      color: white;
      margin-right: 6px;
    }
    li.checkbox .box.on { background: var(--accent); }
    blockquote {
      margin: 0.8em 0;
      padding: 8px 14px;
      border-left: 3px solid var(--accent);
      background: var(--bg-soft);
      border-radius: 0 6px 6px 0;
      color: var(--muted);
    }
    blockquote p { margin: 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.8em 0;
      font-size: 10pt;
      page-break-inside: auto;
    }
    th, td {
      border: 1px solid var(--rule);
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--bg-soft);
      font-weight: 700;
    }
    hr {
      border: none;
      border-top: 1px solid var(--rule);
      margin: 2em 0;
    }
    /* Brand badge in header */
    .brand-badge {
      display: inline-block;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.5em;
    }
  </style>
</head>
<body>
  <div class="brand-badge">Genetrify · Beta tester guide</div>
  ${bodyHtml}
</body>
</html>`

// Write a temp HTML file (also handy for debugging the render)
mkdirSync(dirname(outputPath), { recursive: true })
const debugHtmlPath = outputPath.replace(/\.pdf$/i, '.html')
writeFileSync(debugHtmlPath, fullHtml, 'utf8')
console.log(`→ Wrote intermediate HTML ${basename(debugHtmlPath)}`)

// ── Playwright render → PDF ────────────────────────────────────────────────
console.log(`→ Launching headless chromium`)

const { chromium } = await import('playwright')
const browser = await chromium.launch()
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.setContent(fullHtml, { waitUntil: 'networkidle' })
  await page.emulateMedia({ media: 'print' })

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="font-size:8pt;color:#888;width:100%;padding:0 16mm;display:flex;justify-content:space-between;">
        <span>Genetrify · Tester walkthrough</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `,
    margin: { top: '18mm', bottom: '22mm', left: '16mm', right: '16mm' },
  })

  console.log(`✓ PDF written: ${outputPath}`)
} finally {
  await browser.close()
}
