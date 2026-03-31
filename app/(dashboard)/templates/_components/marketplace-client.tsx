'use client'

import { useState, useTransition, useRef } from 'react'
import { useSearchParams }  from 'next/navigation'
import { cn }               from '@/lib/utils'
import {
  CheckCircle2, Camera, Sparkles, Play,
  User, ImageIcon, Upload,
} from 'lucide-react'
import { AVATAR_PRESETS }      from '@/lib/data/avatar-presets'
import { BACKGROUND_PRESETS }  from '@/lib/data/background-presets'
import { usePreferences }      from '@/lib/context/preferences-context'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import type { MarketplaceTemplate }            from '@/lib/types/marketplace'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'avatar' | 'background' | 'camera' | 'movement'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'avatar',     label: 'Avatar',     icon: <User      className="w-3.5 h-3.5" /> },
  { id: 'background', label: 'Background', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: 'camera',     label: 'Angle',      icon: <Camera    className="w-3.5 h-3.5" /> },
  { id: 'movement',   label: 'Movement',   icon: <Sparkles  className="w-3.5 h-3.5" /> },
]

// ─── Marketplace card ─────────────────────────────────────────────────────────

function MarketplaceCard({
  label,
  description,
  thumbnailUrl,
  previewUrl,
  badge,
  isSelected,
  isSaving,
  onSelect,
}: {
  label:        string
  description?: string
  thumbnailUrl: string
  previewUrl?:  string
  badge?:       string | null
  isSelected:   boolean
  isSaving:     boolean
  onSelect:     () => void
}) {
  const [hovered, setHovered] = useState(false)
  const hasPreview = !!previewUrl

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-150 cursor-pointer',
        isSelected
          ? 'border-brand-accent ring-1 ring-brand-accent/50 shadow-lg shadow-brand-accent/10'
          : 'border-white/10 hover:border-white/25',
      )}
    >
      {/* Thumbnail — 2:3 ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
        <img
          src={thumbnailUrl}
          alt={label}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
            hovered && hasPreview ? 'opacity-0' : 'opacity-100',
          )}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        {hasPreview && hovered && (
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {hasPreview && !hovered && !isSelected && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
            <Play className="w-2.5 h-2.5 text-white/70 fill-white/70" />
            <span className="text-[9px] text-white/60 font-medium">Preview</span>
          </div>
        )}
        {!hasPreview && description && !isSelected && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
            <span className="text-[9px] text-white/30">Preview coming</span>
          </div>
        )}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-accent/90 text-[9px] font-semibold text-brand-bg backdrop-blur-sm">
            {badge}
          </div>
        )}
        {isSelected && <div className="absolute inset-0 bg-brand-accent/10" />}
        {!isSelected && (
          <div className="absolute inset-0 bg-brand-accent/0 group-hover:bg-brand-accent/8 transition-colors duration-150" />
        )}
        {!isSelected && hovered && (
          <div className="absolute inset-x-2 bottom-2">
            <button
              onClick={onSelect}
              disabled={isSaving}
              className="w-full py-1.5 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg text-[11px] font-black uppercase tracking-wider transition-colors shadow-lg"
            >
              {isSaving ? '…' : 'Use this'}
            </button>
          </div>
        )}
        {isSelected && (
          <div className="absolute inset-x-2 bottom-2">
            <div className="w-full py-1.5 rounded-xl bg-brand-accent text-brand-bg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Active
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        'px-3 py-2.5 border-t space-y-0.5 transition-colors',
        isSelected
          ? 'bg-brand-accent/8 border-brand-accent/30'
          : 'bg-brand-surface border-white/[0.07] group-hover:bg-brand-surface/80',
      )}>
        <p className={cn('text-sm font-medium leading-tight', isSelected ? 'text-brand-text' : 'text-brand-text/80')}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-brand-text/40 leading-snug">{description}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketplaceClient({
  cameraTemplates,
  movementTemplates,
}: {
  cameraTemplates:   MarketplaceTemplate[]
  movementTemplates: MarketplaceTemplate[]
}) {
  const {
    avatarConfig,     setAvatarConfig,
    backgroundConfig, setBackgroundConfig,
    cameraTemplateId,    setCameraTemplateId,
    movementTemplateId,  setMovementTemplateId,
  } = usePreferences()

  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'avatar')
  const [isPending, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customFaceUrl, setCustomFaceUrl] = useState<string | null>(
    avatarConfig?.type === 'custom' ? (avatarConfig.faceUrl ?? null) : null,
  )

  function savePrefs(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSavingId(null)
    })
  }

  function handleSelectAvatar(presetId: string) {
    if (isPending) return
    setSavingId(presetId)
    const preset = AVATAR_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const config: AvatarConfig = {
      type: 'preset', presetId: preset.id,
      gender: preset.gender, style: preset.style,
    }
    setAvatarConfig(config)
    savePrefs({ avatar_config: config })
  }

  function handleSelectBackground(presetId: string) {
    if (isPending) return
    setSavingId(presetId)
    const preset = BACKGROUND_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const config: BackgroundConfig = {
      type: 'preset', presetId: preset.id,
      roomAesthetic: preset.roomAesthetic,
      roomColors:    preset.roomColors,
      roomElements:  preset.roomElements,
      thumbnailUrl:  preset.thumbnailUrl,
    }
    setBackgroundConfig(config)
    savePrefs({ background_config: config })
  }

  function handleSelectCamera(id: string) {
    if (isPending) return
    setSavingId(id)
    setCameraTemplateId(id)
    savePrefs({ camera_template_id: id, movement_template_id: movementTemplateId })
  }

  function handleSelectMovement(id: string) {
    if (isPending) return
    setSavingId(id)
    setMovementTemplateId(id)
    savePrefs({ camera_template_id: cameraTemplateId, movement_template_id: id })
  }

  async function handleCustomFace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const [meta, b64] = dataUrl.split(',')
      const mime = meta.split(':')[1].split(';')[0]
      const localUrl = URL.createObjectURL(file)
      setCustomFaceUrl(localUrl)

      const byteString = atob(b64)
      const arr = new Uint8Array(byteString.length)
      for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i)
      const blob = new Blob([arr], { type: mime })
      const fd = new FormData()
      fd.append('face', blob, 'face.jpg')
      fd.append('onboardingFaceOnly', 'true')
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.faceUrl) {
        const config: AvatarConfig = {
          type: 'custom', gender: 'man', style: 'casual',
          faceUrl: data.faceUrl, facePath: data.facePath,
        }
        setAvatarConfig(config)
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_config: config }),
        })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Studio</p>
        <h1
          className="text-[32px] font-black uppercase text-brand-text leading-[0.85]"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
        >
          Marketplace
        </h1>
        <p className="text-sm text-brand-text/40">
          Pick your defaults. Changes apply instantly to new generations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-bg rounded-xl p-1 w-full sm:w-fit border border-white/[0.07]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              tab === t.id
                ? 'bg-brand-accent text-brand-bg shadow-sm'
                : 'text-brand-text/40 hover:text-brand-text',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Avatar tab */}
      {tab === 'avatar' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-brand-text/40 uppercase tracking-wider mb-3">Your own face</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCustomFace} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition-all duration-200',
                avatarConfig?.type === 'custom'
                  ? 'border-brand-accent/60 bg-brand-accent/5'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]',
              )}
            >
              {customFaceUrl || avatarConfig?.faceUrl ? (
                <img
                  src={customFaceUrl ?? avatarConfig?.faceUrl}
                  alt="Your face"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-brand-accent/60 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-brand-text/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text">
                  {avatarConfig?.type === 'custom' ? 'Custom face active' : 'Upload your face'}
                </p>
                <p className="text-xs text-brand-text/40 mt-0.5">
                  Clear front-facing photo — saves automatically
                </p>
              </div>
              {avatarConfig?.type === 'custom' && (
                <div className="w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-brand-bg" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-brand-text/25 font-medium">or choose a preset</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div>
            <p className="text-xs font-medium text-brand-text/40 uppercase tracking-wider mb-3">AI Presets</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {AVATAR_PRESETS.map((preset) => (
                <MarketplaceCard
                  key={preset.id}
                  label={preset.label}
                  thumbnailUrl={preset.thumbnailUrl}
                  isSelected={avatarConfig?.type === 'preset' && avatarConfig.presetId === preset.id}
                  isSaving={savingId === preset.id}
                  onSelect={() => handleSelectAvatar(preset.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Background tab */}
      {tab === 'background' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {BACKGROUND_PRESETS.map((preset) => (
            <MarketplaceCard
              key={preset.id}
              label={preset.label}
              thumbnailUrl={preset.thumbnailUrl}
              isSelected={backgroundConfig?.presetId === preset.id}
              isSaving={savingId === preset.id}
              onSelect={() => handleSelectBackground(preset.id)}
            />
          ))}
        </div>
      )}

      {/* Camera tab — data from DB */}
      {tab === 'camera' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-text/40">Sets the framing of your AI-generated image.</p>
          {cameraTemplates.length === 0 ? (
            <p className="text-sm text-brand-text/25 italic">No camera templates available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cameraTemplates.map((t) => (
                <MarketplaceCard
                  key={t.id}
                  label={t.title}
                  description={t.description ?? undefined}
                  thumbnailUrl={t.thumbnail_url ?? ''}
                  previewUrl={t.preview_url ?? undefined}
                  badge={t.badge}
                  isSelected={cameraTemplateId === t.id}
                  isSaving={savingId === t.id}
                  onSelect={() => handleSelectCamera(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Movement tab — data from DB */}
      {tab === 'movement' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-text/40">The motion your model performs in the video.</p>
          {movementTemplates.length === 0 ? (
            <p className="text-sm text-brand-text/25 italic">No movement templates available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {movementTemplates.map((t) => (
                <MarketplaceCard
                  key={t.id}
                  label={t.title}
                  description={t.description ?? undefined}
                  thumbnailUrl={t.thumbnail_url ?? ''}
                  previewUrl={t.preview_url ?? undefined}
                  badge={t.badge}
                  isSelected={movementTemplateId === t.id}
                  isSaving={savingId === t.id}
                  onSelect={() => handleSelectMovement(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
