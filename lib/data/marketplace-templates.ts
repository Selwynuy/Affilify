import 'server-only'

import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MarketplaceTemplate, TemplateCategory } from '@/lib/types/marketplace'

type MarketplaceTemplateGroups = Record<TemplateCategory, MarketplaceTemplate[]>

export const getPublishedMarketplaceTemplates = cache(async (): Promise<MarketplaceTemplate[]> => {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('marketplace_templates')
    .select('*')
    .eq('status', 'published')
    .order('category')
    .order('sort_order')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MarketplaceTemplate[]
})

export async function getPublishedMarketplaceTemplateGroups(): Promise<MarketplaceTemplateGroups> {
  const templates = await getPublishedMarketplaceTemplates()

  return templates.reduce<MarketplaceTemplateGroups>((groups, template) => {
    groups[template.category].push(template)
    return groups
  }, {
    avatar: [],
    background: [],
    camera: [],
    movement: [],
    other: [],
  })
}

export async function getPublishedMarketplaceTemplateById(id: string | null | undefined) {
  if (!id) return null
  const templates = await getPublishedMarketplaceTemplates()
  return templates.find((template) => template.id === id) ?? null
}

export async function getMarketplaceTemplateDefaults() {
  const groups = await getPublishedMarketplaceTemplateGroups()

  return {
    avatarTemplateId: groups.avatar[0]?.id ?? '',
    backgroundTemplateId: groups.background[0]?.id ?? '',
    cameraTemplateId: groups.camera[0]?.id ?? '',
    movementTemplateId: groups.movement[0]?.id ?? '',
  }
}

export function getTemplateConfigValue(
  template: MarketplaceTemplate | null | undefined,
  key: string,
  fallback = '',
) {
  const value = template?.config?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}
