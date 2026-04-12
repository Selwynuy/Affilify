import type { MarketplaceTemplate, VideoFlowStepConfig } from '@/lib/types/marketplace'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeStep(value: unknown): VideoFlowStepConfig | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    description: typeof value.description === 'string' ? value.description : undefined,
    beatGoal: typeof value.beatGoal === 'string' ? value.beatGoal : undefined,
    shotTypeTemplateId: typeof value.shotTypeTemplateId === 'string' ? value.shotTypeTemplateId : undefined,
    motionStyleTemplateId: typeof value.motionStyleTemplateId === 'string' ? value.motionStyleTemplateId : undefined,
    promptFragment: typeof value.promptFragment === 'string' ? value.promptFragment : undefined,
    durationSec: typeof value.durationSec === 'number' ? value.durationSec : undefined,
  }
}

export function getVideoFlowSteps(template: MarketplaceTemplate | null | undefined): VideoFlowStepConfig[] {
  if (!template || template.category !== 'video_flow' || !Array.isArray(template.config.steps)) {
    return []
  }

  return template.config.steps
    .map((step) => normalizeStep(step))
    .filter((step): step is VideoFlowStepConfig => Boolean(step))
}

export function getDefaultVideoFlowStep(template: MarketplaceTemplate | null | undefined): VideoFlowStepConfig | null {
  const steps = getVideoFlowSteps(template)
  if (steps.length === 0) return null

  const defaultStepId = typeof template?.config.defaultStepId === 'string'
    ? template.config.defaultStepId
    : ''

  return steps.find((step) => step.id === defaultStepId) ?? steps[0] ?? null
}

export function getVideoFlowStepById(
  template: MarketplaceTemplate | null | undefined,
  stepId: string | null | undefined,
): VideoFlowStepConfig | null {
  const steps = getVideoFlowSteps(template)
  if (steps.length === 0) return null
  if (!stepId) return getDefaultVideoFlowStep(template)
  return steps.find((step) => step.id === stepId) ?? getDefaultVideoFlowStep(template)
}

export function getVideoFlowSummary(template: MarketplaceTemplate | null | undefined): string {
  return typeof template?.config.flowSummary === 'string' ? template.config.flowSummary : ''
}
