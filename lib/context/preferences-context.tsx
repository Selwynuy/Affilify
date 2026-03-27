'use client'

import { createContext, useContext, useState } from 'react'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

interface PreferencesContextValue {
  avatarConfig: AvatarConfig | null
  backgroundConfig: BackgroundConfig | null
  setAvatarConfig: (config: AvatarConfig | null) => void
  setBackgroundConfig: (config: BackgroundConfig | null) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({
  initialAvatarConfig,
  initialBackgroundConfig,
  children,
}: {
  initialAvatarConfig: AvatarConfig | null
  initialBackgroundConfig: BackgroundConfig | null
  children: React.ReactNode
}) {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(initialAvatarConfig)
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig | null>(initialBackgroundConfig)

  return (
    <PreferencesContext.Provider value={{ avatarConfig, backgroundConfig, setAvatarConfig, setBackgroundConfig }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider')
  return ctx
}
