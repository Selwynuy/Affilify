import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance } from '@/lib/billing/tokens'
import { TOKEN_COSTS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import {
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateById,
  getTemplateConfigValue,
} from '@/lib/data/marketplace-templates'

const GEMINI_MODEL = 'gemini-2.5-flash-image'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const IMAGE_COUNT = 1

const DEFAULT_TEMPLATE =
  `A {{gender}} {{face_description}}, {{height}} cm tall and weighing {{weight}} kg, ` +
  `stands in a modern, neatly arranged and {{room_aesthetic}} aesthetic room. ` +
  `The camera is positioned {{camera_angle}}. ` +
  `Use a {{focal_length}} focal length and an aperture of f/4-f/5.6 to keep the room details gently in focus. ` +
  `They are wearing the exact clothing product shown in the product reference photo, and it must be clearly and prominently visible, worn naturally. ` +
  `Their hands are in their pockets, gazing at the camera with an elegant and natural expression. ` +
  `The room interior is dominated by {{room_colors}}, creating a clean, modern impression. ` +
  `Room elements: {{room_elements}}. ` +
  `{{product_note}}` +
  `Visual style: Ultra-realistic fashion lifestyle photography, natural-blend studio lighting, soft shadows, symmetrical interiors. ` +
  `Aspect ratio: 9:16 vertical portrait.`

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{{${key}}}`
  )
}

function buildPrompt(
  avatar: Record<string, unknown>,
  productDescription: string,
  cameraAnglePrompt: string,
) {
  const vars: Record<string, string | number> = {
    gender:           String(avatar.gender ?? 'man'),
    face_description: avatar.type === 'preset' && avatar.promptHint
      ? String(avatar.promptHint)
      : 'with a face like the one in the face reference photo',
    height:           Number(avatar.height ?? 175),
    weight:           Number(avatar.weight ?? 70),
    room_aesthetic:   String(avatar.roomAesthetic ?? 'masculine'),
    camera_angle:     cameraAnglePrompt,
    focal_length:     String(avatar.focalLength ?? '35-50mm (natural, balanced)'),
    room_colors:      String(avatar.roomColors ?? 'white and black'),
    room_elements:    String(avatar.roomElements ?? 'a dark gray round shag rug, minimalist black-framed posters, warm LED strips'),
    product_note:     productDescription ? `Product being showcased: ${productDescription}. ` : '',
  }
  return fillTemplate(DEFAULT_TEMPLATE, vars)
}

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Rate limit: 10 generations per user per minute
  const rl = rateLimit(`generate:${user.id}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.warn('Rate limit hit on /api/generate', { userId: user.id })
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before generating again.' }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const { projectId, productDescription, cameraTemplateId } = await req.json()
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
  const { faceB64, faceMime } = avatar

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
  const prompt = buildPrompt(avatar, productDescription || '', cameraAnglePrompt)
  const parts: unknown[] = [{ text: prompt }]

  const isPreset = avatar.type === 'preset'
  if (!isPreset && faceB64 && faceMime) {
    parts.push({ inlineData: { mimeType: faceMime, data: faceB64 } })
  }
  for (const row of productRows) {
    if (row.b64_data && row.mime_type) {
      parts.push({ inlineData: { mimeType: row.mime_type, data: row.b64_data } })
    }
  }

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
            await deductTokens(user.id, TOKEN_COSTS.image_gen, 'image_gen', 'Image generation', projectId)
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
