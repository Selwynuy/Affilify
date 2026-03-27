'use client'

import { useState } from 'react'
import { AvatarSetup } from '@/components/onboarding/AvatarSetup'
import { BackgroundSetup } from '@/components/onboarding/BackgroundSetup'
import { Button } from '@/components/ui/button'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

type PartialAvatar = Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }

interface Props {
  initialAvatarConfig: AvatarConfig | null
  initialBackgroundConfig: BackgroundConfig | null
}

export function ProfileSettings({ initialAvatarConfig, initialBackgroundConfig }: Props) {
  const [avatarConfig, setAvatarConfig] = useState<PartialAvatar>(initialAvatarConfig ?? { gender: 'man', style: 'casual' })
  const [backgroundConfig, setBackgroundConfig] = useState<Partial<BackgroundConfig>>(initialBackgroundConfig ?? {})

  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarSaved, setAvatarSaved] = useState(false)
  const [bgSaving, setBgSaving] = useState(false)
  const [bgSaved, setBgSaved] = useState(false)

  async function saveAvatar() {
    setAvatarSaving(true)
    setAvatarSaved(false)

    let finalAvatar: Partial<AvatarConfig> = {
      type: avatarConfig.type,
      presetId: avatarConfig.presetId,
      gender: avatarConfig.gender ?? 'man',
      style: avatarConfig.style ?? 'casual',
      faceUrl: avatarConfig.faceUrl,
    }

    // Upload face if new custom upload
    if (avatarConfig.type === 'custom' && avatarConfig.faceB64 && avatarConfig.faceMime) {
      const byteString = atob(avatarConfig.faceB64)
      const arr = new Uint8Array(byteString.length)
      for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i)
      const blob = new Blob([arr], { type: avatarConfig.faceMime })
      const fd = new FormData()
      fd.append('face', blob, 'face.jpg')
      fd.append('onboardingFaceOnly', 'true')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.faceUrl) {
        finalAvatar = { ...finalAvatar, faceUrl: data.faceUrl, facePath: data.facePath }
      }
    }

    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_config: finalAvatar }),
    })

    setAvatarSaving(false)
    setAvatarSaved(true)
    setTimeout(() => setAvatarSaved(false), 2000)
  }

  async function saveBackground() {
    setBgSaving(true)
    setBgSaved(false)
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ background_config: backgroundConfig }),
    })
    setBgSaving(false)
    setBgSaved(true)
    setTimeout(() => setBgSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-zinc-400 text-sm mt-1">Your default settings applied to every video.</p>
      </div>

      {/* Avatar section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-white">Avatar</h2>
            <p className="text-zinc-500 text-sm">Your model for AI image generation.</p>
          </div>
          <Button
            onClick={saveAvatar}
            disabled={avatarSaving}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 shrink-0"
          >
            {avatarSaved ? '✓ Saved' : avatarSaving ? 'Saving…' : 'Save avatar'}
          </Button>
        </div>
        <AvatarSetup value={avatarConfig} onChange={setAvatarConfig} />
      </section>

      <div className="border-t border-zinc-800" />

      {/* Background section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-white">Background</h2>
            <p className="text-zinc-500 text-sm">The scene behind your avatar.</p>
          </div>
          <Button
            onClick={saveBackground}
            disabled={bgSaving}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 shrink-0"
          >
            {bgSaved ? '✓ Saved' : bgSaving ? 'Saving…' : 'Save background'}
          </Button>
        </div>
        <BackgroundSetup value={backgroundConfig} onChange={setBackgroundConfig} />
      </section>

    </div>
  )
}
