'use client'

import { useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  Mars,
  Play,
  Sparkles,
  Upload,
  User,
  Venus,
} from 'lucide-react'
import { usePreferences } from '@/lib/context/preferences-context'
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
  buildCustomAvatarConfig,
} from '@/lib/preferences'
import type { MarketplaceTemplate } from '@/lib/types/marketplace'

type Tab = 'avatar' | 'background' | 'camera' | 'movement'

const ITEMS_PER_PAGE = 12
const EAGER_IMAGE_COUNT = 4

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'avatar', label: 'Avatar', icon: <User className="h-3.5 w-3.5" /> },
  { id: 'background', label: 'Background', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'camera', label: 'Angle', icon: <Camera className="h-3.5 w-3.5" /> },
  { id: 'movement', label: 'Movement', icon: <Sparkles className="h-3.5 w-3.5" /> },
]

function isTab(value: string | null): value is Tab {
  return value === 'avatar' || value === 'background' || value === 'camera' || value === 'movement'
}

function MarketplaceCard({
  label,
  description,
  thumbnailUrl,
  previewUrl,
  badge,
  isSelected,
  isSaving,
  eager,
  onSelect,
}: {
  label: string
  description?: string
  thumbnailUrl: string
  previewUrl?: string
  badge?: string | null
  isSelected: boolean
  isSaving: boolean
  eager: boolean
  onSelect: () => void
}) {
  const hasPreview = !!previewUrl

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 cursor-pointer',
        isSelected
          ? 'border-brand-accent ring-1 ring-brand-accent/50 shadow-lg shadow-brand-accent/10'
          : 'border-white/10 hover:border-white/25',
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '320px 520px' }}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
        <img
          src={thumbnailUrl}
          alt={label}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
            hasPreview ? 'opacity-100 group-hover:opacity-0' : 'opacity-100',
          )}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />

        {hasPreview && (
          <img
            src={previewUrl}
            alt={`${label} preview`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}

        {hasPreview && !isSelected && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
            <Play className="h-2.5 w-2.5 fill-white/70 text-white/70" />
            <span className="text-[9px] font-medium text-white/60">Preview</span>
          </div>
        )}

        {!hasPreview && description && !isSelected && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
            <span className="text-[9px] text-white/30">Preview coming</span>
          </div>
        )}

        {badge && (
          <div className="absolute left-2 top-2 rounded-full bg-brand-accent/90 px-2 py-0.5 text-[9px] font-semibold text-brand-bg backdrop-blur-sm">
            {badge}
          </div>
        )}

        {isSelected && <div className="absolute inset-0 bg-brand-accent/10" />}
        {!isSelected && (
          <div className="absolute inset-0 bg-brand-accent/0 transition-colors duration-150 group-hover:bg-brand-accent/8" />
        )}

        {!isSelected && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={onSelect}
              disabled={isSaving}
              className="w-full rounded-xl bg-brand-accent py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-bg shadow-lg transition-colors hover:bg-brand-accent-hover"
            >
              {isSaving ? '...' : 'Use this'}
            </button>
          </div>
        )}

        {isSelected && (
          <div className="absolute inset-x-2 bottom-2">
            <div className="flex w-full items-center justify-center gap-1 rounded-xl bg-brand-accent py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-bg">
              <CheckCircle2 className="h-3 w-3" /> Active
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'space-y-0.5 border-t px-3 py-2.5 transition-colors',
          isSelected
            ? 'border-brand-accent/30 bg-brand-accent/8'
            : 'border-white/[0.07] bg-brand-surface group-hover:bg-brand-surface/80',
        )}
      >
        <p className={cn('text-sm font-medium leading-tight', isSelected ? 'text-brand-text' : 'text-brand-text/80')}>
          {label}
        </p>
        {description && <p className="text-[11px] leading-snug text-brand-text/40">{description}</p>}
      </div>
    </div>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-brand-surface/70 px-3 py-2">
      <p className="text-xs text-brand-text/40">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-brand-text transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-brand-text transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function MarketplaceClient({
  avatarTemplates,
  backgroundTemplates,
  cameraTemplates,
  movementTemplates,
}: {
  avatarTemplates: MarketplaceTemplate[]
  backgroundTemplates: MarketplaceTemplate[]
  cameraTemplates: MarketplaceTemplate[]
  movementTemplates: MarketplaceTemplate[]
}) {
  const {
    avatarConfig,
    setAvatarConfig,
    backgroundConfig,
    setBackgroundConfig,
    cameraTemplateId,
    setCameraTemplateId,
    movementTemplateId,
    setMovementTemplateId,
  } = usePreferences()

  const searchParams = useSearchParams()
  const searchTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(searchTab) ? searchTab : 'avatar')
  const [isPending, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male')
  const [pageByTab, setPageByTab] = useState<Record<Tab, number>>({
    avatar: 1,
    background: 1,
    camera: 1,
    movement: 1,
  })
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

  function handleSelectAvatar(template: MarketplaceTemplate) {
    if (isPending) return
    setSavingId(template.id)
    const config = buildAvatarConfigFromTemplate(template)
    if (!config) return
    setAvatarConfig(config)
    savePrefs({ avatar_config: config })
  }

  function handleSelectBackground(template: MarketplaceTemplate) {
    if (isPending) return
    setSavingId(template.id)
    const config = buildBackgroundConfigFromTemplate(template)
    if (!config) return
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

  async function handleCustomFace(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string
      const [meta, b64] = dataUrl.split(',')
      const mime = meta.split(':')[1].split(';')[0]
      const localUrl = URL.createObjectURL(file)
      setCustomFaceUrl(localUrl)

      const byteString = atob(b64)
      const arr = new Uint8Array(byteString.length)
      for (let index = 0; index < byteString.length; index++) {
        arr[index] = byteString.charCodeAt(index)
      }

      const blob = new Blob([arr], { type: mime })
      const formData = new FormData()
      formData.append('face', blob, 'face.jpg')
      formData.append('onboardingFaceOnly', 'true')

      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()

      if (response.ok && data.faceUrl) {
        const config = buildCustomAvatarConfig(data.faceUrl, data.facePath)
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

  const visibleAvatarTemplates = avatarTemplates.filter((template) =>
    avatarGender === 'female' ? template.config.gender === 'woman' : template.config.gender !== 'woman',
  )

  const templatesByTab: Record<Tab, MarketplaceTemplate[]> = {
    avatar: visibleAvatarTemplates,
    background: backgroundTemplates,
    camera: cameraTemplates,
    movement: movementTemplates,
  }

  const currentTemplates = templatesByTab[tab]
  const totalPages = Math.max(1, Math.ceil(currentTemplates.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(pageByTab[tab], totalPages)
  const visibleTemplates = currentTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  function changePage(nextPage: number) {
    const safePage = Math.max(1, Math.min(nextPage, totalPages))
    setPageByTab((pages) => ({ ...pages, [tab]: safePage }))
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Studio</p>
        <h1
          className="text-[32px] font-black uppercase leading-[0.85] text-brand-text"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
        >
          Templates
        </h1>
        <p className="text-sm text-brand-text/40">Pick your defaults. Changes apply instantly to new generations.</p>
      </div>

      <div className="flex w-full gap-1 rounded-xl border border-white/[0.07] bg-brand-bg p-1 sm:w-fit">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'flex flex-1 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 sm:flex-none',
              tab === item.id
                ? 'bg-brand-accent text-brand-bg shadow-sm'
                : 'text-brand-text/40 hover:text-brand-text',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'avatar' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-brand-bg p-1">
              <button
                type="button"
                onClick={() => {
                  setAvatarGender('male')
                  setPageByTab((pages) => ({ ...pages, avatar: 1 }))
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                  avatarGender === 'male'
                    ? 'bg-brand-accent text-brand-bg shadow-sm'
                    : 'text-brand-text/40 hover:text-brand-text',
                )}
              >
                <Mars className="h-3.5 w-3.5" />
                Male
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvatarGender('female')
                  setPageByTab((pages) => ({ ...pages, avatar: 1 }))
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                  avatarGender === 'female'
                    ? 'bg-brand-accent text-brand-bg shadow-sm'
                    : 'text-brand-text/40 hover:text-brand-text',
                )}
              >
                <Venus className="h-3.5 w-3.5" />
                Female
              </button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-text/40">Your own face</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCustomFace} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition-all duration-200',
                avatarConfig?.type === 'custom'
                  ? 'border-brand-accent/60 bg-brand-accent/5'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]',
              )}
            >
              {customFaceUrl || avatarConfig?.faceUrl ? (
                <img
                  src={customFaceUrl ?? avatarConfig?.faceUrl}
                  alt="Your face"
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 shrink-0 rounded-xl border-2 border-brand-accent/60 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Upload className="h-5 w-5 text-brand-text/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-brand-text">
                  {avatarConfig?.type === 'custom' ? 'Custom face active' : 'Upload your face'}
                </p>
                <p className="mt-0.5 text-xs text-brand-text/40">Clear front-facing photo saves automatically</p>
              </div>
              {avatarConfig?.type === 'custom' && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent">
                  <CheckCircle2 className="h-3 w-3 text-brand-bg" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs font-medium text-brand-text/25">or choose a preset</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-text/40">AI Presets</p>
            {avatarTemplates.length === 0 ? (
              <p className="text-sm italic text-brand-text/25">No avatar templates available.</p>
            ) : visibleAvatarTemplates.length === 0 ? (
              <p className="text-sm italic text-brand-text/25">No {avatarGender} avatars available.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {visibleTemplates.map((template, index) => (
                    <MarketplaceCard
                      key={template.id}
                      label={template.title}
                      description={template.description ?? undefined}
                      thumbnailUrl={template.thumbnail_url ?? ''}
                      previewUrl={template.preview_url ?? undefined}
                      badge={template.badge}
                      eager={index < EAGER_IMAGE_COUNT}
                      isSelected={avatarConfig?.type === 'preset' && avatarConfig.presetId === template.id}
                      isSaving={savingId === template.id}
                      onSelect={() => handleSelectAvatar(template)}
                    />
                  ))}
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'background' && (
        backgroundTemplates.length === 0 ? (
          <p className="text-sm italic text-brand-text/25">No background templates available.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleTemplates.map((template, index) => (
                <MarketplaceCard
                  key={template.id}
                  label={template.title}
                  description={template.description ?? undefined}
                  thumbnailUrl={template.thumbnail_url ?? ''}
                  previewUrl={template.preview_url ?? undefined}
                  badge={template.badge}
                  eager={index < EAGER_IMAGE_COUNT}
                  isSelected={backgroundConfig?.presetId === template.id}
                  isSaving={savingId === template.id}
                  onSelect={() => handleSelectBackground(template)}
                />
              ))}
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
          </div>
        )
      )}

      {tab === 'camera' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-text/40">Sets the framing of your AI-generated image.</p>
          {cameraTemplates.length === 0 ? (
            <p className="text-sm italic text-brand-text/25">No camera templates available.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {visibleTemplates.map((template, index) => (
                  <MarketplaceCard
                    key={template.id}
                    label={template.title}
                    description={template.description ?? undefined}
                    thumbnailUrl={template.thumbnail_url ?? ''}
                    badge={template.badge}
                    eager={index < EAGER_IMAGE_COUNT}
                    isSelected={cameraTemplateId === template.id}
                    isSaving={savingId === template.id}
                    onSelect={() => handleSelectCamera(template.id)}
                  />
                ))}
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
            </div>
          )}
        </div>
      )}

      {tab === 'movement' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-text/40">The motion your model performs in the video.</p>
          {movementTemplates.length === 0 ? (
            <p className="text-sm italic text-brand-text/25">No movement templates available.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {visibleTemplates.map((template, index) => (
                  <MarketplaceCard
                    key={template.id}
                    label={template.title}
                    description={template.description ?? undefined}
                    thumbnailUrl={template.thumbnail_url ?? ''}
                    previewUrl={template.preview_url ?? undefined}
                    badge={template.badge}
                    eager={index < EAGER_IMAGE_COUNT}
                    isSelected={movementTemplateId === template.id}
                    isSaving={savingId === template.id}
                    onSelect={() => handleSelectMovement(template.id)}
                  />
                ))}
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
