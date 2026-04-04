// Types for the staff-managed template marketplace.
// Config is stored as JSONB and varies per category — kept extensible via index signature.

export type TemplateCategory = 'camera' | 'movement' | 'avatar' | 'background' | 'other'
export type TemplateStatus   = 'draft' | 'published' | 'archived'

/**
 * Flexible per-category config object stored in the `config` JSONB column.
 *
 * Known fields by category:
 *   camera:     promptFragment, cameraAnglePrompt
 *   movement:   promptFragment
 *   avatar:     gender, style
 *   background: roomAesthetic, roomColors, roomElements
 *
 * New fields can be added without a schema migration — just update the form
 * and read them from config where needed.
 */
export interface TemplateConfig {
  /** Movement templates: motion description sent to Kling video API */
  promptFragment?: string
  /** Camera templates: injected into the {{camera_angle}} Gemini image prompt slot */
  cameraAnglePrompt?: string
  /** Avatar templates */
  gender?: string
  style?: string
  promptHint?: string
  /** Detailed avatar descriptors used as hard constraints in the generation prompt.
   *  These supplement the reference image and ensure accuracy when the thumbnail
   *  is insufficient for Gemini to reproduce fine details like skin tone. */
  skinTone?: string        // e.g. "fair porcelain with cool pink undertones"
  hairDescription?: string // e.g. "long straight black hair, center-parted"
  faceFeatures?: string    // e.g. "high cheekbones, monolid eyes, soft jawline"
  bodyType?: string        // e.g. "slim, 170cm, lean build"
  /** Background templates */
  roomAesthetic?: string
  roomColors?: string
  roomElements?: string
  /** Catch-all for future or category-specific fields */
  [key: string]: unknown
}

export interface MarketplaceTemplate {
  id:            string
  title:         string
  description:   string | null
  category:      TemplateCategory
  status:        TemplateStatus
  thumbnail_url: string | null  // small card image shown in the UI selector
  preview_url:   string | null  // medium preview, fallback for generation
  reference_url: string | null  // full-resolution image passed to Gemini — populate this for avatar + background templates
  badge:         string | null
  sort_order:    number
  config:        TemplateConfig
  created_by:    string | null
  created_at:    string
  updated_at:    string
}

/** Shape returned by useActionState for all template server actions */
export interface TemplateFormState {
  error?:   string
  success?: string
}
