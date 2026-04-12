'use client'

import { createContext, useContext, useState } from 'react'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

interface PreferencesContextValue {
  avatarConfig: AvatarConfig | null
  backgroundConfig: BackgroundConfig | null
  shotTypeTemplateId: string
  motionStyleTemplateId: string
  videoFlowTemplateId: string
  setAvatarConfig: (config: AvatarConfig | null) => void
  setBackgroundConfig: (config: BackgroundConfig | null) => void
  setShotTypeTemplateId: (id: string) => void
  setMotionStyleTemplateId: (id: string) => void
  setVideoFlowTemplateId: (id: string) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({
  initialAvatarConfig,
  initialBackgroundConfig,
  initialShotTypeTemplateId,
  initialMotionStyleTemplateId,
  initialVideoFlowTemplateId,
  children,
}: {
  initialAvatarConfig: AvatarConfig | null
  initialBackgroundConfig: BackgroundConfig | null
  initialShotTypeTemplateId: string
  initialMotionStyleTemplateId: string
  initialVideoFlowTemplateId: string
  children: React.ReactNode
}) {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(initialAvatarConfig)
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig | null>(initialBackgroundConfig)
  const [shotTypeTemplateId, setShotTypeTemplateId] = useState<string>(initialShotTypeTemplateId)
  const [motionStyleTemplateId, setMotionStyleTemplateId] = useState<string>(initialMotionStyleTemplateId)
  const [videoFlowTemplateId, setVideoFlowTemplateId] = useState<string>(initialVideoFlowTemplateId)

  return (
    <PreferencesContext.Provider value={{
      avatarConfig, backgroundConfig, shotTypeTemplateId, motionStyleTemplateId, videoFlowTemplateId,
      setAvatarConfig, setBackgroundConfig, setShotTypeTemplateId, setMotionStyleTemplateId, setVideoFlowTemplateId,
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
