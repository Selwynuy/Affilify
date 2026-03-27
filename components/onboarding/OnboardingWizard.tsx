'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AvatarSetup } from './AvatarSetup'
import { BackgroundSetup } from './BackgroundSetup'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import { Button } from '@/components/ui/button'

type PartialAvatar = Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }
type PartialBackground = Partial<BackgroundConfig>

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [avatarConfig, setAvatarConfig] = useState<PartialAvatar>({ gender: 'man', style: 'casual' })
  const [backgroundConfig, setBackgroundConfig] = useState<PartialBackground>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const step1Valid = avatarConfig.type === 'preset'
    ? !!avatarConfig.presetId
    : avatarConfig.type === 'custom' && !!avatarConfig.faceB64

  const step2Valid = !!backgroundConfig.presetId || backgroundConfig.type === 'custom'

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      // If custom face, upload it first to get a storage URL
      let finalAvatar: Partial<AvatarConfig> = {
        type: avatarConfig.type,
        presetId: avatarConfig.presetId,
        gender: avatarConfig.gender ?? 'man',
        style: avatarConfig.style ?? 'casual',
        faceUrl: avatarConfig.faceUrl,
      }

      if (avatarConfig.type === 'custom' && avatarConfig.faceB64 && avatarConfig.faceMime) {
        // Upload face to get a persistent storage URL
        const formData = new FormData()
        // Convert base64 back to blob for upload
        const byteString = atob(avatarConfig.faceB64)
        const arr = new Uint8Array(byteString.length)
        for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i)
        const blob = new Blob([arr], { type: avatarConfig.faceMime })
        formData.append('face', blob, 'face.jpg')
        formData.append('onboardingFaceOnly', 'true')

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData.faceUrl) {
          finalAvatar = { ...finalAvatar, faceUrl: uploadData.faceUrl, facePath: uploadData.facePath }
        }
      }

      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_config: finalAvatar,
          background_config: backgroundConfig,
          onboarding_completed: true,
        }),
      })

      if (!res.ok) throw new Error('Failed to save preferences')
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-lg">Affilify</p>
          <p className="text-zinc-500 text-sm">Step {step} of 2</p>
          {/* Step dots */}
          <div className="flex justify-center gap-2 pt-1">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${s <= step ? 'bg-white' : 'bg-zinc-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          {step === 1 && (
            <>
              <div>
                <h1 className="text-xl font-semibold text-white">Set up your avatar</h1>
                <p className="text-zinc-400 text-sm mt-1">
                  Upload your face or pick an AI model. This becomes your default for every video.
                </p>
              </div>
              <AvatarSetup value={avatarConfig} onChange={setAvatarConfig} />
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h1 className="text-xl font-semibold text-white">Choose your background</h1>
                <p className="text-zinc-400 text-sm mt-1">
                  This sets the scene for your AI-generated images. You can change it anytime.
                </p>
              </div>
              <BackgroundSetup value={backgroundConfig} onChange={setBackgroundConfig} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-col items-end gap-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-40"
              >
                Continue →
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!step2Valid || saving}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Finish setup →'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
