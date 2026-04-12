import type { MarketplaceTemplate, VideoFlowStepConfig } from '@/lib/types/marketplace'

const VIDEO_PROMPT_MAX_CHARS = 480
const BASE_PROMPT_MAX_CHARS = 120
const FLOW_BEAT_MAX_CHARS = 80
const FLOW_FRAGMENT_MAX_CHARS = 110
const MOTION_FRAGMENT_MAX_CHARS = 120

function collapseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateAtWord(value: string, maxChars: number): string {
  const cleaned = collapseText(value)
  if (cleaned.length <= maxChars) return cleaned

  const sliced = cleaned.slice(0, maxChars - 1)
  const lastSpace = sliced.lastIndexOf(' ')
  const compact = lastSpace > 24 ? sliced.slice(0, lastSpace) : sliced
  return `${compact.trimEnd()}\u2026`
}

function fitSegments(segments: string[], maxChars: number): string {
  const result: string[] = []

  for (const segment of segments) {
    const next = [...result, segment].join(' ')
    if (next.length <= maxChars) {
      result.push(segment)
      continue
    }

    const remaining = maxChars - (result.join(' ').length + (result.length > 0 ? 1 : 0))
    if (remaining < 24) break

    result.push(truncateAtWord(segment, remaining))
    break
  }

  return result.join(' ')
}

/**
 * Builds a Replicate motion prompt for the final generated image.
 * The image already contains the composed subject, styling, and scene, so this
 * prompt focuses on motion and strict preservation instead of re-describing
 * template metadata like gender or background labels.
 */
export function buildFinalImageVideoPrompt(
  basePrompt: string,
  movementTemplate: MarketplaceTemplate | null | undefined,
  flowStep?: VideoFlowStepConfig | null,
): string {
  const cleanedPrompt = truncateAtWord(basePrompt, BASE_PROMPT_MAX_CHARS)
  const motionFragment =
    typeof movementTemplate?.config.promptFragment === 'string'
      ? truncateAtWord(movementTemplate.config.promptFragment, MOTION_FRAGMENT_MAX_CHARS)
      : ''
  const flowFragment =
    typeof flowStep?.promptFragment === 'string'
      ? truncateAtWord(flowStep.promptFragment, FLOW_FRAGMENT_MAX_CHARS)
      : ''
  const flowBeat =
    typeof flowStep?.beatGoal === 'string'
      ? truncateAtWord(flowStep.beatGoal, FLOW_BEAT_MAX_CHARS)
      : ''

  return fitSegments([
    cleanedPrompt ? `Use the provided image as the exact first frame: ${cleanedPrompt}.` : '',
    flowBeat ? `Beat goal: ${flowBeat}.` : '',
    flowFragment ? `Beat direction: ${flowFragment}.` : '',
    motionFragment ? `Motion: ${motionFragment}.` : '',
    'Preserve identity, outfit, products, product count, placement, background, and composition.',
    'No new people, props, garments, or background elements.',
    'Vertical 9:16, realistic movement, controlled camera, polished UGC look.',
  ].filter(Boolean), VIDEO_PROMPT_MAX_CHARS)
}
