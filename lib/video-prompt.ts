import type { MarketplaceTemplate } from '@/lib/types/marketplace'

/**
 * Builds a Replicate motion prompt for the final generated image.
 * The image already contains the composed subject, styling, and scene, so this
 * prompt focuses on motion and strict preservation instead of re-describing
 * template metadata like gender or background labels.
 */
export function buildFinalImageVideoPrompt(
  basePrompt: string,
  movementTemplate: MarketplaceTemplate | null | undefined,
): string {
  const cleanedPrompt = basePrompt.trim()
  const motionFragment =
    typeof movementTemplate?.config.promptFragment === 'string'
      ? movementTemplate.config.promptFragment.trim()
      : ''

  return [
    cleanedPrompt ? `Reference image intent: ${cleanedPrompt}.` : '',
    motionFragment ? `Movement direction: ${motionFragment}.` : '',
    'Animate only the final generated image that was provided.',
    'Preserve the exact model strictly: identity, face, body shape, skin tone, hair, styling, outfit, pose language, and accessories.',
    'Preserve the existing products strictly and keep their count, placement, scale, and appearance unchanged.',
    'Do not add, remove, swap, duplicate, or invent any people, products, props, garments, or background elements.',
    'Do not place any additional products behind the model, beside the model, or on the model.',
    'Keep the original composition and scene intact while making the model move like a fashion photoshoot with controlled editorial energy, natural pose transitions, and clean camera movement.',
    'Keep framing vertical 9:16 and motion realistic, polished, and coherent.',
  ]
    .filter(Boolean)
    .join(' ')
}
