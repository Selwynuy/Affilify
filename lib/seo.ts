import type { Metadata } from 'next'

/**
 * Canonical site origin. Always uses NEXT_PUBLIC_SITE_URL so the
 * sitemap, robots, and per-page canonicals all stay in lockstep.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://genetrify.com'
).replace(/\/$/, '')

export const SITE_NAME = 'Genetrify'

/**
 * Build a per-page Metadata object with a canonical URL anchored on
 * SITE_URL. Pass the path (with leading slash) — the helper handles
 * empty / "/" correctly.
 *
 * Usage:
 *   export const metadata = pageMetadata({
 *     path: '/billing',
 *     title: 'Billing',
 *     description: 'Manage your subscription and credit packs.',
 *   })
 */
export function pageMetadata(input: {
  path: string
  title: string
  description: string
  noIndex?: boolean
  ogImage?: string
}): Metadata {
  const path = input.path === '/' ? '/' : input.path.startsWith('/') ? input.path : `/${input.path}`
  const url = `${SITE_URL}${path === '/' ? '' : path}`

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: path },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      ...(input.ogImage ? { images: [{ url: input.ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      ...(input.ogImage ? { images: [input.ogImage] } : {}),
    },
    robots: input.noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  }
}
