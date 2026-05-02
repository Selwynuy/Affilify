import { TOKEN_COSTS, VIDEO_MODELS } from '@/lib/data/plans'
import type { VideoModel } from '@/lib/types/billing'

export interface VideoEquivalent {
  modelId: string
  modelName: string
  qualityLabel: VideoModel['qualityLabel']
  count: number
  tokenCost: number
}

export interface TokenEquivalents {
  tokens: number
  photos: number
  videosByModel: VideoEquivalent[]
  cheapestVideoCount: number
}

/**
 * Translate a raw token balance into outcome counts ("photos / videos") so
 * UI can frame "300 tokens" as "37 photos OR 7 videos with Hailuo Fast".
 *
 * Negative balances clamp to zero so callers never render absurd negatives.
 */
export function getTokenEquivalents(tokens: number): TokenEquivalents {
  const safe = Number.isFinite(tokens) && tokens > 0 ? Math.floor(tokens) : 0
  const photos = Math.floor(safe / TOKEN_COSTS.image_gen)

  const sorted = [...VIDEO_MODELS].sort((a, b) => a.tokenCost - b.tokenCost)

  const videosByModel: VideoEquivalent[] = sorted.map(model => ({
    modelId: model.id,
    modelName: model.name,
    qualityLabel: model.qualityLabel,
    tokenCost: model.tokenCost,
    count: Math.floor(safe / model.tokenCost),
  }))

  const cheapestVideoCount = videosByModel[0]?.count ?? 0

  return {
    tokens: safe,
    photos,
    videosByModel,
    cheapestVideoCount,
  }
}

/**
 * Short, marketing-friendly label: "37 photos OR 10 short videos".
 * Picks the cheapest video model so the count stays the most generous.
 */
export function formatTokenEquivalentsShort(tokens: number): string {
  const eq = getTokenEquivalents(tokens)
  if (eq.tokens === 0) return '0 photos · 0 videos'
  const cheapest = eq.videosByModel[0]
  const photoLabel = `${eq.photos.toLocaleString()} photo${eq.photos === 1 ? '' : 's'}`
  const videoLabel = cheapest
    ? `${eq.cheapestVideoCount.toLocaleString()} ${cheapest.modelName} video${eq.cheapestVideoCount === 1 ? '' : 's'}`
    : '0 videos'
  return `${photoLabel} OR ${videoLabel}`
}
