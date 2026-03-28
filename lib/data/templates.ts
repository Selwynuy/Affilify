import type { MotionTemplate } from '@/lib/types/templates'

export const MOTION_TEMPLATES: MotionTemplate[] = [
  // ── Camera angles ──────────────────────────────────────────────────────────
  // cameraAnglePrompt drops into the {{camera_angle}} slot in the Gemini image prompt
  {
    id: '360-spin',
    name: '360° Spin',
    category: 'camera',
    description: 'Full rotation shot showcasing every angle.',
    thumbnailUrl: '/templates/360-spin.jpg',
    previewUrl: '/templates/previews/360-spin.gif',
    promptFragment: '',
    cameraAnglePrompt: 'at eye level, centered on the subject, static shot framed for a full 360-degree rotation',
    badge: 'Popular',
  },
  {
    id: '45-above',
    name: '45° Above',
    category: 'camera',
    description: "Bird's-eye diagonal — great for accessories.",
    thumbnailUrl: '/templates/45-above.jpg',
    previewUrl: '/templates/previews/45-above.gif',
    promptFragment: '',
    cameraAnglePrompt: 'from a 45-degree high-angle overhead diagonal, looking down at the subject who faces up toward camera',
  },
  {
    id: 'eye-level',
    name: 'Eye Level',
    category: 'camera',
    description: 'Classic straight-on static camera shot.',
    thumbnailUrl: '/templates/eye-level.jpg',
    previewUrl: '/templates/previews/eye-level.gif',
    promptFragment: '',
    cameraAnglePrompt: 'at direct eye level, centered and straight-on, natural perspective with no distortion',
    badge: 'New',
  },
  {
    id: 'low-angle',
    name: 'Low Angle',
    category: 'camera',
    description: 'Floor-level looking up — bold, editorial feel.',
    thumbnailUrl: '/templates/low-angle.jpg',
    previewUrl: '/templates/previews/low-angle.gif',
    promptFragment: '',
    cameraAnglePrompt: 'from a low floor-level angle pointing upward at the subject, creating a dramatic and powerful perspective',
  },
  {
    id: 'close-up',
    name: 'Close-up',
    category: 'camera',
    description: 'Tight on the product — model keeps it center frame.',
    thumbnailUrl: '/templates/close-up.jpg',
    previewUrl: '/templates/previews/close-up.gif',
    promptFragment: '',
    cameraAnglePrompt: 'in a tight close-up framing, with the product prominently centered and soft background bokeh',
  },

  // ── Model movements ────────────────────────────────────────────────────────
  {
    id: 'watch-reveal',
    name: 'Watch Reveal',
    category: 'movement',
    description: 'Glances at wrist then extends arm toward camera.',
    thumbnailUrl: '/templates/watch-reveal.jpg',
    previewUrl: '/templates/previews/watch-reveal.gif',
    promptFragment:
      'the model casually glances down at their wrist then extends their arm confidently toward the camera to reveal the product. ' +
      'Natural, confident motion. No speaking, no lip-sync.',
    badge: 'Popular',
  },
  {
    id: 'product-hold',
    name: 'Product Hold',
    category: 'movement',
    description: 'Holds product out and slowly rotates it.',
    thumbnailUrl: '/templates/product-hold.jpg',
    previewUrl: '/templates/previews/product-hold.gif',
    promptFragment:
      'the model holds the product with both hands and slowly rotates it left and right to show all angles. ' +
      'Calm, editorial pace. No speaking, no lip-sync.',
  },
  {
    id: 'slow-strut',
    name: 'Slow Strut',
    category: 'movement',
    description: 'Confident catwalk walk toward the camera.',
    thumbnailUrl: '/templates/slow-strut.jpg',
    previewUrl: '/templates/previews/slow-strut.gif',
    promptFragment:
      'the model performs a slow, confident catwalk strut walking directly toward the camera. ' +
      'Full outfit and product visible throughout. No speaking, no lip-sync.',
  },
  {
    id: 'hand-to-face',
    name: 'Hand to Face',
    category: 'movement',
    description: 'Touches face or neck — great for skincare and jewelry.',
    thumbnailUrl: '/templates/hand-to-face.jpg',
    previewUrl: '/templates/previews/hand-to-face.gif',
    promptFragment:
      'the model slowly raises their hand to gently touch their face or neck, drawing natural attention to the product. ' +
      'Soft, elegant movement. No speaking, no lip-sync.',
  },
  {
    id: 'sit-and-pose',
    name: 'Sit & Pose',
    category: 'movement',
    description: 'Sits and leans back in a relaxed lifestyle pose.',
    thumbnailUrl: '/templates/sit-and-pose.jpg',
    previewUrl: '/templates/previews/sit-and-pose.gif',
    promptFragment:
      'the model sits casually and leans back confidently, posing with the product in a relaxed lifestyle manner. ' +
      'Natural, candid energy. No speaking, no lip-sync.',
    badge: 'New',
  },
]

export const DEFAULT_CAMERA_TEMPLATE_ID = '360-spin'
export const DEFAULT_MOVEMENT_TEMPLATE_ID = 'watch-reveal'

export function getTemplate(id: string): MotionTemplate {
  return MOTION_TEMPLATES.find((t) => t.id === id) ?? MOTION_TEMPLATES[0]
}

/** Returns the camera angle string for the Gemini {{camera_angle}} slot */
export function getCameraAnglePrompt(cameraTemplateId: string): string {
  const tmpl = getTemplate(cameraTemplateId)
  return tmpl.cameraAnglePrompt ?? 'at eye level, centered on the subject'
}

/** Returns the motion prompt for Kling — movement only, no camera framing */
export function buildVideoPrompt(
  movementTemplateId: string,
  gender: string,
  roomAesthetic: string,
): string {
  const movement = getTemplate(movementTemplateId)
  return (
    `A ${gender} in a ${roomAesthetic} room — ${movement.promptFragment} ` +
    `The overall mood is elegant and confident.`
  )
}
