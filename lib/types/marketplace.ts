// Types for the staff-managed template marketplace.
// Config is stored as JSONB and varies per category — kept extensible via index signature.

export type TemplateCategory = 'shot_type' | 'motion_style' | 'video_flow' | 'avatar' | 'background' | 'workflow_template' | 'other'
export type TemplateStatus   = 'draft' | 'published' | 'archived'

export interface VideoFlowStepConfig {
  id: string
  title: string
  description?: string
  beatGoal?: string
  shotTypeTemplateId?: string
  motionStyleTemplateId?: string
  promptFragment?: string
  durationSec?: number
}

/** Workflow templates: pre-wired studio graph layouts. The slot list defines
 *  the product input nodes; the rest of the graph (avatar, scene, prompt,
 *  generate, result) is intrinsic to the UI. */
export type WorkflowSlotRole =
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'accessory'
  | 'bag'
  | 'hero'
  | 'other'

export interface WorkflowSlotConfig {
  role: WorkflowSlotRole
  label: string
  /** Grid coordinates for the slot column (x) and row (y) — pure layout hints. */
  x: number
  y: number
  required?: boolean
}

/**
 * Flexible per-category config object stored in the `config` JSONB column.
 *
 * Known fields by category:
 *   shot_type:    cameraAnglePrompt
 *   motion_style: promptFragment
 *   video_flow:   flowSummary, defaultStepId, steps[]
 *   avatar:     gender, style
 *   background: roomAesthetic, roomColors, roomElements
 *
 * New fields can be added without a schema migration — just update the form
 * and read them from config where needed.
 */
export interface TemplateConfig {
  /** Motion-style templates: motion description for animating the final generated image */
  promptFragment?: string
  /** Shot-type templates: injected into the image-generation prompt as the framing/composition directive */
  cameraAnglePrompt?: string
  /** Video-flow templates: short summary shown in the UI */
  flowSummary?: string
  /** Video-flow templates: which step should be selected first */
  defaultStepId?: string
  /** Video-flow templates: ordered beat list for short-form sequences */
  steps?: VideoFlowStepConfig[]
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
  /** Workflow templates: pre-wired studio graph layout */
  layoutVersion?: number
  defaultPrompt?: string
  slots?: WorkflowSlotConfig[]
  /** Catch-all for future or category-specific fields */
  [key: string]: unknown
}

export interface MarketplaceTemplate {
  id:            string
  title:         string
  description:   string | null
  category:      TemplateCategory
  status:        TemplateStatus
  thumbnail_url: string | null  // canonical template image used for cards; currently also written from admin's single image input
  preview_url:   string | null  // legacy optional preview media, kept for backward compatibility
  reference_url: string | null  // legacy generation image field, kept for backward compatibility
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
