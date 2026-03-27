import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AVATAR_PRESETS } from '@/lib/data/avatar-presets'

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
      .select('avatar_config, background_config, defaults')
      .eq('user_id', user.id)
      .single()

    if (!prefs?.avatar_config) {
      return NextResponse.json({ error: 'Avatar not configured. Please complete onboarding.' }, { status: 400 })
    }

    const ac = prefs.avatar_config as Record<string, unknown>
    const bc = (prefs.background_config ?? {}) as Record<string, unknown>
    const defaults = (prefs.defaults ?? {}) as Record<string, unknown>

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
    const promptHint = ac.type === 'preset'
      ? (AVATAR_PRESETS.find((p) => p.id === ac.presetId)?.promptHint ?? '')
      : undefined

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
      gender: String(ac.gender ?? 'man'),
      style: styleKey,
      faceUrl: ac.faceUrl,
      facePath: ac.facePath,
      faceB64,
      faceMime,
      roomAesthetic: String(bc.roomAesthetic ?? 'masculine'),
      roomColors: String(bc.roomColors ?? 'white and black'),
      roomElements: String(bc.roomElements ?? ''),
      cameraAngle: 'at eye level, straight on',
      focalLength: '35-50mm (natural, balanced)',
      outfitTop: String(defaults.outfitTop ?? styleDefaults.outfitTop),
      outfitBottom: String(defaults.outfitBottom ?? styleDefaults.outfitBottom),
      shoes: String(defaults.shoes ?? styleDefaults.shoes),
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
      cameraAngle:   (formData.get('cameraAngle') as string)   ?? 'at eye level, straight on',
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
    await admin.from('project_images').delete().eq('project_id', pid).eq('kind', 'product')

    for (let i = 0; i < productFiles.length; i++) {
      const file = productFiles[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${pid}/product-${i}.${ext}`
      const bytes = await file.arrayBuffer()
      const { error } = await admin.storage.from('uploads').upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data: signed } = await admin.storage.from('uploads').createSignedUrl(path, 60 * 60)
      const url = signed?.signedUrl ?? ''
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
