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

// Warm-dark gradient palette aligned to design system
const CARD_GRADIENTS = [
  'from-[#1a1f27] to-[#222831]',
  'from-[#1c2228] to-[#1a1f27]',
  'from-[#1f2329] to-[#222831]',
  'from-[#182025] to-[#1a1f27]',
  'from-[#1e2530] to-[#222831]',
  'from-[#1a2028] to-[#1f2530]',
  'from-[#1c2230] to-[#222831]',
  'from-[#182028] to-[#1a1f27]',
]

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                    ? 'ring-2 ring-brand-accent ring-offset-1 ring-offset-brand-surface'
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
                      <div className="w-14 h-14 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-brand-accent/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Label overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-2 px-1.5">
                  <p className="text-[12px] font-semibold text-white leading-tight text-center">{preset.label}</p>
                </div>

                {/* Selected checkmark */}
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center">
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
            ? 'border-brand-accent/60 bg-brand-accent/5'
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
            className="w-12 h-12 rounded-full object-cover border-2 border-brand-accent/60 shrink-0"
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
          <div className="w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

    </div>
  )
}
