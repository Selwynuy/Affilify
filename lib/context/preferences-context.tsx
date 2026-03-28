'use client'

import { createContext, useContext, useState } from 'react'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import { DEFAULT_CAMERA_TEMPLATE_ID, DEFAULT_MOVEMENT_TEMPLATE_ID } from '@/lib/data/templates'

interface PreferencesContextValue {
  avatarConfig: AvatarConfig | null
  backgroundConfig: BackgroundConfig | null
  cameraTemplateId: string
  movementTemplateId: string
  setAvatarConfig: (config: AvatarConfig | null) => void
  setBackgroundConfig: (config: BackgroundConfig | null) => void
  setCameraTemplateId: (id: string) => void
  setMovementTemplateId: (id: string) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({
  initialAvatarConfig,
  initialBackgroundConfig,
  initialCameraTemplateId,
  initialMovementTemplateId,
  children,
}: {
  initialAvatarConfig: AvatarConfig | null
  initialBackgroundConfig: BackgroundConfig | null
  initialCameraTemplateId: string
  initialMovementTemplateId: string
  children: React.ReactNode
}) {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(initialAvatarConfig)
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig | null>(initialBackgroundConfig)
  const [cameraTemplateId, setCameraTemplateId] = useState<string>(initialCameraTemplateId)
  const [movementTemplateId, setMovementTemplateId] = useState<string>(initialMovementTemplateId)

  return (
    <PreferencesContext.Provider value={{
      avatarConfig, backgroundConfig, cameraTemplateId, movementTemplateId,
      setAvatarConfig, setBackgroundConfig, setCameraTemplateId, setMovementTemplateId,
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider')
  return ctx
}
