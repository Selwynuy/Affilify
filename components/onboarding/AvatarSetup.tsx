'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { AVATAR_PRESETS } from '@/lib/data/avatar-presets'
import type { AvatarConfig } from '@/lib/types/preferences'

const STYLES: AvatarConfig['style'][] = ['casual', 'streetwear', 'luxury', 'minimal']
const GENDERS: { value: AvatarConfig['gender']; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
]

interface Props {
  value: Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }
  onChange: (v: Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }) => void
}

export function AvatarSetup({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const [meta, b64] = dataUrl.split(',')
      const mime = meta.split(':')[1].split(';')[0]
      onChange({
        ...value,
        type: 'custom',
        presetId: undefined,
        faceB64: b64,
        faceMime: mime,
        faceUrl: URL.createObjectURL(file),
      })
    }
    reader.readAsDataURL(file)
  }

  function handlePresetSelect(presetId: string) {
    const preset = AVATAR_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    onChange({
      ...value,
      type: 'preset',
      presetId: preset.id,
      gender: preset.gender,
      style: preset.style,
      faceB64: undefined,
      faceMime: undefined,
      faceUrl: undefined,
    })
  }

  const isCustomActive = value.type === 'custom'
  const isPresetActive = value.type === 'preset'

  return (
    <div className="space-y-6">
      {/* Two mode cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Upload face card */}
        <div
          className={cn(
            'rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-colors cursor-pointer',
            isCustomActive ? 'border-white bg-zinc-800' : 'border-zinc-700 hover:border-zinc-500',
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {isCustomActive && value.faceUrl ? (
            <img
              src={value.faceUrl}
              alt="Your face"
              className="w-20 h-20 rounded-full object-cover border-2 border-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center text-2xl text-zinc-400">
              +
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-white">Use your face</p>
            <p className="text-xs text-zinc-500 mt-0.5">Upload a clear front-facing photo</p>
          </div>
          {isCustomActive && (
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Change photo
            </button>
          )}
        </div>

        {/* Preset gallery card */}
        <div
          className={cn(
            'rounded-xl border-2 p-4 flex flex-col gap-3 transition-colors',
            isPresetActive ? 'border-white bg-zinc-800' : 'border-zinc-700',
          )}
        >
          <div className="text-center">
            <p className="text-sm font-medium text-white">Choose an AI model</p>
            <p className="text-xs text-zinc-500 mt-0.5">Pick from our preset avatars</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5 overflow-y-auto max-h-32">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  'rounded-lg overflow-hidden border-2 aspect-[2/3] transition-all',
                  value.presetId === preset.id ? 'border-white ring-1 ring-white/30' : 'border-zinc-700 hover:border-zinc-500',
                )}
                title={preset.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preset.thumbnailUrl} alt={preset.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gender pills */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Gender</p>
        <div className="flex gap-2">
          {GENDERS.map(({ value: g, label }) => (
            <button
              key={g}
              onClick={() => onChange({ ...value, gender: g })}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm transition-colors',
                value.gender === g ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Style pills */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Style</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...value, style: s })}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm capitalize transition-colors',
                value.style === s ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
