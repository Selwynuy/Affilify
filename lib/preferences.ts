import type { MarketplaceTemplate } from '@/lib/types/marketplace'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

export function buildAvatarConfigFromTemplate(template: MarketplaceTemplate | null | undefined): AvatarConfig | null {
  if (!template) return null

  const style = template.config.style
  const normalizedStyle: AvatarConfig['style'] =
    style === 'streetwear' || style === 'luxury' || style === 'minimal'
      ? style
      : 'casual'

  return {
    type: 'preset',
    presetId: template.id,
    gender: template.config.gender === 'woman' ? 'woman' : 'man',
    style: normalizedStyle,
  }
}

export function buildBackgroundConfigFromTemplate(template: MarketplaceTemplate | null | undefined): BackgroundConfig | null {
  if (!template) return null

  return {
    type: 'preset',
    presetId: template.id,
    roomAesthetic: String(template.config.roomAesthetic ?? ''),
    roomColors: String(template.config.roomColors ?? ''),
    roomElements: String(template.config.roomElements ?? ''),
    thumbnailUrl: template.thumbnail_url ?? undefined,
  }
}

export function buildCustomAvatarConfig(faceUrl: string, facePath: string, gender: AvatarConfig['gender'] = 'man'): AvatarConfig {
  return {
    type: 'custom',
    gender,
    style: 'casual',
    faceUrl,
    facePath,
  }
}

export function buildUserModelAvatarConfig(
  userModelId: string,
  storagePath: string,
  gender: AvatarConfig['gender'],
  style: AvatarConfig['style'] = 'casual',
): AvatarConfig {
  return {
    type: 'user_model',
    userModelId,
    userModelStoragePath: storagePath,
    gender,
    style,
  }
}
