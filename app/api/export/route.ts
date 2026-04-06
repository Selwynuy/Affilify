import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance, getUserPlanId } from '@/lib/billing/tokens'
import { getAvailableModels, VIDEO_MODELS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import type { VideoModel } from '@/lib/types/billing'
import type { VideoGenerationSettings } from '@/lib/video-generation'
import { getVideoGenerationTokenCost, normalizeVideoGenerationSettings } from '@/lib/video-generation'
import { isUuid, parseInteger, sanitizeText, verifySameOrigin } from '@/lib/security'

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

const WAN_FPS = 16

function buildReplicateInput(
  imageUrl: string,
  prompt: string,
  videoModel: VideoModel,
  settings: VideoGenerationSettings,
): Record<string, unknown> {
  switch (videoModel.id) {
    case 'wan-480p':
      return {
        image: imageUrl,
        prompt,
        num_frames: settings.duration * WAN_FPS,
        frames_per_second: WAN_FPS,
        max_area: '480x832',
      }
    case 'hailuo-fast':
    case 'hailuo':
      return {
        first_frame_image: imageUrl,
        prompt,
        duration: settings.duration,
        resolution: settings.resolution,
      }
    case 'kling-turbo':
      return {
        start_image: imageUrl,
        prompt,
        duration: settings.duration,
      }
    case 'kling-v3':
      return {
        start_image: imageUrl,
        prompt,
        duration: settings.duration,
        mode: settings.mode,
        generate_audio: settings.generateAudio,
      }
    case 'veo-fast':
      return {
        image: imageUrl,
        prompt,
        duration: settings.duration,
        resolution: settings.resolution,
        aspect_ratio: '9:16',
        generate_audio: settings.generateAudio,
      }
    default:
      return {
        start_image: imageUrl,
        prompt,
        duration: settings.duration,
      }
  }
}

async function generateVideo(
  imageUrl: string,
  prompt: string,
  videoModel: VideoModel,
  settings: VideoGenerationSettings,
): Promise<string> {
  if (!REPLICATE_API_KEY) throw new Error('REPLICATE_API_KEY is not configured')

  const submitRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: videoModel.replicateVersion,
      input: buildReplicateInput(imageUrl, prompt, videoModel, settings),
    }),
  })

  if (!submitRes.ok) {
    const err = await submitRes.text()
    throw new Error(`Replicate submit failed: ${err}`)
  }

  const prediction = await submitRes.json()
  if (!prediction.id) throw new Error('No prediction ID returned from Replicate')

  const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`
  const deadline = Date.now() + 5 * 60 * 1000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000))

    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` },
    })
    if (!pollRes.ok) continue

    const pollData = await pollRes.json()

    if (pollData.status === 'succeeded') {
      const videoUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output
      if (!videoUrl) throw new Error('No video URL in Replicate response')
      return videoUrl
    }

    if (pollData.status === 'failed' || pollData.status === 'canceled') {
      throw new Error(`Replicate generation failed: ${JSON.stringify(pollData.error ?? '')}`)
    }
  }

  throw new Error('Replicate timed out after 5 minutes')
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

  const rl = await rateLimit(`export:${user.id}`, { limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.warn('Rate limit hit on /api/export', { userId: user.id })
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before exporting again.' }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const body = await req.json()
  const projectId = isUuid(body?.projectId) ? body.projectId : null
  const imageIds = Array.isArray(body?.imageIds)
    ? body.imageIds.filter((value: unknown): value is string => isUuid(typeof value === 'string' ? value : null))
    : []
  const motionPrompt = sanitizeText(body?.motionPrompt, { maxLength: 500, allowNewlines: true })
  const videoModelId = typeof body?.videoModelId === 'string' ? body.videoModelId : ''
  const rawDuration = parseInteger(body?.duration)
  const rawResolution = typeof body?.resolution === 'string' ? body.resolution : undefined
  const rawMode = typeof body?.mode === 'string' ? body.mode : undefined
  const rawGenerateAudio = typeof body?.generateAudio === 'boolean' ? body.generateAudio : undefined

  if (!projectId || imageIds.length === 0) {
    return new Response(JSON.stringify({ error: 'projectId and imageIds required' }), { status: 400 })
  }
  if (!motionPrompt) {
    return new Response(JSON.stringify({ error: 'motionPrompt required' }), { status: 400 })
  }

  const planId = await getUserPlanId(user.id)
  const availableModels = planId ? getAvailableModels(planId) : [VIDEO_MODELS[0]]
  const videoModel = availableModels.find((m) => m.id === videoModelId) ?? availableModels[0]

  const selectedSettings = normalizeVideoGenerationSettings(videoModel, {
    duration: typeof rawDuration === 'number' && Number.isInteger(rawDuration)
      ? rawDuration
      : videoModel.defaultDuration,
    resolution: rawResolution,
    mode: rawMode,
    generateAudio: rawGenerateAudio,
  })
  const tokenCostPerVideo = getVideoGenerationTokenCost(videoModel, selectedSettings)

  const totalTokensNeeded = tokenCostPerVideo * imageIds.length
  const balance = await getTokenBalance(user.id)
  if (balance < totalTokensNeeded) {
    return new Response(JSON.stringify({
      error: `Insufficient tokens. This generation costs ${totalTokensNeeded} tokens but you only have ${balance}.`,
    }), { status: 402 })
  }

  const admin = createAdminClient()
  const { data: images, error: imageError } = await admin
    .from('project_images')
    .select('id, storage_path, url')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('kind', 'generated')
    .in('id', imageIds)

  if (imageError) {
    return new Response(JSON.stringify({ error: imageError.message }), { status: 500 })
  }
  if (!images || images.length !== imageIds.length) {
    return new Response(JSON.stringify({ error: 'One or more selected images were not found' }), { status: 404 })
  }

  const imageMap = new Map<string, (typeof images)[number]>(images.map((image) => [image.id, image]))
  const orderedImages = imageIds
    .map((id: string) => imageMap.get(id))
    .filter((image: (typeof images)[number] | undefined): image is (typeof images)[number] => Boolean(image))

  const stream = new ReadableStream({
    async start(controller) {
      let successCount = 0

      for (let i = 0; i < orderedImages.length; i++) {
        const image = orderedImages[i]!
        controller.enqueue(encode({ type: 'progress', index: i, total: orderedImages.length }))

        try {
          const sourcePath = image.storage_path || image.url
          if (!sourcePath) throw new Error('Generated image source missing')

          const { data: signed } = await admin.storage.from('generated').createSignedUrl(sourcePath, 60 * 30)
          if (!signed?.signedUrl) throw new Error('Failed to create export image URL')

          const videoUrl = await generateVideo(signed.signedUrl, motionPrompt, videoModel, selectedSettings)

          await admin.from('project_videos').insert({
            project_id: projectId,
            user_id: user.id,
            image_id: image.id,
            status: 'ready',
            url: videoUrl,
          })

          const optionLabel = [
            `${selectedSettings.duration}s`,
            selectedSettings.resolution,
            selectedSettings.mode,
            typeof selectedSettings.generateAudio === 'boolean'
              ? selectedSettings.generateAudio ? 'audio-on' : 'audio-off'
              : null,
          ].filter(Boolean).join(', ')
          const charged = await deductTokens(
            user.id,
            tokenCostPerVideo,
            'video_gen',
            `Video generation - ${videoModel.name} (${optionLabel})`,
            projectId,
          )
          if (!charged) {
            logger.warn('Token deduction rejected after video generation', { userId: user.id, projectId, imageId: image.id })
            await admin.from('project_videos').delete().eq('project_id', projectId).eq('image_id', image.id).eq('url', videoUrl)
            controller.enqueue(encode({
              type: 'video_error',
              index: i,
              error: 'Insufficient tokens.',
            }))
            continue
          }

          successCount++
          const storageFileName = `genetrify-video-${i + 1}.mp4`
          const { data: storageFile, error: storageFileError } = await admin.from('storage_files').insert({
            user_id: user.id,
            project_id: projectId,
            file_name: storageFileName,
            file_type: 'generated_video',
            storage_path: videoUrl,
            public_url: videoUrl,
            size_bytes: 0,
          }).select('id').single()
          if (storageFileError) throw new Error(storageFileError.message)

          controller.enqueue(encode({
            type: 'video',
            index: i,
            total: orderedImages.length,
            video: { videoUrl, imageId: image.id, filename: storageFileName, storageFileId: storageFile.id },
          }))
        } catch (e) {
          logger.error('Video generation failed', { userId: user.id, projectId, index: i }, e)
          controller.enqueue(encode({
            type: 'video_error',
            index: i,
            error: e instanceof Error ? e.message : 'Video generation failed',
          }))
        }
      }

      if (successCount > 0) {
        await admin.from('projects').update({ status: 'videos_ready' }).eq('id', projectId)
      }

      controller.enqueue(encode({ type: 'done', total: orderedImages.length, success: successCount }))
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
