import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance } from '@/lib/billing/tokens'
import { TOKEN_COSTS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import { getPublishedMarketplaceTemplateById } from '@/lib/data/marketplace-templates'
import { isUuid, isSafeHttpUrl, sanitizeText, verifySameOrigin } from '@/lib/security'

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

function buildModelPrompt(gender: string, style: string, isFaceOnly: boolean): string {
  const genderWord = gender === 'woman' ? 'female fashion model' : 'male fashion model'
  const outfitMap: Record<string, string> = {
    casual:     'white t-shirt and light-wash blue jeans with white sneakers',
    streetwear: 'oversized graphic hoodie and black jogger pants with high-top sneakers',
    luxury:     'fitted black turtleneck and tailored charcoal trousers with black leather dress shoes',
    minimal:    'clean white oxford shirt and slim-fit beige chinos with white leather low-tops',
  }
  const outfit = outfitMap[style] ?? outfitMap.casual

  const faceNote = isFaceOnly
    // No gender assumption — preserve whoever is in the photo exactly as-is
    ? `You are given a face photo of a person. Generate a photorealistic full-body portrait of a fashion model using this exact face. Preserve the person's face, skin tone, hair, and identity precisely. Do not change the apparent gender or ethnicity.`
    : `You are given a reference image of a ${genderWord}. Generate a photorealistic full-body portrait of this exact ${genderWord}. Preserve the model's face, hair, skin tone, and body proportions exactly as in the reference.`

  return [
    faceNote,
    `Outfit: ${outfit}.`,
    `Background: pure white seamless studio background with soft, even lighting.`,
    `Camera: full-body shot from head to toe, front-facing, natural relaxed pose, hands slightly away from body.`,
    `Professional ecommerce fashion photography quality.`,
    `Output: photorealistic 9:16 vertical portrait.`,
  ].join(' ')
}

async function fetchAsBase64(url: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const parsed = new URL(url, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

    if (parsed.pathname === '/api/template-media') {
      const path = parsed.searchParams.get('path')?.trim()
      if (!path) return null
      const admin = createAdminClient()
      const { data } = await admin.storage.from('uploads').download(path)
      if (!data) return null
      const buffer = await data.arrayBuffer()
      return { b64: Buffer.from(buffer).toString('base64'), mime: data.type || 'image/jpeg' }
    }

    if (!isSafeHttpUrl(parsed.toString())) return null
    const res = await fetch(parsed.toString())
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return { b64: Buffer.from(buffer).toString('base64'), mime: res.headers.get('content-type') || 'image/jpeg' }
  } catch {
    return null
  }
}

/** Try common extensions to load the user's saved face from uploads storage. */
async function loadUserFace(userId: string): Promise<{ b64: string; mime: string } | null> {
  const admin = createAdminClient()
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const path = `${userId}/avatar/face.${ext}`
    const { data } = await admin.storage.from('uploads').download(path)
    if (data) {
      const buffer = await data.arrayBuffer()
      return { b64: Buffer.from(buffer).toString('base64'), mime: data.type || 'image/jpeg' }
    }
  }
  return null
}

async function loadFaceFromPath(path: string | null | undefined): Promise<{ b64: string; mime: string } | null> {
  if (!path) return null

  const admin = createAdminClient()
  const { data } = await admin.storage.from('uploads').download(path)
  if (!data) return null

  const buffer = await data.arrayBuffer()
  return {
    b64: Buffer.from(buffer).toString('base64'),
    mime: data.type || 'image/jpeg',
  }
}

/**
 * POST /api/user-models/generate
 *
 * Two modes:
 *   1. Preset-based:  { templateId: string, name?: string }
 *   2. Custom face:   { useCustomFace: true, gender?: 'man'|'woman', style?: string, name?: string }
 *
 * Costs TOKEN_COSTS.model_gen tokens. Result is saved to user_models (private per user).
 */
export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`user-models-gen:${user.id}`, { limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before generating another model.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }

  const body = await req.json()
  const templateId = isUuid(body?.templateId) ? body.templateId : null
  const useCustomFace = body?.useCustomFace === true
  const explicitFacePath = typeof body?.facePath === 'string' ? body.facePath.trim() : ''
  const customName = sanitizeText(body?.name, { maxLength: 60 })
  const reqGender = body?.gender === 'woman' ? 'woman' : 'man'
  const reqStyle = sanitizeText(body?.style, { maxLength: 20 }) || 'casual'

  if (!templateId && !useCustomFace) {
    return NextResponse.json({ error: 'templateId or useCustomFace required' }, { status: 400 })
  }

  // Token check before heavy work
  const balance = await getTokenBalance(user.id)
  if (balance < TOKEN_COSTS.model_gen) {
    return NextResponse.json(
      { error: 'Insufficient tokens. Top up your balance to generate a model.' },
      { status: 402 },
    )
  }

  let reference: { b64: string; mime: string } | null = null
  let gender: string
  let style: string
  let modelName: string
  let sourceTemplateId: string | null = null

  if (useCustomFace) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('avatar_config')
      .eq('user_id', user.id)
      .maybeSingle()

    const avatarConfig = (prefs?.avatar_config ?? null) as { facePath?: string } | null
    reference =
      await loadFaceFromPath(explicitFacePath)
      ?? await loadFaceFromPath(avatarConfig?.facePath)
      ?? await loadUserFace(user.id)
    if (!reference) {
      return NextResponse.json(
        { error: 'No face photo found. Please upload your face first.' },
        { status: 400 },
      )
    }
    gender = reqGender
    style = reqStyle
    modelName = customName || 'My Custom Model'
  } else {
    const template = await getPublishedMarketplaceTemplateById(templateId!)
    if (!template || template.category !== 'avatar') {
      return NextResponse.json({ error: 'Avatar template not found' }, { status: 404 })
    }
    if (!template.reference_url) {
      return NextResponse.json(
        { error: 'This template is missing a full-resolution reference image.' },
        { status: 400 },
      )
    }
    reference = await fetchAsBase64(template.reference_url)
    if (!reference) {
      return NextResponse.json({ error: 'Could not load template reference image.' }, { status: 400 })
    }
    gender = template.config.gender === 'woman' ? 'woman' : 'man'
    style = (template.config.style as string) ?? 'casual'
    modelName = customName || `${template.title} Model`
    sourceTemplateId = templateId
  }

  const prompt = buildModelPrompt(gender, style, useCustomFace)
  const parts = [
    { inlineData: { mimeType: reference.mime, data: reference.b64 } },
    { text: prompt },
  ]

  let geminiData: unknown
  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GOOGLE_AI_STUDIO_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error('Gemini model gen failed', { userId: user.id, templateId, useCustomFace }, new Error(err))
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    geminiData = await res.json()
  } catch (e) {
    logger.error('Gemini model gen threw', { userId: user.id }, e)
    return NextResponse.json({ error: 'Unexpected error during generation.' }, { status: 500 })
  }

  const data = geminiData as { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] }
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith('image/'),
  )

  if (!imagePart?.inlineData) {
    logger.error('No image in Gemini model gen candidate', { userId: user.id })
    return NextResponse.json({ error: 'No image returned from generation.' }, { status: 500 })
  }

  const { mimeType, data: b64 } = imagePart.inlineData
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'
  const modelId = crypto.randomUUID()
  const storagePath = `user-models/${user.id}/${modelId}.${ext}`

  const admin = createAdminClient()
  const buffer = Buffer.from(b64, 'base64')

  const { error: uploadError } = await admin.storage
    .from('generated')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    logger.error('User model storage upload failed', { userId: user.id }, uploadError)
    return NextResponse.json({ error: 'Failed to save generated model.' }, { status: 500 })
  }

  // Deduct tokens after successful storage upload
  const charged = await deductTokens(user.id, TOKEN_COSTS.model_gen, 'model_gen', 'AI model generation')
  if (!charged) {
    await admin.storage.from('generated').remove([storagePath])
    return NextResponse.json({ error: 'Insufficient tokens.' }, { status: 402 })
  }

  const { data: signed } = await admin.storage.from('generated').createSignedUrl(storagePath, 60 * 60 * 24 * 7)
  const signedUrl = signed?.signedUrl ?? null

  const { data: row, error: insertError } = await admin
    .from('user_models')
    .insert({
      id: modelId,
      user_id: user.id,
      name: modelName,
      storage_path: storagePath,
      public_url: signedUrl,
      source_template_id: sourceTemplateId,
      gender,
    })
    .select('id, name, storage_path, public_url, source_template_id, gender, created_at')
    .single()

  if (insertError || !row) {
    logger.error('user_models insert failed', { userId: user.id }, insertError)
    return NextResponse.json({ error: 'Model saved but metadata write failed.' }, { status: 500 })
  }

  return NextResponse.json({
    model: { ...row, public_url: `data:${mimeType};base64,${b64}` },
  })
}
