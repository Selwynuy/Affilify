import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTokens, getTokenBalance, getUserPlanId, refundTokens, syncSubscriptionTokenAccrual } from '@/lib/billing/tokens'
import { getAvailableModels, VIDEO_MODELS } from '@/lib/data/plans'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/db-rate-limit'
import type { VideoModel } from '@/lib/types/billing'
import type { VideoGenerationSettings } from '@/lib/video-generation'
import { getVideoGenerationProfile, getVideoGenerationTokenCost, normalizeVideoGenerationSettings } from '@/lib/video-generation'
import { recordVendorCostEvent } from '@/lib/analytics/profitability'
import { isUuid, parseInteger, sanitizeText, verifySameOrigin } from '@/lib/security'
import { assertStorageCapacity } from '@/lib/storage/quota'

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

const WAN_FPS = 16

// How long we wait for a Replicate prediction before giving up (ms).
// Replicate's own timeout on long predictions is around 30 minutes;
// we cap at 10 minutes to avoid hanging serverless functions indefinitely.
const POLL_DEADLINE_MS = 10 * 60 * 1000

/** Wall-clock budget for this route (polling + download + storage). Must be ≥ POLL_DEADLINE_MS. Vercel Hobby caps at 300s; Pro/Enterprise up to 800s — raise dashboard limit if needed. */
export const maxDuration = 300

export const dynamic = 'force-dynamic'
const POLL_INTERVAL_MS = 5_000

// Replicate hosts from which we allow downloading generated video output.
// Prevents SSRF if Replicate ever returns a tampered URL.
const REPLICATE_OUTPUT_HOSTS = [
  'replicate.delivery',
  'pbxt.replicate.delivery',
  'storage.googleapis.com',
]

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

interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
}

/**
 * Submits a prediction to Replicate and returns the prediction ID immediately.
 * Does NOT wait for completion — use pollPrediction() separately.
 */
async function submitPrediction(
  imageUrl: string,
  prompt: string,
  videoModel: VideoModel,
  settings: VideoGenerationSettings,
): Promise<string> {
  if (!REPLICATE_API_KEY) throw new Error('REPLICATE_API_KEY is not configured')

  const res = await fetch('https://api.replicate.com/v1/predictions', {
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

  if (res.status === 429) {
    // Replicate rate limit — surface clearly so the caller can refund tokens
    throw new RateLimitError('Replicate API rate limit reached. Please try again in a moment.')
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Replicate submit failed (${res.status}): ${body}`)
  }

  const prediction: ReplicatePrediction = await res.json()
  if (!prediction.id) throw new Error('No prediction ID returned from Replicate')

  return prediction.id
}

/**
 * Polls a Replicate prediction until it reaches a terminal state.
 * Returns the raw video URL from Replicate (temporary — must be archived).
 */
async function pollPrediction(predictionId: string): Promise<string> {
  if (!REPLICATE_API_KEY) throw new Error('REPLICATE_API_KEY is not configured')

  const pollUrl = `https://api.replicate.com/v1/predictions/${predictionId}`
  const deadline = Date.now() + POLL_DEADLINE_MS

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const res = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` },
    })

    if (!res.ok) {
      // Transient poll failure — keep retrying until deadline
      logger.warn('Replicate poll returned non-ok status', { predictionId, status: res.status })
      continue
    }

    const data: ReplicatePrediction = await res.json()

    if (data.status === 'succeeded') {
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output
      if (!videoUrl) throw new Error('Replicate returned succeeded but output was empty')
      return videoUrl
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate generation ${data.status}: ${data.error ?? 'unknown error'}`)
    }

    // status is 'starting' or 'processing' — keep polling
  }

  throw new Error(`Replicate timed out after 10 minutes (predictionId: ${predictionId}). Please try again.`)
}

/**
 * Downloads a video from a Replicate output URL and uploads it to Supabase Storage.
 * This is critical — Replicate deletes all prediction outputs after 1 hour.
 *
 * Returns the permanent storage path (within the 'videos' bucket).
 */
async function archiveVideoToStorage(
  replicateUrl: string,
  userId: string,
  projectId: string,
  index: number,
): Promise<{ storagePath: string; publicUrl: string }> {
  // Validate the URL is from a known Replicate host (SSRF guard)
  let parsed: URL
  try {
    parsed = new URL(replicateUrl)
  } catch {
    throw new Error('Invalid video URL returned from Replicate')
  }

  const isKnownHost = REPLICATE_OUTPUT_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
  )
  if (!isKnownHost) {
    throw new Error(`Unexpected video host from Replicate: ${parsed.hostname}`)
  }

  const downloadRes = await fetch(replicateUrl)
  if (!downloadRes.ok) {
    throw new Error(`Failed to download video from Replicate (${downloadRes.status})`)
  }

  const videoBuffer = await downloadRes.arrayBuffer()

  // Validate MP4 file signature (ftyp box at byte 4 or ISO base media header)
  const header = new Uint8Array(videoBuffer, 0, 12)
  const ftyp = String.fromCharCode(header[4], header[5], header[6], header[7])
  const isValidMp4 = ftyp === 'ftyp' || ftyp === 'free' || ftyp === 'mdat' || ftyp === 'moov'
  if (!isValidMp4) {
    throw new Error('Replicate returned a file that does not appear to be a valid MP4')
  }

  await assertStorageCapacity(createAdminClient(), userId, videoBuffer.byteLength)
  const storagePath = `${userId}/${projectId}/video-${index + 1}-${Date.now()}.mp4`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('videos')
    .upload(storagePath, videoBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to archive video to storage: ${uploadError.message}`)
  }

  const { data: urlData } = admin.storage.from('videos').getPublicUrl(storagePath)

  return { storagePath, publicUrl: urlData.publicUrl }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
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

  await syncSubscriptionTokenAccrual(user.id)
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
  const selectedProfile = getVideoGenerationProfile(videoModel, selectedSettings)
  const tokenCostPerVideo = getVideoGenerationTokenCost(videoModel, selectedSettings)
  const totalTokensNeeded = tokenCostPerVideo * imageIds.length

  // Check balance upfront — one DB read before we touch anything
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

  const optionLabel = [
    `${selectedSettings.duration}s`,
    selectedSettings.resolution,
    selectedSettings.mode,
    typeof selectedSettings.generateAudio === 'boolean'
      ? selectedSettings.generateAudio ? 'audio-on' : 'audio-off'
      : null,
  ].filter(Boolean).join(', ')

  const stream = new ReadableStream({
    async start(controller) {
      let successCount = 0

      for (let i = 0; i < orderedImages.length; i++) {
        const image = orderedImages[i]!
        controller.enqueue(encode({ type: 'progress', index: i, total: orderedImages.length }))

        // ── Step 1: Deduct tokens BEFORE calling Replicate ────────────────────
        // If Replicate fails, we refund. This order prevents a crash between
        // generation and billing from giving users free videos.
        const charged = await deductTokens(
          user.id,
          tokenCostPerVideo,
          'video_gen',
          `Video generation - ${videoModel.name} (${optionLabel})`,
          projectId,
        )

        if (!charged) {
          logger.warn('Insufficient tokens mid-batch during video generation', {
            userId: user.id, projectId, index: i,
          })
          controller.enqueue(encode({
            type: 'video_error',
            index: i,
            error: 'Insufficient tokens for this video.',
          }))
          continue
        }

        let predictionId: string | null = null

        try {
          // ── Step 2: Get a signed URL for the source image ──────────────────
          const sourcePath = image.storage_path || image.url
          if (!sourcePath) throw new Error('Generated image source missing')

          const { data: signed } = await admin.storage.from('generated').createSignedUrl(sourcePath, 60 * 30)
          if (!signed?.signedUrl) throw new Error('Failed to create signed URL for source image')

          // ── Step 3: Submit prediction to Replicate (returns immediately) ───
          predictionId = await submitPrediction(signed.signedUrl, motionPrompt, videoModel, selectedSettings)

          // Persist the prediction ID immediately so we can track it even if
          // the function crashes during the poll phase.
          await admin.from('project_videos').insert({
            project_id: projectId,
            user_id: user.id,
            image_id: image.id,
            status: 'processing',
            replicate_prediction_id: predictionId,
            url: '',
          })

          logger.info('Replicate prediction submitted', {
            userId: user.id, projectId, predictionId, model: videoModel.id, index: i,
          })

          // ── Step 4: Poll until Replicate finishes ──────────────────────────
          const replicateUrl = await pollPrediction(predictionId)

          // ── Step 5: Archive video to Supabase Storage immediately ──────────
          // Replicate deletes outputs after 1 hour — we must copy it now.
          const { storagePath, publicUrl } = await archiveVideoToStorage(
            replicateUrl,
            user.id,
            projectId,
            i,
          )

          // ── Step 6: Update project_videos with the permanent URL ───────────
          await admin
            .from('project_videos')
            .update({
              status: 'ready',
              url: publicUrl,
              storage_path: storagePath,
            })
            .eq('replicate_prediction_id', predictionId)

          // ── Step 7: Record vendor cost for profitability analytics ─────────
          await recordVendorCostEvent({
            userId: user.id,
            projectId,
            provider: 'replicate',
            operation: 'video_gen',
            model: videoModel.id,
            tokensCharged: tokenCostPerVideo,
            vendorCostUsd: selectedProfile.vendorPriceUsd,
            metadata: {
              imageId: image.id,
              predictionId,
              duration: selectedSettings.duration,
              resolution: selectedSettings.resolution ?? null,
              mode: selectedSettings.mode ?? null,
              generateAudio: selectedSettings.generateAudio ?? null,
            },
          })

          // ── Step 8: Record in storage_files for the storage page ──────────
          const storageFileName = `genetrify-video-${i + 1}.mp4`
          const { data: storageFile, error: storageFileError } = await admin.from('storage_files').insert({
            user_id: user.id,
            project_id: projectId,
            file_name: storageFileName,
            file_type: 'generated_video',
            storage_path: storagePath,
            public_url: publicUrl,
            size_bytes: 0,
          }).select('id').single()

          if (storageFileError) throw new Error(storageFileError.message)

          successCount++

          controller.enqueue(encode({
            type: 'video',
            index: i,
            total: orderedImages.length,
            video: { videoUrl: publicUrl, imageId: image.id, filename: storageFileName, storageFileId: storageFile.id },
          }))

          logger.info('Video generation succeeded', {
            userId: user.id, projectId, predictionId, index: i, storagePath,
          })

        } catch (e) {
          const message = e instanceof Error ? e.message : 'Video generation failed'

          logger.error('Video generation failed', {
            userId: user.id, projectId, predictionId: predictionId ?? 'none', index: i,
          }, e)

          // ── Refund tokens — the video was not delivered ────────────────────
          try {
            await refundTokens(
              user.id,
              tokenCostPerVideo,
              `Refund - video generation failed (${videoModel.name})`,
              projectId,
            )
            logger.info('Tokens refunded after video failure', {
              userId: user.id, projectId, tokens: tokenCostPerVideo,
            })
          } catch (refundError) {
            // Log but don't swallow — the generation error is the primary one
            logger.error('CRITICAL: token refund failed after video generation error', {
              userId: user.id, projectId, tokens: tokenCostPerVideo,
            }, refundError)
          }

          // Mark the DB record as failed if we got far enough to create one
          if (predictionId) {
            try {
              await admin
                .from('project_videos')
                .update({ status: 'failed', error_message: message })
                .eq('replicate_prediction_id', predictionId)
            } catch (dbErr) {
              logger.error('Failed to mark project_video as failed', { predictionId }, dbErr)
            }
          }

          controller.enqueue(encode({
            type: 'video_error',
            index: i,
            error: e instanceof RateLimitError
              ? message
              : 'Video generation failed. Your tokens have been refunded.',
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
