import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type VendorProvider = 'google' | 'replicate' | 'byteplus'
export type VendorOperation = 'image_gen' | 'model_gen' | 'video_gen'

function readOptionalUsd(value: string | undefined) {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000
}

const DEFAULT_ESTIMATED_TOKEN_VALUE_USD = 0.00475

export function getEstimatedTokenValueUsd(tokens: number) {
  const usdPerToken = readOptionalUsd(process.env.ANALYTICS_ESTIMATED_TOKEN_VALUE_USD) ?? DEFAULT_ESTIMATED_TOKEN_VALUE_USD
  return roundUsd(tokens * usdPerToken)
}

export function getGoogleVendorCostUsd(operation: Extract<VendorOperation, 'image_gen' | 'model_gen'>) {
  if (operation === 'image_gen') {
    return readOptionalUsd(process.env.GOOGLE_IMAGE_GEN_VENDOR_COST_USD)
  }

  return readOptionalUsd(process.env.GOOGLE_MODEL_GEN_VENDOR_COST_USD)
}

export async function recordVendorCostEvent(input: {
  userId: string
  projectId?: string | null
  provider: VendorProvider
  operation: VendorOperation
  model: string
  tokensCharged: number
  vendorCostUsd: number | null
  metadata?: Record<string, unknown>
}) {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('vendor_cost_events').insert({
      user_id: input.userId,
      project_id: input.projectId ?? null,
      provider: input.provider,
      operation: input.operation,
      model: input.model,
      tokens_charged: input.tokensCharged,
      vendor_cost_usd: input.vendorCostUsd,
      estimated_token_value_usd: getEstimatedTokenValueUsd(input.tokensCharged),
      metadata: input.metadata ?? {},
    })

    if (error) {
      logger.warn('Failed to record vendor cost event', {
        userId: input.userId,
        projectId: input.projectId ?? undefined,
        provider: input.provider,
        operation: input.operation,
        model: input.model,
      })
    }
  } catch (error) {
    logger.error('Vendor cost event logging threw', {
      userId: input.userId,
      projectId: input.projectId ?? undefined,
      provider: input.provider,
      operation: input.operation,
      model: input.model,
    }, error)
  }
}
