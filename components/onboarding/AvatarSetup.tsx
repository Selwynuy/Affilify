'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { AVATAR_PRESETS } from '@/lib/data/avatar-presets'
import type { AvatarConfig } from '@/lib/types/preferences'
import { Upload, Check } from 'lucide-react'

interface Props {
  value: Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }
  onChange: (v: Partial<AvatarConfig> & { faceB64?: string; faceMime?: string }) => void
}

// Gradient palette cycles through presets so each card looks distinct
const CARD_GRADIENTS = [
  'from-violet-900/60 to-indigo-900/60',
  'from-fuchsia-900/60 to-violet-900/60',
  'from-blue-900/60 to-violet-900/60',
  'from-indigo-900/60 to-slate-900/60',
  'from-pink-900/60 to-fuchsia-900/60',
  'from-rose-900/60 to-pink-900/60',
  'from-purple-900/60 to-pink-900/60',
  'from-violet-900/60 to-purple-900/60',
]

const GENDER_EMOJI: Record<string, string> = {
  man: '👤',
  woman: '👤',
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

  return (
    <div className="space-y-5">

      {/* Preset grid — full width, primary choice */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Choose an AI avatar</p>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_PRESETS.map((preset, i) => {
            const selected = value.presetId === preset.id
            const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
            const hasThumbnail = !preset.thumbnailUrl.includes('placehold.co')

            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  'relative rounded-xl overflow-hidden aspect-[2/3] transition-all duration-200 group',
                  selected
                    ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-[#0f0d1a]'
                    : 'ring-1 ring-white/8 hover:ring-white/20',
                )}
              >
                {hasThumbnail ? (
                  <img
                    src={preset.thumbnailUrl}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Placeholder until real images are added
                  <div className={cn('w-full h-full bg-gradient-to-b flex flex-col items-center justify-end pb-3 px-1', gradient)}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl opacity-20 select-none">
                        {preset.gender === 'woman' ? '♀' : '♂'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Label overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-2 px-1.5">
                  <p className="text-[11px] font-medium text-white leading-tight text-center">{preset.label}</p>
                </div>

                {/* Selected checkmark */}
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider with OR */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-xs text-white/25 font-medium">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Upload your own face — secondary option */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3.5 cursor-pointer transition-all duration-200',
          isCustomActive
            ? 'border-violet-500/60 bg-violet-500/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]',
        )}
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
            className="w-12 h-12 rounded-full object-cover border-2 border-violet-500/60 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-white/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Use your own face</p>
          <p className="text-xs text-white/40 mt-0.5">Upload a clear front-facing photo</p>
        </div>
        {isCustomActive && (
          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

    </div>
  )
}
