'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BACKGROUND_PRESETS } from '@/lib/data/background-presets'
import type { BackgroundConfig } from '@/lib/types/preferences'

interface Props {
  value: Partial<BackgroundConfig>
  onChange: (v: Partial<BackgroundConfig>) => void
}

export function BackgroundSetup({ value, onChange }: Props) {
  const [tab, setTab] = useState<'presets' | 'generate'>('presets')

  function handlePresetSelect(presetId: string) {
    const preset = BACKGROUND_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    onChange({
      type: 'preset',
      presetId: preset.id,
      roomAesthetic: preset.roomAesthetic,
      roomColors: preset.roomColors,
      roomElements: preset.roomElements,
      thumbnailUrl: preset.thumbnailUrl,
    })
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-brand-bg rounded-lg p-1 w-full sm:w-fit">
        <button
          onClick={() => setTab('presets')}
          className={cn(
            'flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm transition-colors',
            tab === 'presets' ? 'bg-brand-accent text-brand-bg font-medium' : 'text-brand-text/40 hover:text-brand-text',
          )}
        >
          Presets
        </button>
        <button
          onClick={() => setTab('generate')}
          className={cn(
            'flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm transition-colors',
            tab === 'generate' ? 'bg-brand-accent text-brand-bg font-medium' : 'text-brand-text/40 hover:text-brand-text',
          )}
        >
          Generate custom
        </button>
      </div>

      {tab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                'rounded-xl overflow-hidden border-2 transition-all text-left',
                value.presetId === preset.id
                  ? 'border-brand-accent ring-2 ring-brand-accent/20'
                  : 'border-white/10 hover:border-white/25',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.thumbnailUrl} alt={preset.label} className="w-full aspect-video object-cover max-h-28" />
              <p className="text-xs text-brand-text/60 px-2 py-1.5 truncate">{preset.label}</p>
            </button>
          ))}
        </div>
      )}

      {tab === 'generate' && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center space-y-2">
          <p className="text-sm font-medium text-brand-text">AI Background Generation</p>
          <p className="text-xs text-brand-text/40">
            Generate a custom background from a style description.
          </p>
          <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-white/5 text-brand-text/40 text-xs">
            Coming soon
          </span>
        </div>
      )}
    </div>
  )
}
