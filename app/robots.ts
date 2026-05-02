import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

const PRIVATE_PATHS = [
  '/api/',
  '/admin',
  '/admin/',
  '/dashboard',
  '/dashboard/',
  '/projects',
  '/projects/',
  '/billing',
  '/support',
  '/support/',
  '/templates',
  '/auth/',
  '/check-email',
  '/confirmed',
  '/reset-password',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Generic crawlers — allow public surface, block app surface.
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      // Be explicit for the named crawlers we care about so a future
      // wildcard tweak cannot accidentally re-expose private paths.
      { userAgent: 'Googlebot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'Bingbot',   allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
