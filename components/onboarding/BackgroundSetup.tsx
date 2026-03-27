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
      <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('presets')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm transition-colors',
            tab === 'presets' ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:text-white',
          )}
        >
          Presets
        </button>
        <button
          onClick={() => setTab('generate')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm transition-colors',
            tab === 'generate' ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:text-white',
          )}
        >
          Generate custom
        </button>
      </div>

      {tab === 'presets' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                'rounded-lg overflow-hidden border-2 transition-all text-left',
                value.presetId === preset.id ? 'border-white ring-2 ring-white/20' : 'border-zinc-700 hover:border-zinc-500',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.thumbnailUrl} alt={preset.label} className="w-full aspect-video object-cover" />
              <p className="text-xs text-zinc-300 px-2 py-1.5 truncate">{preset.label}</p>
            </button>
          ))}
        </div>
      )}

      {tab === 'generate' && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-white">AI Background Generation</p>
          <p className="text-xs text-zinc-500">
            Generate a custom background from a style description.
          </p>
          <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs">
            Coming soon
          </span>
        </div>
      )}
    </div>
  )
}
