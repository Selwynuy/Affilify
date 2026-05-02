import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const publicRoutes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/',                changeFrequency: 'weekly',  priority: 1.0 },
    { path: '/signup',          changeFrequency: 'monthly', priority: 0.8 },
    { path: '/login',           changeFrequency: 'yearly',  priority: 0.4 },
    { path: '/forgot-password', changeFrequency: 'yearly',  priority: 0.2 },
    { path: '/cookies',         changeFrequency: 'yearly',  priority: 0.3 },
    { path: '/privacy',         changeFrequency: 'yearly',  priority: 0.3 },
    { path: '/terms',           changeFrequency: 'yearly',  priority: 0.3 },
    { path: '/refunds',         changeFrequency: 'yearly',  priority: 0.3 },
  ]

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
