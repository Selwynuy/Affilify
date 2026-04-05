import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance } from '@/lib/billing/tokens'
import { TOKEN_COSTS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import {
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateById,
  getTemplateConfigValue,
} from '@/lib/data/marketplace-templates'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const IMAGE_COUNT = 1

function buildPrompt(
  productCount: number,
  productDescription: string,
  cameraAnglePrompt: string,
): string {
  const lines: string[] = []

  lines.push(`Use the attached avatar reference image strictly as the exact person.`)
  lines.push(`Use the attached background reference image strictly as the exact background and scene.`)
  lines.push(`Keep the background composition, room layout, decor, colors, lighting, and environment unchanged.`)
  lines.push(`Do not replace, redesign, restyle, crop away, or reinterpret the background.`)
  lines.push(`Only transform the avatar's outfit to match the attached product image input.`)
  lines.push(`Do not add any extra products, accessories, garments, props, branding, or items that are not present in the user-provided product images.`)
  lines.push(`Adjust the model's pose, hand placement, body angle, and styling presentation as needed to suit the transformed outfit naturally and make the outfit read clearly.`)
  lines.push(`Do not rigidly copy the original reference pose if a better pose is needed for the outfit, but keep the result realistic, flattering, and ecommerce-appropriate.`)

  if (productCount === 1) {
    lines.push(`Apply the attached product image to the avatar's outfit accurately and naturally.`)
  } else if (productCount > 1) {
    lines.push(`Combine the attached product images into one coherent outfit on the avatar accurately and naturally.`)
  }

  if (productDescription) {
    lines.push(`Follow these user outfit instructions strictly: ${productDescription}.`)
  }

  lines.push(`Camera angle: ${cameraAnglePrompt}.`)
  lines.push(`Preserve the avatar identity, face, body proportions, and pose realism.`)
  lines.push(`Output: photorealistic 9:16 vertical portrait, professional ecommerce quality.`)

  return lines.join(' ')
}

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n')
}

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Rate limit: 10 generations per user per minute
  const rl = await rateLimit(`generate:${user.id}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.warn('Rate limit hit on /api/generate', { userId: user.id })
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before generating again.' }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const body = await req.json()
  const projectId = isUuid(body?.projectId) ? body.projectId : null
  const productDescription = sanitizeText(body?.productDescription, { maxLength: 500, allowNewlines: true })
  const cameraTemplateId = isUuid(body?.cameraTemplateId) ? body.cameraTemplateId : null
  if (!projectId) return new Response(JSON.stringify({ error: 'projectId required' }), { status: 400 })

  // Token check
  const balance = await getTokenBalance(user.id)
  if (balance < TOKEN_COSTS.image_gen) {
    return new Response(JSON.stringify({ error: 'Insufficient tokens. Top up your balance to continue.' }), { status: 402 })
  }

  const admin = createAdminClient()

  const { data: project, error: projErr } = await admin
    .from('projects')
    .select('avatar')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (projErr || !project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })

  const avatar: Record<string, unknown> = project.avatar ?? {}
  const {
    faceB64,
    faceMime,
    avatarReferenceB64,
    avatarReferenceMime,
    backgroundReferenceB64,
    backgroundReferenceMime,
  } = avatar

  const { data: productRows } = await admin
    .from('project_images')
    .select('b64_data, mime_type, position')
    .eq('project_id', projectId)
    .eq('kind', 'product')
    .order('position')

  if (!productRows || productRows.length === 0) {
    return new Response(JSON.stringify({ error: 'No product images found for this project' }), { status: 400 })
  }

  const { cameraTemplateId: defaultCameraTemplateId } = await getMarketplaceTemplateDefaults()
  const selectedCameraTemplate = await getPublishedMarketplaceTemplateById(cameraTemplateId || defaultCameraTemplateId)
  const cameraAnglePrompt = getTemplateConfigValue(
    selectedCameraTemplate,
    'cameraAnglePrompt',
    'at eye level, centered on the subject',
  )
  // preset and user_model both use avatarReferenceB64; custom uses faceB64
  const usesReference = avatar.type === 'preset' || avatar.type === 'user_model'
  const validProductRows = productRows.filter(r => r.b64_data && r.mime_type)
  const hasAvatarReference = usesReference
    ? Boolean(avatarReferenceB64 && avatarReferenceMime)
    : Boolean(faceB64 && faceMime)
  const hasBackgroundReference = Boolean(backgroundReferenceB64 && backgroundReferenceMime)

  if (!hasAvatarReference) {
    return new Response(JSON.stringify({ error: 'Missing full-resolution avatar reference for generation' }), { status: 400 })
  }
  if (!hasBackgroundReference) {
    return new Response(JSON.stringify({ error: 'Missing full-resolution background reference for generation' }), { status: 400 })
  }

  const parts: unknown[] = []

  // 1. Avatar image
  if (!usesReference && faceB64 && faceMime) {
    parts.push({ inlineData: { mimeType: faceMime, data: faceB64 } })
  } else if (usesReference && avatarReferenceB64 && avatarReferenceMime) {
    parts.push({ inlineData: { mimeType: avatarReferenceMime, data: avatarReferenceB64 } })
  }

  // 2. Background image
  if (backgroundReferenceB64 && backgroundReferenceMime) {
    parts.push({ inlineData: { mimeType: backgroundReferenceMime, data: backgroundReferenceB64 } })
  }

  // 3. Product image(s)
  for (const row of validProductRows) {
    parts.push({ inlineData: { mimeType: row.mime_type, data: row.b64_data } })
  }

  // 4. Prompt last — exactly as a user would type it after attaching images
  const prompt = buildPrompt(
    validProductRows.length,
    productDescription || '',
    cameraAnglePrompt,
  )
  parts.push({ text: prompt })

  // Clear previous generated images
  await admin.from('project_images').delete().eq('project_id', projectId).eq('kind', 'generated')

  const stream = new ReadableStream({
    async start(controller) {
      let successCount = 0

      for (let i = 0; i < IMAGE_COUNT; i++) {
        // Tell client we're starting this image
        controller.enqueue(encode({ type: 'progress', index: i, total: IMAGE_COUNT }))

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
            logger.error('Gemini call failed', { userId: user.id, projectId, index: i }, new Error(err))
            controller.enqueue(encode({ type: 'image_error', index: i, error: 'Generation failed for this image' }))
            continue
          }

          const data = await res.json()
          const candidate = data.candidates?.[0]
          const imagePart = candidate?.content?.parts?.find(
            (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/')
          )

          if (!imagePart?.inlineData) {
            logger.error('No image in Gemini candidate', { userId: user.id, projectId, index: i, candidate: JSON.stringify(candidate).slice(0, 300) })
            controller.enqueue(encode({ type: 'image_error', index: i, error: 'No image returned' }))
            continue
          }

          const { mimeType, data: b64 } = imagePart.inlineData
          const ext = mimeType === 'image/png' ? 'png' : 'jpg'
          const storagePath = `${user.id}/${projectId}/generated-${i}.${ext}`

          const buffer = Buffer.from(b64, 'base64')
          await admin.storage.from('generated').upload(storagePath, buffer, { contentType: mimeType, upsert: true })

          const { data: imgRow } = await admin.from('project_images').insert({
            project_id: projectId,
            user_id: user.id,
            kind: 'generated',
            url: storagePath,
            storage_path: storagePath,
            position: i,
          }).select('id').single()

          if (imgRow) {
            successCount++
            const charged = await deductTokens(user.id, TOKEN_COSTS.image_gen, 'image_gen', 'Image generation', projectId)
            if (!charged) {
              logger.warn('Token deduction rejected after image generation', { userId: user.id, projectId })
              await admin.from('project_images').delete().eq('id', imgRow.id)
              await admin.storage.from('generated').remove([storagePath])
              controller.enqueue(encode({ type: 'image_error', index: i, error: 'Insufficient tokens.' }))
              continue
            }
            // Generate a long-lived signed URL for storage/download (7 days)
            const { data: signed } = await admin.storage.from('generated').createSignedUrl(storagePath, 60 * 60 * 24 * 7)
            const signedUrl = signed?.signedUrl ?? null
            // Track in storage_files with signed URL and descriptive name
            await admin.from('storage_files').upsert({
              user_id: user.id,
              project_id: projectId,
              file_name: `ai-image-${projectId.slice(0, 6)}-${i + 1}.${ext}`,
              file_type: 'generated_image',
              storage_path: storagePath,
              public_url: signedUrl,
              size_bytes: buffer.byteLength,
            }, { onConflict: 'storage_path' })
            // Stream the image immediately as a data URL so the client can show it right away
            controller.enqueue(encode({
              type: 'image',
              index: i,
              total: IMAGE_COUNT,
              image: { id: imgRow.id, url: `data:${mimeType};base64,${b64}` },
            }))
          }
        } catch (e) {
          logger.error('Gemini call threw', { userId: user.id, projectId, index: i }, e)
          controller.enqueue(encode({ type: 'image_error', index: i, error: 'Unexpected error' }))
        }
      }

      if (successCount > 0) {
        await admin.from('projects').update({ status: 'images_generated' }).eq('id', projectId)
      }

      controller.enqueue(encode({ type: 'done', total: IMAGE_COUNT, success: successCount }))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
