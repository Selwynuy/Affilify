export interface AvatarConfig {
  type: 'custom' | 'preset' | 'user_model'
  presetId?: string
  /** Only for type: 'user_model' — references a row in user_models table */
  userModelId?: string
  /** Storage path of the user model image in the 'generated' bucket */
  userModelStoragePath?: string
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
  avatar_config: AvatarConfig | null
  background_config: BackgroundConfig | null
  shot_type_template_id: string | null
  motion_style_template_id: string | null
  video_flow_template_id: string | null
}
