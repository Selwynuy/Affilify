/**
 * BytePlus ModelArk video generation provider.
 *
 * Used by Seedance 2.0 image-to-video models. Mirrors the Replicate pattern
 * in app/api/export/route.ts: submit → poll → return raw output URL. The
 * caller is responsible for archiving the URL to Supabase Storage (BytePlus
 * output URLs expire — assume ~24h, treat as ephemeral).
 *
 * Endpoint, model IDs, and request shape are env-driven so the operator can
 * paste exact values from the BytePlus ModelArk console without redeploying
 * code:
 *   - BYTE_PLUS                          required: API key (Bearer token)
 *   - BYTEPLUS_BASE_URL                  default: https://ark.ap-southeast.bytepluses.com/api/v3
 *   - BYTEPLUS_SEEDANCE_FAST_MODEL_ID    model field for Seedance 2.0 Fast
 *   - BYTEPLUS_SEEDANCE_PRO_MODEL_ID     model field for Seedance 2.0 Pro
 */

import { logger } from '@/lib/logger'

const POLL_DEADLINE_MS = 10 * 60 * 1000
const POLL_INTERVAL_MS = 5_000

const DEFAULT_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3'
const DEFAULT_SEEDANCE_FAST_MODEL = 'seedance-2-0-fast'
const DEFAULT_SEEDANCE_PRO_MODEL = 'seedance-2-0'

// Hosts BytePlus is allowed to return for output video URLs. Used by the
// caller to validate against SSRF before downloading.
export const BYTEPLUS_OUTPUT_HOSTS = [
  'ark-content-generation-v2-ap-southeast-1.tos-ap-southeast-1.bytepluses.com',
  'ark-content-generation-v2-ap-southeast.tos-ap-southeast-1.bytepluses.com',
  'tos-ap-southeast-1.bytepluses.com',
  'tos-ap-southeast-1.volces.com',
]

export class BytePlusRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BytePlusRateLimitError'
  }
}

interface BytePlusTaskResponse {
  id?: string
  task_id?: string
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  content?: { video_url?: string }
  error?: { message?: string; code?: string } | string | null
}

export interface BytePlusSubmitInput {
  modelKey: 'seedance-fast' | 'seedance-pro'
  imageUrl: string
  prompt: string
  duration: number
  resolution?: string
  aspectRatio?: string
}

function getApiKey(): string {
  const key = process.env.BYTE_PLUS
  if (!key) {
    throw new Error('BYTE_PLUS API key is not configured')
  }
  return key
}

function getBaseUrl(): string {
  return (process.env.BYTEPLUS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
}

function getModelId(modelKey: BytePlusSubmitInput['modelKey']): string {
  if (modelKey === 'seedance-fast') {
    return process.env.BYTEPLUS_SEEDANCE_FAST_MODEL_ID ?? DEFAULT_SEEDANCE_FAST_MODEL
  }
  return process.env.BYTEPLUS_SEEDANCE_PRO_MODEL_ID ?? DEFAULT_SEEDANCE_PRO_MODEL
}

/**
 * Submits a video generation task to BytePlus ModelArk.
 * Returns the task ID for subsequent polling.
 */
export async function submitBytePlusTask(input: BytePlusSubmitInput): Promise<string> {
  const apiKey = getApiKey()
  const baseUrl = getBaseUrl()
  const model = getModelId(input.modelKey)

  // ModelArk video task body. The "content" array supports mixed text + image
  // items; image_url is a publicly accessible URL (we pass a Supabase signed
  // URL from the caller). Resolution/duration/ratio land in the parameters
  // block, matching the documented Seedance 2.0 schema.
  const body = {
    model,
    content: [
      { type: 'text', text: input.prompt },
      { type: 'image_url', image_url: { url: input.imageUrl } },
    ],
    parameters: {
      duration: input.duration,
      ...(input.resolution ? { resolution: input.resolution } : {}),
      ratio: input.aspectRatio ?? '9:16',
    },
  }

  const res = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (res.status === 429) {
    throw new BytePlusRateLimitError('BytePlus rate limit reached. Please try again shortly.')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`BytePlus submit failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as BytePlusTaskResponse
  const taskId = data.id ?? data.task_id
  if (!taskId) {
    throw new Error('BytePlus did not return a task id')
  }
  return taskId
}

/**
 * Polls a BytePlus task until it reaches a terminal state.
 * Returns the raw output video URL on success.
 */
export async function pollBytePlusTask(taskId: string): Promise<string> {
  const apiKey = getApiKey()
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`
  const deadline = Date.now() + POLL_DEADLINE_MS

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      logger.warn('BytePlus poll returned non-ok status', { taskId, status: res.status })
      continue
    }

    const data = (await res.json()) as BytePlusTaskResponse

    if (data.status === 'succeeded') {
      const videoUrl = data.content?.video_url
      if (!videoUrl) throw new Error('BytePlus task succeeded but no video_url returned')
      return videoUrl
    }

    if (data.status === 'failed' || data.status === 'cancelled') {
      const errMsg = typeof data.error === 'string'
        ? data.error
        : data.error?.message ?? 'unknown error'
      throw new Error(`BytePlus generation ${data.status}: ${errMsg}`)
    }
    // queued / running — keep polling
  }

  throw new Error(`BytePlus timed out after 10 minutes (taskId: ${taskId})`)
}
