import { describe, expect, it } from 'vitest'
import { pageMetadata, SITE_NAME, SITE_URL } from './seo'

describe('pageMetadata', () => {
  it('sets the canonical to a path-only string anchored on SITE_URL', () => {
    const meta = pageMetadata({ path: '/billing', title: 'Billing', description: 'd' })
    expect(meta.alternates?.canonical).toBe('/billing')
    expect(meta.openGraph?.url).toBe(`${SITE_URL}/billing`)
  })

  it('handles the homepage with no double slash', () => {
    const meta = pageMetadata({ path: '/', title: 'Home', description: 'd' })
    expect(meta.openGraph?.url).toBe(SITE_URL)
    expect(meta.alternates?.canonical).toBe('/')
  })

  it('normalizes a path missing the leading slash', () => {
    const meta = pageMetadata({ path: 'login', title: 'Login', description: 'd' })
    expect(meta.alternates?.canonical).toBe('/login')
  })

  it('emits indexable robots by default', () => {
    const meta = pageMetadata({ path: '/login', title: 'Login', description: 'd' })
    expect(meta.robots).toEqual({ index: true, follow: true })
  })

  it('emits noindex when requested (auth-only pages)', () => {
    const meta = pageMetadata({ path: '/dashboard', title: 'Dashboard', description: 'd', noIndex: true })
    expect(meta.robots).toEqual({ index: false, follow: false, nocache: true })
  })

  it('sets siteName, og type, and twitter card', () => {
    const meta = pageMetadata({ path: '/cookies', title: 'Cookies', description: 'd' })
    expect(meta.openGraph?.siteName).toBe(SITE_NAME)
    // OpenGraph and Twitter are discriminated unions; cast for the assertion.
    const og = meta.openGraph as { type?: string }
    const tw = meta.twitter as { card?: string }
    expect(og.type).toBe('website')
    expect(tw.card).toBe('summary_large_image')
  })

  it('forwards an explicit OG image when supplied', () => {
    const meta = pageMetadata({ path: '/', title: 't', description: 'd', ogImage: '/og.png' })
    expect(meta.openGraph?.images).toEqual([{ url: '/og.png' }])
    expect(meta.twitter?.images).toEqual(['/og.png'])
  })
})

describe('SITE_URL', () => {
  it('strips a trailing slash', () => {
    expect(SITE_URL.endsWith('/')).toBe(false)
  })
})
