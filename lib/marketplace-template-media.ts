import type { MarketplaceTemplate } from '@/lib/types/marketplace'

function cleanUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function getTemplatePrimaryImageUrl(template: MarketplaceTemplate | null | undefined) {
  return (
    cleanUrl(template?.thumbnail_url)
    ?? cleanUrl(template?.reference_url)
    ?? cleanUrl(template?.preview_url)
    ?? null
  )
}

export function getTemplateGenerationImageUrl(template: MarketplaceTemplate | null | undefined) {
  return (
    cleanUrl(template?.reference_url)
    ?? cleanUrl(template?.thumbnail_url)
    ?? cleanUrl(template?.preview_url)
    ?? null
  )
}
