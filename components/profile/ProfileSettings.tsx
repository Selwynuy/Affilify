'use client'

import { useState } from 'react'
import { AvatarSetup } from '@/components/onboarding/AvatarSetup'
import { BackgroundSetup } from '@/components/onboarding/BackgroundSetup'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/lib/context/preferences-context'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import { Check } from 'lucide-react'

type PartialAvatar = Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }

export function ProfileSettings() {
  const { avatarConfig: ctxAvatar, backgroundConfig: ctxBg, setAvatarConfig, setBackgroundConfig } = usePreferences()

  const [avatarDraft, setAvatarDraft] = useState<PartialAvatar>(ctxAvatar ?? { gender: 'man', style: 'casual' })
  const [bgDraft, setBgDraft] = useState<Partial<BackgroundConfig>>(ctxBg ?? {})

  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarSaved, setAvatarSaved] = useState(false)
  const [bgSaving, setBgSaving] = useState(false)
  const [bgSaved, setBgSaved] = useState(false)

  async function saveAvatar() {
    setAvatarSaving(true)
    setAvatarSaved(false)

    let finalAvatar: Partial<AvatarConfig> = {
      type: avatarDraft.type,
      presetId: avatarDraft.presetId,
      gender: avatarDraft.gender ?? 'man',
      style: avatarDraft.style ?? 'casual',
      faceUrl: avatarDraft.faceUrl,
    }

    if (avatarDraft.type === 'custom' && avatarDraft.faceB64 && avatarDraft.faceMime) {
      const byteString = atob(avatarDraft.faceB64)
      const arr = new Uint8Array(byteString.length)
      for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i)
      const blob = new Blob([arr], { type: avatarDraft.faceMime })
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

    // Push to shared context so GeneratePanel updates live
    setAvatarConfig(finalAvatar as AvatarConfig)

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
      body: JSON.stringify({ background_config: bgDraft }),
    })

    // Push to shared context so GeneratePanel updates live
    setBackgroundConfig(bgDraft as BackgroundConfig)

    setBgSaving(false)
    setBgSaved(true)
    setTimeout(() => setBgSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-white/50 text-sm mt-1">Your default settings applied to every video.</p>
      </div>

      {/* Avatar section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-white">Avatar</h2>
            <p className="text-white/40 text-sm">Your model for AI image generation.</p>
          </div>
          <Button
            onClick={saveAvatar}
            disabled={avatarSaving}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 shrink-0"
          >
            {avatarSaved ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            ) : avatarSaving ? 'Saving…' : 'Save avatar'}
          </Button>
        </div>
        <AvatarSetup value={avatarDraft} onChange={setAvatarDraft} />
      </section>

      <div className="border-t border-white/8" />

      {/* Background section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-white">Background</h2>
            <p className="text-white/40 text-sm">The scene behind your avatar.</p>
          </div>
          <Button
            onClick={saveBackground}
            disabled={bgSaving}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 shrink-0"
          >
            {bgSaved ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            ) : bgSaving ? 'Saving…' : 'Save background'}
          </Button>
        </div>
        <BackgroundSetup value={bgDraft} onChange={setBgDraft} />
      </section>
    </div>
  )
}
