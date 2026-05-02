import { describe, expect, it } from 'vitest'
import sitemap from './sitemap'

describe('app/sitemap', () => {
  it('returns the canonical public-facing URLs', () => {
    const urls = sitemap().map(e => e.url)
    for (const path of ['/', '/login', '/signup', '/cookies', '/privacy', '/terms', '/refunds', '/forgot-password']) {
      expect(urls.some(u => u.endsWith(path))).toBe(true)
    }
  })

  it('does NOT include authenticated, admin, or API routes', () => {
    const urls = sitemap().map(e => e.url)
    for (const forbidden of ['/api', '/admin', '/dashboard', '/projects', '/billing', '/support', '/templates']) {
      expect(urls.some(u => u.includes(forbidden))).toBe(false)
    }
  })

  it('uses absolute URLs anchored on a single host with no trailing slash before the path', () => {
    for (const entry of sitemap()) {
      expect(entry.url).toMatch(/^https?:\/\/[^/]+(\/.*)?$/)
      // No double slashes after the host.
      const [, pathPart = ''] = entry.url.split(/^https?:\/\/[^/]+/)
      expect(pathPart.startsWith('//')).toBe(false)
    }
  })

  it('sets the homepage to priority 1', () => {
    const home = sitemap().find(e => /\/$/.test(new URL(e.url).pathname) && new URL(e.url).pathname === '/')
    expect(home?.priority).toBe(1)
  })

  it('sets lastModified to a Date instance', () => {
    expect(sitemap()[0].lastModified).toBeInstanceOf(Date)
  })
})
