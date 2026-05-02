import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateGroups,
} from '@/lib/data/marketplace-templates'
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
} from '@/lib/preferences'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_preferences')
    .select('avatar_config, background_config, shot_type_template_id, motion_style_template_id, video_flow_template_id')
    .eq('user_id', user.id)
    .single()

  const templateDefaults = await getMarketplaceTemplateDefaults()
  const {
    avatar: avatarTemplates,
    background: backgroundTemplates,
  } = await getPublishedMarketplaceTemplateGroups()

  const defaultAvatarTemplate =
    avatarTemplates.find((template) => template.id === templateDefaults.avatarTemplateId)
    ?? avatarTemplates[0]
    ?? null
  const defaultBackgroundTemplate =
    backgroundTemplates.find((template) => template.id === templateDefaults.backgroundTemplateId)
    ?? backgroundTemplates[0]
    ?? null

  return NextResponse.json({
    avatar_config: data?.avatar_config ?? buildAvatarConfigFromTemplate(defaultAvatarTemplate),
    background_config: data?.background_config ?? buildBackgroundConfigFromTemplate(defaultBackgroundTemplate),
    shot_type_template_id: data?.shot_type_template_id ?? null,
    motion_style_template_id: data?.motion_style_template_id ?? null,
    video_flow_template_id: data?.video_flow_template_id ?? null,
  })
}

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`preferences:user:${user.id}`, RATE_LIMITS.preferences)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await req.json()

  // Build only the fields that were provided
  const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }

  if ('avatar_config' in body && body.avatar_config !== null && typeof body.avatar_config === 'object') {
    const ac = body.avatar_config as Record<string, unknown>
    const validTypes = ['custom', 'preset', 'user_model']
    const validGenders = ['man', 'woman']
    const validStyles = ['casual', 'streetwear', 'luxury', 'minimal']

    const cleanedAvatarConfig: Record<string, unknown> = {
      type: validTypes.includes(ac.type as string) ? ac.type : 'preset',
      gender: validGenders.includes(ac.gender as string) ? ac.gender : 'man',
      style: validStyles.includes(ac.style as string) ? ac.style : 'casual',
      presetId: isUuid(ac.presetId as string) ? ac.presetId : null,
      userModelId: isUuid(ac.userModelId as string) ? ac.userModelId : null,
    }

    // Only allow storage paths that belong to this user (must start with their user ID)
    if (typeof ac.facePath === 'string' && ac.facePath.startsWith(`${user.id}/`)) {
      cleanedAvatarConfig.facePath = sanitizeText(ac.facePath, { maxLength: 300 })
    }
    if (typeof ac.userModelStoragePath === 'string' && ac.userModelStoragePath.startsWith(`user-models/${user.id}/`)) {
      cleanedAvatarConfig.userModelStoragePath = sanitizeText(ac.userModelStoragePath, { maxLength: 300 })
    }
    if (typeof ac.faceUrl === 'string') {
      cleanedAvatarConfig.faceUrl = sanitizeText(ac.faceUrl, { maxLength: 500 })
    }

    update.avatar_config = cleanedAvatarConfig
  } else if (body.avatar_config === null && 'avatar_config' in body) {
    update.avatar_config = null
  }

  if ('background_config' in body && body.background_config !== null && typeof body.background_config === 'object') {
    const bc = body.background_config as Record<string, unknown>
    const validBgTypes = ['preset', 'custom']

    update.background_config = {
      type: validBgTypes.includes(bc.type as string) ? bc.type : 'preset',
      presetId: isUuid(bc.presetId as string) ? bc.presetId : null,
      roomAesthetic: sanitizeText(bc.roomAesthetic, { maxLength: 60 }) || '',
      roomColors: sanitizeText(bc.roomColors, { maxLength: 120 }) || '',
      roomElements: sanitizeText(bc.roomElements, { maxLength: 200 }) || '',
      thumbnailUrl: typeof bc.thumbnailUrl === 'string' ? sanitizeText(bc.thumbnailUrl, { maxLength: 500 }) : null,
    }
  } else if (body.background_config === null && 'background_config' in body) {
    update.background_config = null
  }

  if ('shot_type_template_id' in body) update.shot_type_template_id = isUuid(body.shot_type_template_id) ? body.shot_type_template_id : null
  if ('motion_style_template_id' in body) update.motion_style_template_id = isUuid(body.motion_style_template_id) ? body.motion_style_template_id : null
  if ('video_flow_template_id' in body) update.video_flow_template_id = isUuid(body.video_flow_template_id) ? body.video_flow_template_id : null

  const { error } = await supabase
    .from('user_preferences')
    .upsert(update, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
