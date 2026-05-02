import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance, syncSubscriptionTokenAccrual } from '@/lib/billing/tokens'
import { TOKEN_COSTS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import { getGoogleVendorCostUsd, recordVendorCostEvent } from '@/lib/analytics/profitability'
import {
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateById,
  getTemplateConfigValue,
} from '@/lib/data/marketplace-templates'
import { resolveProjectThumbnailUrl } from '@/lib/projects/thumbnail'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'
import { StorageLimitError, assertStorageCapacity } from '@/lib/storage/quota'

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const IMAGE_COUNT = 1
const GEMINI_TIMEOUT_MS = 60_000

function buildPrompt(
  productCount: number,
  productDescription: string,
  cameraAnglePrompt: string,
  roomAesthetic: string,
  roomColors: string,
  roomElements: string,
): string {
  const lines: string[] = []
  const hasUserPrompt = productDescription.trim().length > 0

  lines.push(`Follow this priority order strictly.`)
  lines.push(`1. Copy the avatar identity exactly from the attached avatar reference image.`)
  lines.push(`2. Apply the attached product image inputs accurately to that avatar.`)
  lines.push(`3. Place the avatar naturally inside the same background environment or room concept.`)
  lines.push(`4. Use the requested angle as the camera viewpoint.`)
  lines.push(`5. Treat the user's final instruction as the highest-priority override for camera, framing, pose, scene cleanup, staging, and composition, while still preserving avatar identity and product fidelity unless the user explicitly asks otherwise.`)
  lines.push(`Use the attached avatar reference image strictly as the exact person.`)
  lines.push(`Use the attached background reference image as the same exact environment identity.`)
  lines.push(`Preserve the same room type, wall and floor materials, architecture, decor style, color palette, and lighting direction from the background reference.`)
  lines.push(`Background room concept: ${roomAesthetic || 'clean editorial interior'}.`)
  lines.push(`Background colors: ${roomColors || 'neutral tones'}.`)
  if (roomElements) {
    lines.push(`Typical background elements in this environment: ${roomElements}.`)
  }
  lines.push(`Do not replace, redesign, or restyle the background into a different room, studio, or material treatment.`)
  lines.push(`Do not change the background from white studio to concrete, from concrete to seamless paper, from indoor to outdoor, or otherwise invent a different set.`)
  lines.push(`When the camera angle changes, keep the same environment identity but reframe it naturally from the new viewpoint instead of freezing the original composition.`)
  lines.push(`The model must feel physically inside the background, with correct scale, perspective, floor contact, contact shadows, lighting interaction, and believable body physics.`)
  lines.push(`Do not make the model look pasted onto the background.`)
  lines.push(`Only transform the avatar's outfit to match the attached product image input.`)
  lines.push(`By default, use only garments, layers, accessories, footwear, and details that are visible in the user-provided product images.`)
  lines.push(`Treat the uploaded product images as the complete source of truth for what the model is allowed to wear.`)
  lines.push(`If a product is wearable, the model must wear it on the correct body part by default.`)
  lines.push(`Wearable products include footwear, earrings, necklaces, rings, bracelets, watches, belts, hats, sunglasses, bags, scarves, gloves, and any other apparel or accessories meant to be worn.`)
  lines.push(`Do not stage wearable products as hand-held items, carried props, or products floating beside the model unless the user's final instruction explicitly asks for that presentation.`)
  lines.push(`If the attached product image shows shoes or any other wearable item, the model must still be wearing that item even when it is outside the final frame.`)
  lines.push(`Never turn an off-frame wearable product into a hand-held item, carried prop, or separate staged object just because that body part is cropped out.`)
  lines.push(`If the attached product image shows earrings or other jewelry, place them on the correct body part and make them visible in the result whenever the framing reasonably allows it.`)
  lines.push(`Do not add any extra products, accessories, garments, props, branding, or items that are not present in the user-provided product images unless the user's final instruction explicitly requests them.`)
  lines.push(`If an accessory is not clearly shown in the attached product images, do not add it unless the user's final instruction explicitly asks for it.`)
  lines.push(`Do not invent jewelry or styling extras such as necklaces, chains, watches, bracelets, rings, earrings, belts, hats, sunglasses, or bags unless they are provided in the product images or explicitly requested in the user's final instruction.`)
  lines.push(`Do not add any extra outerwear or top layers such as sweatshirts, hoodies, jackets, coats, overshirts, cardigans, or vests unless they are explicitly included in the product images or explicitly requested in the user's final instruction.`)
  lines.push(`Do not place any garment on top of the provided clothing unless that garment is in the attached product inputs or explicitly requested in the user's final instruction.`)
  lines.push(`If the uploaded product is a t-shirt, shirt, polo, blouse, knit top, or any other upper-body garment, that exact product must be the visible outermost top on the model.`)
  lines.push(`Do not cover the provided top with another layer, and do not add an undershirt, overshirt, sweatshirt, sweater, hoodie, jacket, or visible necklace unless it is clearly present in the product inputs or explicitly requested by the user.`)
  lines.push(`Adjust the model's pose, hand placement, and styling presentation as needed to suit the transformed outfit naturally and make the outfit read clearly.`)
  lines.push(`Angles are camera-view instructions. Change the camera perspective, framing, height, lens feel, and viewpoint of the model accordingly.`)
  lines.push(`Do not interpret the angle by rotating, tilting, or floating the model's body unnaturally.`)
  lines.push(`Keep the model physically grounded, upright, and anatomically plausible unless the reference image itself clearly shows a supported leaning pose.`)
  lines.push(`Do not make the model appear to defy gravity, float, stick to walls, lean at an impossible angle, or balance in a way that would be unrealistic in a real photo shoot.`)
  lines.push(`Do not rigidly copy the original reference pose if a better pose is needed for the outfit, but keep the result realistic, flattering, ecommerce-appropriate, and physically believable.`)

  if (productCount === 1) {
    lines.push(`Apply the attached product image to the avatar's outfit accurately and naturally.`)
  } else if (productCount > 1) {
    lines.push(`Combine the attached product images into one coherent outfit on the avatar accurately and naturally.`)
  }

  if (productDescription) {
    lines.push(`User's final instruction: ${productDescription}.`)
    lines.push(`Treat the user's final instruction as authoritative for camera, framing, pose, background cleanup, staging, and composition.`)
    lines.push(`If the user's final instruction requests removing or changing objects in the scene, apply that within the same background environment rather than switching to a different background.`)
    lines.push(`If the user's final instruction conflicts with the default background framing or camera setup, follow the user's final instruction while keeping the same person, the same environment identity, and the provided product fidelity.`)
  }

  lines.push(`Camera viewpoint only: ${cameraAnglePrompt}.`)
  lines.push(`If the requested camera viewpoint conflicts with the original background framing, keep the same room, materials, and styling but generate a new physically plausible framing from that viewpoint.`)
  if (hasUserPrompt) {
    lines.push(`Because the user provided a final instruction, prioritize that instruction over default scene composition choices.`)
  }
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
  await syncSubscriptionTokenAccrual(user.id)
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
    roomAesthetic,
    roomColors,
    roomElements,
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

  const { shotTypeTemplateId: defaultShotTypeTemplateId } = await getMarketplaceTemplateDefaults()
  const selectedCameraTemplate = await getPublishedMarketplaceTemplateById(cameraTemplateId || defaultShotTypeTemplateId)
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
    sanitizeText(roomAesthetic, { maxLength: 120 }) || '',
    sanitizeText(roomColors, { maxLength: 160 }) || '',
    sanitizeText(roomElements, { maxLength: 260 }) || '',
  )
  parts.push({ text: prompt })

  // Determine the next generation round (keeps version history)
  const { data: roundData } = await admin.rpc('get_next_generation_round', { p_project_id: projectId })
  const generationRound = (roundData as number | null) ?? 1

  const stream = new ReadableStream({
    async start(controller) {
      let successCount = 0

      for (let i = 0; i < IMAGE_COUNT; i++) {
        // Tell client we're starting this image
        controller.enqueue(encode({ type: 'progress', index: i, total: IMAGE_COUNT }))

        const abortController = new AbortController()
        const timeoutHandle = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS)
        try {
          const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GOOGLE_AI_STUDIO_KEY ?? '',
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
            }),
            signal: abortController.signal,
          })

          if (!res.ok) {
            const err = await res.text()
            logger.error('Gemini call failed', { userId: user.id, projectId, index: i }, new Error(err))
            controller.enqueue(encode({ type: 'image_error', index: i, code: 'gemini_failed', error: 'Generation failed for this image' }))
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
          const storagePath = `${user.id}/${projectId}/round-${generationRound}/generated-${i}-${Date.now()}.${ext}`

          const buffer = Buffer.from(b64, 'base64')
          try {
            await assertStorageCapacity(admin, user.id, buffer.byteLength)
          } catch (error) {
            const message = error instanceof StorageLimitError
              ? error.message
              : 'Storage limit check failed.'
            controller.enqueue(encode({ type: 'image_error', index: i, error: message }))
            continue
          }

          await admin.storage.from('generated').upload(storagePath, buffer, { contentType: mimeType, upsert: true })

          const { data: imgRow } = await admin.from('project_images').insert({
            project_id: projectId,
            user_id: user.id,
            kind: 'generated',
            url: storagePath,
            storage_path: storagePath,
            position: i,
            generation_round: generationRound,
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
              file_name: `ai-image-${projectId.slice(0, 6)}-r${generationRound}-${i + 1}.${ext}`,
              file_type: 'generated_image',
              storage_path: storagePath,
              public_url: signedUrl,
              size_bytes: buffer.byteLength,
            }, { onConflict: 'storage_path' })
            await recordVendorCostEvent({
              userId: user.id,
              projectId,
              provider: 'google',
              operation: 'image_gen',
              model: GEMINI_MODEL,
              tokensCharged: TOKEN_COSTS.image_gen,
              vendorCostUsd: getGoogleVendorCostUsd('image_gen'),
              metadata: {
                generationRound,
                outputIndex: i,
                productCount: validProductRows.length,
              },
            })
            // Stream the image immediately as a data URL so the client can show it right away
            controller.enqueue(encode({
              type: 'image',
              index: i,
              total: IMAGE_COUNT,
              image: { id: imgRow.id, url: `data:${mimeType};base64,${b64}` },
            }))
          }
        } catch (e) {
          const isAbort = e instanceof Error && (e.name === 'AbortError' || abortController.signal.aborted)
          if (isAbort) {
            logger.warn('Gemini call timed out', { userId: user.id, projectId, index: i, timeoutMs: GEMINI_TIMEOUT_MS })
            controller.enqueue(encode({ type: 'image_error', index: i, code: 'timeout', error: 'Generation timed out. Please try again.' }))
          } else {
            logger.error('Gemini call threw', { userId: user.id, projectId, index: i }, e)
            controller.enqueue(encode({ type: 'image_error', index: i, code: 'unexpected', error: 'Unexpected error' }))
          }
        } finally {
          clearTimeout(timeoutHandle)
        }
      }

      if (successCount > 0) {
        // Grab the latest generated image's signed URL as the project thumbnail
        const { data: latestImg } = await admin
          .from('project_images')
          .select('storage_path')
          .eq('project_id', projectId)
          .eq('kind', 'generated')
          .eq('generation_round', generationRound)
          .order('position')
          .limit(1)
          .single()
        const thumbnailUrl = await resolveProjectThumbnailUrl(admin, latestImg?.storage_path ?? null)
        await admin
          .from('projects')
          .update({ status: 'images_generated', thumbnail_url: latestImg?.storage_path ?? null })
          .eq('id', projectId)
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
