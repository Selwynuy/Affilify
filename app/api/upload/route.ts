import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPublishedMarketplaceTemplateById,
  getTemplateConfigValue,
} from '@/lib/data/marketplace-templates'

async function readTemplateMediaAsBase64(url: string | null | undefined) {
  if (!url) return { b64: undefined, mime: undefined }

  try {
    const parsed = new URL(url, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

    if (parsed.pathname === '/api/template-media') {
      const path = parsed.searchParams.get('path')?.trim()
      if (!path) return { b64: undefined, mime: undefined }

      const admin = createAdminClient()
      const { data } = await admin.storage.from('uploads').download(path)
      if (!data) return { b64: undefined, mime: undefined }

      const buffer = await data.arrayBuffer()
      return {
        b64: Buffer.from(buffer).toString('base64'),
        mime: data.type || 'image/jpeg',
      }
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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const formData = await req.formData()

  // ── Onboarding face-only upload ────────────────────────────────────────────
  if (formData.get('onboardingFaceOnly') === 'true') {
    const faceFile = formData.get('face') as File | null
    if (!faceFile) return NextResponse.json({ error: 'face required' }, { status: 400 })

    const ext = faceFile.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/avatar/face.${ext}`
    const bytes = await faceFile.arrayBuffer()

    const { error } = await admin.storage.from('uploads').upload(path, bytes, {
      contentType: faceFile.type,
      upsert: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 7-day signed URL for display in dashboard
    const { data: signed } = await admin.storage.from('uploads').createSignedUrl(path, 60 * 60 * 24 * 7)
    return NextResponse.json({ faceUrl: signed?.signedUrl ?? '', facePath: path })
  }

  // ── Project creation ───────────────────────────────────────────────────────
  const usePreferences = formData.get('usePreferences') === 'true'
  const projectId = formData.get('projectId') as string | null
  const productFiles = formData.getAll('products') as File[]

  let avatar: Record<string, unknown>

  if (usePreferences) {
    // Load avatar + background from user_preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('avatar_config, background_config')
      .eq('user_id', user.id)
      .single()

    if (!prefs?.avatar_config) {
      return NextResponse.json({ error: 'Avatar not configured. Please complete onboarding.' }, { status: 400 })
    }

    const ac = prefs.avatar_config as Record<string, unknown>
    const bc = (prefs.background_config ?? {}) as Record<string, unknown>

    // Re-read face file from storage to get base64 for Gemini (never stored in prefs)
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

    // Get promptHint for preset avatars
    const avatarTemplate = ac.type === 'preset'
      ? await getPublishedMarketplaceTemplateById(String(ac.presetId ?? ''))
      : null
    const backgroundTemplate = bc.presetId
      ? await getPublishedMarketplaceTemplateById(String(bc.presetId))
      : null
    if (ac.type === 'preset' && !avatarTemplate?.reference_url) {
      return NextResponse.json(
        { error: 'Selected avatar is missing a full-resolution reference image.' },
        { status: 400 },
      )
    }
    if (!backgroundTemplate?.reference_url) {
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
    // Prefer reference_url (full-res, specifically for generation) over preview/thumbnail.
    // thumbnail_url is only the small card image — it loses detail Gemini needs.
    const avatarReferenceUrl = ac.type === 'preset'
      ? avatarTemplate?.reference_url
      : undefined
    const backgroundReferenceUrl = backgroundTemplate.reference_url
    const { b64: avatarReferenceB64, mime: avatarReferenceMime } =
      await readTemplateMediaAsBase64(avatarReferenceUrl)
    const { b64: backgroundReferenceB64, mime: backgroundReferenceMime } =
      await readTemplateMediaAsBase64(backgroundReferenceUrl)
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

    // Style → outfit defaults
    const styleOutfitMap: Record<string, { outfitTop: string; outfitBottom: string; shoes: string }> = {
      casual:     { outfitTop: 'a plain white t-shirt', outfitBottom: 'light wash jeans', shoes: 'white sneakers' },
      streetwear: { outfitTop: 'an oversized graphic hoodie', outfitBottom: 'black jogger pants', shoes: 'Jordan 1 High OG sneakers' },
      luxury:     { outfitTop: 'a fitted black turtleneck', outfitBottom: 'tailored charcoal trousers', shoes: 'black leather dress shoes' },
      minimal:    { outfitTop: 'a clean white oxford shirt', outfitBottom: 'slim-fit beige chinos', shoes: 'white leather low-top sneakers' },
    }
    const styleKey = String(ac.style ?? 'casual')
    const styleDefaults = styleOutfitMap[styleKey] ?? styleOutfitMap.casual

    avatar = {
      type: ac.type,
      presetId: ac.presetId,
      promptHint,
      skinTone:        getTemplateConfigValue(avatarTemplate, 'skinTone'),
      hairDescription: getTemplateConfigValue(avatarTemplate, 'hairDescription'),
      faceFeatures:    getTemplateConfigValue(avatarTemplate, 'faceFeatures'),
      bodyType:        getTemplateConfigValue(avatarTemplate, 'bodyType'),
      gender: String(ac.gender ?? 'man'),
      style: styleKey,
      faceUrl: ac.faceUrl,
      facePath: ac.facePath,
      faceB64,
      faceMime,
      avatarReferenceUrl,
      avatarReferenceB64,
      avatarReferenceMime,
      backgroundPresetId: bc.presetId,
      backgroundReferenceUrl,
      backgroundReferenceB64,
      backgroundReferenceMime,
      roomAesthetic: String(bc.roomAesthetic ?? 'masculine'),
      roomColors: String(bc.roomColors ?? 'white and black'),
      roomElements: String(bc.roomElements ?? ''),
      focalLength: '35-50mm (natural, balanced)',
      outfitTop: String(styleDefaults.outfitTop),
      outfitBottom: String(styleDefaults.outfitBottom),
      shoes: String(styleDefaults.shoes),
      height: 175,
      weight: 70,
    }
  } else {
    // Legacy path: avatar fields in FormData (old wizard)
    const faceFile = formData.get('face') as File | null
    avatar = {
      gender:        (formData.get('gender') as string)        ?? 'man',
      height:        Number(formData.get('height'))             || 175,
      weight:        Number(formData.get('weight'))             || 70,
      roomAesthetic: (formData.get('roomAesthetic') as string) ?? 'masculine',
      focalLength:   (formData.get('focalLength') as string)   ?? '35-50mm (natural, balanced)',
      outfitTop:     (formData.get('outfitTop') as string)     ?? 'a plain white t-shirt',
      outfitBottom:  (formData.get('outfitBottom') as string)  ?? 'dark slim-fit pants',
      shoes:         (formData.get('shoes') as string)         ?? 'white sneakers',
      roomColors:    (formData.get('roomColors') as string)    ?? 'white and black',
      roomElements:  (formData.get('roomElements') as string)  ?? '',
    }

    if (faceFile) {
      const ext = faceFile.name.split('.').pop()
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

  // Upsert project row
  let pid = projectId
  if (!pid) {
    const { data: project, error } = await admin
      .from('projects')
      .insert({ user_id: user.id, status: 'draft', avatar })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    pid = project.id
  } else {
    await admin.from('projects').update({ avatar }).eq('id', pid)
  }

  // Upload product images
  const results: { kind: string; url: string; path: string }[] = []
  if (productFiles.length > 0) {
    // Product inputs are transient generation references and should not count as
    // persistent user storage unless we later add an explicit save action.
    await admin.from('project_images').delete().eq('project_id', pid).eq('kind', 'product')

    for (let i = 0; i < productFiles.length; i++) {
      const file = productFiles[i]
      const ext = file.name.split('.').pop()
      const bytes = await file.arrayBuffer()
      const path = `transient://${user.id}/${pid}/product-${i}.${ext}`
      const url = ''
      const b64 = Buffer.from(bytes).toString('base64')

      await admin.from('project_images').insert({
        project_id: pid,
        user_id: user.id,
        kind: 'product',
        url,
        storage_path: path,
        position: i,
        b64_data: b64,
        mime_type: file.type,
      })

      results.push({ kind: 'product', url, path })
    }
  }

  return NextResponse.json({ projectId: pid, files: results })
}
