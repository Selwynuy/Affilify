import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance, getUserPlanId } from '@/lib/billing/tokens'
import { getAvailableModels, VIDEO_MODELS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import type { VideoModel } from '@/lib/types/billing'

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

const WAN_FPS = 16

function buildReplicateInput(
  imageUrl: string,
  prompt: string,
  videoModel: VideoModel,
  duration: number,
): Record<string, unknown> {
  switch (videoModel.id) {
    case 'wan-480p':
      return {
        image: imageUrl,
        prompt,
        num_frames: duration * WAN_FPS,
        frames_per_second: WAN_FPS,
        max_area: '480x832',
      }
    case 'hailuo-fast':
    case 'hailuo':
      return {
        first_frame_image: imageUrl,
        prompt,
        duration,
      }
    case 'kling-turbo':
      return {
        start_image: imageUrl,
        prompt,
        duration,
      }
    case 'kling-v3':
      return {
        start_image: imageUrl,
        prompt,
        duration,
        mode: 'pro',
        generate_audio: false,
      }
    case 'veo-fast':
      return {
        image: imageUrl,
        prompt,
        duration,
        aspect_ratio: '9:16',
        generate_audio: false,
      }
    default:
      return {
        start_image: imageUrl,
        prompt,
        duration,
      }
  }
}

async function generateVideo(imageUrl: string, prompt: string, videoModel: VideoModel, duration: number): Promise<string> {
  if (!REPLICATE_API_KEY) throw new Error('REPLICATE_API_KEY is not configured')

  const submitRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: videoModel.replicateVersion,
      input: buildReplicateInput(imageUrl, prompt, videoModel, duration),
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Rate limit: 5 export batches per user per minute (video gen is expensive)
  const rl = rateLimit(`export:${user.id}`, { limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.warn('Rate limit hit on /api/export', { userId: user.id })
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before exporting again.' }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const { projectId, imageIds, imageUrls, motionPrompt, videoModelId, duration: rawDuration } = await req.json()
  if (!projectId || !imageUrls?.length) {
    return new Response(JSON.stringify({ error: 'projectId and imageUrls required' }), { status: 400 })
  }
  if (!motionPrompt) {
    return new Response(JSON.stringify({ error: 'motionPrompt required' }), { status: 400 })
  }

  // Resolve video model — validate plan access
  const planId = await getUserPlanId(user.id)
  const availableModels = planId ? getAvailableModels(planId) : [VIDEO_MODELS[0]]
  const videoModel = availableModels.find((m) => m.id === videoModelId) ?? availableModels[0]

  // Validate + resolve duration for this model
  const requestedDuration = typeof rawDuration === 'number' && Number.isInteger(rawDuration)
    ? rawDuration
    : videoModel.defaultDuration
  if (!videoModel.allowedDurations.includes(requestedDuration)) {
    return new Response(JSON.stringify({
      error: `Duration ${requestedDuration}s is not supported by ${videoModel.name}. Allowed: ${videoModel.allowedDurations.join(', ')}s`,
    }), { status: 400 })
  }
  const duration = requestedDuration
  const tokenCostPerVideo = videoModel.tokenCost

  // Token check (for all videos in this batch)
  const totalTokensNeeded = tokenCostPerVideo * imageUrls.length
  const balance = await getTokenBalance(user.id)
  if (balance < totalTokensNeeded) {
    return new Response(JSON.stringify({
      error: `Insufficient tokens. This generation costs ${totalTokensNeeded} tokens but you only have ${balance}.`,
    }), { status: 402 })
  }

  const admin = createAdminClient()

  const stream = new ReadableStream({
    async start(controller) {
      let successCount = 0

      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl: string = imageUrls[i]
        const imageId: string = imageIds?.[i] ?? String(i)

        controller.enqueue(encode({ type: 'progress', index: i, total: imageUrls.length }))

        try {
          let resolvedUrl = imageUrl
          if (imageUrl.startsWith('data:')) {
            const [meta, b64] = imageUrl.split(',')
            const mimeType = meta.split(':')[1].split(';')[0]
            const ext = mimeType === 'image/png' ? 'png' : 'jpg'
            const path = `${user.id}/${projectId}/export-input-${i}.${ext}`
            const buffer = Buffer.from(b64, 'base64')
            await admin.storage.from('generated').upload(path, buffer, { contentType: mimeType, upsert: true })
            const { data: signed } = await admin.storage.from('generated').createSignedUrl(path, 60 * 60)
            if (!signed?.signedUrl) throw new Error('Failed to get signed URL for image')
            resolvedUrl = signed.signedUrl
          }

          const videoUrl = await generateVideo(resolvedUrl, motionPrompt, videoModel, duration)

          await admin.from('project_videos').insert({
            project_id: projectId,
            user_id: user.id,
            image_id: imageId,
            status: 'ready',
            url: videoUrl,
          })

          successCount++
          await deductTokens(user.id, tokenCostPerVideo, 'video_gen', `Video generation — ${videoModel.name}`, projectId)
          // Track in storage_files (external URL, size unknown — use 0 as placeholder)
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
            total: imageUrls.length,
            video: { videoUrl, imageId, filename: storageFileName, storageFileId: storageFile.id },
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

      controller.enqueue(encode({ type: 'done', total: imageUrls.length, success: successCount }))
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
