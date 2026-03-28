export interface AvatarConfig {
  type: 'custom' | 'preset'
  presetId?: string
  gender: 'man' | 'woman'
  style: 'casual' | 'streetwear' | 'luxury' | 'minimal'
  // Only set for custom uploads — storage path + short-lived signed URL
  // faceB64 is NEVER persisted here; passed transiently at generate time only
  faceUrl?: string
  facePath?: string
}

export interface BackgroundConfig {
  type: 'preset' | 'custom'
  presetId?: string
  roomAesthetic: string
  roomColors: string
  roomElements: string
  thumbnailUrl?: string
}

export interface UserPreferences {
  onboarding_completed: boolean
  avatar_config: AvatarConfig | null
  background_config: BackgroundConfig | null
  camera_template_id: string | null
  movement_template_id: string | null
}
