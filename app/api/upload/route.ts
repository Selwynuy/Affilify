import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateGroups,
  getPublishedMarketplaceTemplateById,
  getTemplateConfigValue,
} from '@/lib/data/marketplace-templates'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
} from '@/lib/preferences'
import { getTemplateGenerationImageUrl } from '@/lib/marketplace-template-media'
import {
  assertAllowedMimeType,
  getExtensionForMimeType,
  isSafeHttpUrl,
  isUuid,
  sanitizeText,
  verifySameOrigin,
} from '@/lib/security'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PRODUCT_FILES = 5

async function readTemplateMediaAsBase64(url: string | null | undefined) {
  if (!url) return { b64: undefined, mime: undefined }

  try {
    const parsed = new URL(url, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

    if (parsed.pathname === '/api/template-media') {
      const path = parsed.searchParams.get('path')?.trim()
      if (!path || !path.startsWith('marketplace-templates/')) return { b64: undefined, mime: undefined }

      const admin = createAdminClient()
      const { data } = await admin.storage.from('uploads').download(path)
      if (!data) return { b64: undefined, mime: undefined }

      const buffer = await data.arrayBuffer()
      return {
        b64: Buffer.from(buffer).toString('base64'),
        mime: data.type || 'image/jpeg',
      }
    }

    if (!isSafeHttpUrl(parsed.toString())) {
      return { b64: undefined, mime: undefined }
    }

    const response = await fetch(parsed.toString())
    if (!response.ok) return { b64: undefined, mime: undefined }

    const buffer = await response.arrayBuffer()
    return {
      b64: Buffer.from(buffer).toString('base64'),
      mime: response.headers.get('content-type') || 'image/jpeg',
    }
  } catch {
    return { b64: undefined, mime: undefined }
  }
}

function validateImageFile(file: File, label: string) {
  if (!assertAllowedMimeType(file.type, 'image')) {
    return `${label} must be a JPG, PNG, or WebP image`
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} exceeds 10MB limit`
  }

  return null
}

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const formData = await req.formData()

  if (formData.get('onboardingFaceOnly') === 'true') {
    const faceFile = formData.get('face') as File | null
    if (!faceFile) return NextResponse.json({ error: 'face required' }, { status: 400 })

    const faceError = validateImageFile(faceFile, 'Face image')
    if (faceError) return NextResponse.json({ error: faceError }, { status: 400 })

    const ext = getExtensionForMimeType(faceFile.type, 'jpg')
    const path = `${user.id}/avatar/face.${ext}`
    const bytes = await faceFile.arrayBuffer()

    const { error } = await admin.storage.from('uploads').upload(path, bytes, {
      contentType: faceFile.type,
      upsert: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: signed } = await admin.storage.from('uploads').createSignedUrl(path, 60 * 60 * 24 * 7)
    return NextResponse.json({ faceUrl: signed?.signedUrl ?? '', facePath: path })
  }

  const usePreferences = formData.get('usePreferences') === 'true'
  const rawProjectId = formData.get('projectId')
  const projectId = typeof rawProjectId === 'string' && isUuid(rawProjectId) ? rawProjectId : null
  const productFiles = formData.getAll('products') as File[]

  if (productFiles.length > MAX_PRODUCT_FILES) {
    return NextResponse.json({ error: `A maximum of ${MAX_PRODUCT_FILES} product images is allowed` }, { status: 400 })
  }

  let avatar: Record<string, unknown>

  if (usePreferences) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('avatar_config, background_config')
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

    const effectiveAvatarConfig =
      (prefs?.avatar_config as AvatarConfig | null) ?? buildAvatarConfigFromTemplate(defaultAvatarTemplate)
    const effectiveBackgroundConfig =
      (prefs?.background_config as BackgroundConfig | null) ?? buildBackgroundConfigFromTemplate(defaultBackgroundTemplate)

    if (!effectiveAvatarConfig) {
      return NextResponse.json({ error: 'Avatar templates are unavailable right now.' }, { status: 400 })
    }
    if (!effectiveBackgroundConfig) {
      return NextResponse.json({ error: 'Background templates are unavailable right now.' }, { status: 400 })
    }

    const ac = effectiveAvatarConfig as unknown as Record<string, unknown>
    const bc = effectiveBackgroundConfig as unknown as Record<string, unknown>

    let faceB64: string | undefined
    let faceMime: string | undefined
    if (ac.type === 'custom' && ac.facePath) {
      const { data: fileData } = await admin.storage.from('uploads').download(ac.facePath as string)
      if (fileData) {
        const buffer = await fileData.arrayBuffer()
        faceB64 = Buffer.from(buffer).toString('base64')
        faceMime = fileData.type || 'image/jpeg'
      }
    }

    // For user_model type, load the model image from storage as avatar reference
    let userModelReferenceB64: string | undefined
    let userModelReferenceMime: string | undefined
    if (ac.type === 'user_model' && ac.userModelStoragePath) {
      const { data: modelFile } = await admin.storage
        .from('generated')
        .download(ac.userModelStoragePath as string)
      if (modelFile) {
        const buffer = await modelFile.arrayBuffer()
        userModelReferenceB64 = Buffer.from(buffer).toString('base64')
        userModelReferenceMime = modelFile.type || 'image/jpeg'
      }
    }

    const avatarTemplate = ac.type === 'preset'
      ? await getPublishedMarketplaceTemplateById(String(ac.presetId ?? ''))
      : null
    const backgroundTemplate = bc.presetId
      ? await getPublishedMarketplaceTemplateById(String(bc.presetId))
      : null

    const avatarGenerationUrl = getTemplateGenerationImageUrl(avatarTemplate)
    const backgroundGenerationUrl = getTemplateGenerationImageUrl(backgroundTemplate)

    if (ac.type === 'preset' && !avatarGenerationUrl) {
      return NextResponse.json(
        { error: 'Selected avatar is missing a full-resolution reference image.' },
        { status: 400 },
      )
    }
    if (ac.type === 'user_model' && (!userModelReferenceB64 || !userModelReferenceMime)) {
      return NextResponse.json(
        { error: 'Selected model image could not be loaded. Try generating a new model.' },
        { status: 400 },
      )
    }
    if (!backgroundGenerationUrl) {
      return NextResponse.json(
        { error: 'Selected background is missing a full-resolution reference image.' },
        { status: 400 },
      )
    }

    const promptHint = ac.type === 'preset'
      ? getTemplateConfigValue(
        avatarTemplate,
        'promptHint',
        avatarTemplate?.description ?? avatarTemplate?.title ?? '',
      )
      : undefined
    const avatarReferenceUrl = ac.type === 'preset' ? avatarGenerationUrl ?? undefined : undefined
    const backgroundReferenceUrl = backgroundGenerationUrl
    const { b64: avatarReferenceB64, mime: avatarReferenceMime } = await readTemplateMediaAsBase64(avatarReferenceUrl)
    const { b64: backgroundReferenceB64, mime: backgroundReferenceMime } = await readTemplateMediaAsBase64(backgroundReferenceUrl)

    if (ac.type === 'preset' && (!avatarReferenceB64 || !avatarReferenceMime)) {
      return NextResponse.json(
        { error: 'Selected avatar full-resolution reference could not be loaded.' },
        { status: 400 },
      )
    }
    if (!backgroundReferenceB64 || !backgroundReferenceMime) {
      return NextResponse.json(
        { error: 'Selected background full-resolution reference could not be loaded.' },
        { status: 400 },
      )
    }

    const styleOutfitMap: Record<string, { outfitTop: string; outfitBottom: string; shoes: string }> = {
      casual: { outfitTop: 'a plain white t-shirt', outfitBottom: 'light wash jeans', shoes: 'white sneakers' },
      streetwear: { outfitTop: 'an oversized graphic hoodie', outfitBottom: 'black jogger pants', shoes: 'Jordan 1 High OG sneakers' },
      luxury: { outfitTop: 'a fitted black turtleneck', outfitBottom: 'tailored charcoal trousers', shoes: 'black leather dress shoes' },
      minimal: { outfitTop: 'a clean white oxford shirt', outfitBottom: 'slim-fit beige chinos', shoes: 'white leather low-top sneakers' },
    }
    const styleKey = sanitizeText(ac.style ?? 'casual', { maxLength: 30 }) || 'casual'
    const styleDefaults = styleOutfitMap[styleKey] ?? styleOutfitMap.casual

    avatar = {
      type: ac.type,
      presetId: ac.presetId,
      userModelId: ac.userModelId,
      userModelStoragePath: ac.userModelStoragePath,
      promptHint,
      skinTone: getTemplateConfigValue(avatarTemplate, 'skinTone'),
      hairDescription: getTemplateConfigValue(avatarTemplate, 'hairDescription'),
      faceFeatures: getTemplateConfigValue(avatarTemplate, 'faceFeatures'),
      bodyType: getTemplateConfigValue(avatarTemplate, 'bodyType'),
      gender: sanitizeText(ac.gender ?? 'man', { maxLength: 20 }) || 'man',
      style: styleKey,
      faceUrl: ac.faceUrl,
      facePath: ac.facePath,
      faceB64,
      faceMime,
      // For user_model type, the generated model image serves as the avatar reference
      avatarReferenceB64: ac.type === 'user_model' ? userModelReferenceB64 : avatarReferenceB64,
      avatarReferenceMime: ac.type === 'user_model' ? userModelReferenceMime : avatarReferenceMime,
      avatarReferenceUrl,
      backgroundPresetId: bc.presetId,
      backgroundReferenceUrl,
      backgroundReferenceB64,
      backgroundReferenceMime,
      roomAesthetic: sanitizeText(bc.roomAesthetic ?? 'masculine', { maxLength: 60 }) || 'masculine',
      roomColors: sanitizeText(bc.roomColors ?? 'white and black', { maxLength: 120 }) || 'white and black',
      roomElements: sanitizeText(bc.roomElements ?? '', { maxLength: 200 }),
      focalLength: '35-50mm (natural, balanced)',
      outfitTop: styleDefaults.outfitTop,
      outfitBottom: styleDefaults.outfitBottom,
      shoes: styleDefaults.shoes,
      height: 175,
      weight: 70,
    }
  } else {
    const faceFile = formData.get('face') as File | null
    avatar = {
      gender: sanitizeText(formData.get('gender') as string, { maxLength: 20 }) || 'man',
      height: Number(formData.get('height')) || 175,
      weight: Number(formData.get('weight')) || 70,
      roomAesthetic: sanitizeText(formData.get('roomAesthetic') as string, { maxLength: 60 }) || 'masculine',
      focalLength: sanitizeText(formData.get('focalLength') as string, { maxLength: 80 }) || '35-50mm (natural, balanced)',
      outfitTop: sanitizeText(formData.get('outfitTop') as string, { maxLength: 120 }) || 'a plain white t-shirt',
      outfitBottom: sanitizeText(formData.get('outfitBottom') as string, { maxLength: 120 }) || 'dark slim-fit pants',
      shoes: sanitizeText(formData.get('shoes') as string, { maxLength: 120 }) || 'white sneakers',
      roomColors: sanitizeText(formData.get('roomColors') as string, { maxLength: 120 }) || 'white and black',
      roomElements: sanitizeText(formData.get('roomElements') as string, { maxLength: 200 }),
    }

    if (faceFile) {
      const faceError = validateImageFile(faceFile, 'Face image')
      if (faceError) return NextResponse.json({ error: faceError }, { status: 400 })

      const ext = getExtensionForMimeType(faceFile.type, 'jpg')
      const path = `${user.id}/temp-face.${ext}`
      const bytes = await faceFile.arrayBuffer()
      await admin.storage.from('uploads').upload(path, bytes, { contentType: faceFile.type, upsert: true })
      const { data: signed } = await admin.storage.from('uploads').createSignedUrl(path, 60 * 60)
      const faceB64 = Buffer.from(bytes).toString('base64')
      Object.assign(avatar, {
        faceUrl: signed?.signedUrl ?? '',
        facePath: path,
        faceB64,
        faceMime: faceFile.type,
      })
    }
  }

  let pid = projectId
  let projectName = 'Untitled Project'
  if (!pid) {
    const now = new Date()
    const autoName = `Project ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    const { data: project, error } = await admin
      .from('projects')
      .insert({ user_id: user.id, status: 'draft', avatar, name: autoName })
      .select('id, name')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    pid = project.id
    projectName = project.name
  } else {
    const { data: existingProject } = await admin
      .from('projects')
      .select('id, name')
      .eq('id', pid)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    projectName = existingProject.name ?? 'Untitled Project'
    await admin.from('projects').update({ avatar }).eq('id', pid).eq('user_id', user.id)
  }

  const results: { kind: string; url: string; path: string }[] = []
  if (productFiles.length > 0) {
    await admin.from('project_images').delete().eq('project_id', pid).eq('kind', 'product')

    for (let i = 0; i < productFiles.length; i++) {
      const file = productFiles[i]
      const fileError = validateImageFile(file, 'Product image')
      if (fileError) return NextResponse.json({ error: fileError }, { status: 400 })

      const ext = getExtensionForMimeType(file.type, 'jpg')
      const bytes = await file.arrayBuffer()
      const path = `transient://${user.id}/${pid}/product-${i}.${ext}`
      const b64 = Buffer.from(bytes).toString('base64')

      await admin.from('project_images').insert({
        project_id: pid,
        user_id: user.id,
        kind: 'product',
        url: '',
        storage_path: path,
        position: i,
        b64_data: b64,
        mime_type: file.type,
      })

      results.push({ kind: 'product', url: '', path })
    }
  }

  return NextResponse.json({ projectId: pid, projectName, files: results })
}
