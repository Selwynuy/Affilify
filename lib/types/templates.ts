export type TemplateCategory = 'camera' | 'movement'

export interface MotionTemplate {
  id: string
  name: string
  category: TemplateCategory
  description: string
  /** Static thumbnail shown as fallback — path relative to /public */
  thumbnailUrl: string
  /**
   * Preview media (GIF or short MP4) shown on hover/tap.
   * Path relative to /public, e.g. "/templates/previews/watch-reveal.gif"
   * Leave undefined until the file is added — falls back to thumbnailUrl.
   */
  previewUrl?: string
  /** For movement templates: sent to Kling as the video motion prompt */
  promptFragment: string
  /** For camera templates: dropped into the Gemini {{camera_angle}} slot */
  cameraAnglePrompt?: string
  badge?: string
}
