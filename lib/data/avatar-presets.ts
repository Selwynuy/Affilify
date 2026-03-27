import type { AvatarConfig } from '@/lib/types/preferences'

export interface AvatarPreset {
  id: string
  label: string
  gender: 'man' | 'woman'
  style: AvatarConfig['style']
  thumbnailUrl: string
  // Injected into Gemini prompt instead of face inlineData
  promptHint: string
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'preset-m-casual-01',
    label: 'Casual Guy',
    gender: 'man',
    style: 'casual',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Casual+Guy',
    promptHint: 'a young man with a clean, natural look, short hair, athletic build, friendly expression',
  },
  {
    id: 'preset-m-street-01',
    label: 'Streetwear Guy',
    gender: 'man',
    style: 'streetwear',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Street+Guy',
    promptHint: 'a young man with a cool streetwear aesthetic, stylish fade haircut, confident expression',
  },
  {
    id: 'preset-m-luxury-01',
    label: 'Luxury Guy',
    gender: 'man',
    style: 'luxury',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Luxury+Guy',
    promptHint: 'a well-groomed man in his late 20s, sharp jawline, elegant and refined appearance',
  },
  {
    id: 'preset-m-minimal-01',
    label: 'Minimal Guy',
    gender: 'man',
    style: 'minimal',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Minimal+Guy',
    promptHint: 'a clean-cut man with a minimalist aesthetic, neutral expression, simple and modern look',
  },
  {
    id: 'preset-f-casual-01',
    label: 'Casual Girl',
    gender: 'woman',
    style: 'casual',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Casual+Girl',
    promptHint: 'a young woman with a natural, effortless look, warm smile, approachable expression',
  },
  {
    id: 'preset-f-street-01',
    label: 'Streetwear Girl',
    gender: 'woman',
    style: 'streetwear',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Street+Girl',
    promptHint: 'a young woman with a trendy streetwear style, confident and edgy expression',
  },
  {
    id: 'preset-f-luxury-01',
    label: 'Luxury Girl',
    gender: 'woman',
    style: 'luxury',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Luxury+Girl',
    promptHint: 'an elegant woman with a polished luxury aesthetic, sophisticated expression, model-like poise',
  },
  {
    id: 'preset-f-minimal-01',
    label: 'Minimal Girl',
    gender: 'woman',
    style: 'minimal',
    thumbnailUrl: 'https://placehold.co/200x300/1a1a1a/ffffff?text=Minimal+Girl',
    promptHint: 'a woman with a clean minimalist aesthetic, serene expression, understated beauty',
  },
]
