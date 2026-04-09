'use client'

import { useRef, useState, useTransition, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Camera,
  Check,
  CheckCircle2,
  ImageIcon,
  Mars,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  User,
  Venus,
  Wand2,
  X,
} from 'lucide-react'
import { usePreferences } from '@/lib/context/preferences-context'
import { useTokens } from '@/lib/context/token-context'
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
  buildCustomAvatarConfig,
  buildUserModelAvatarConfig,
} from '@/lib/preferences'
import { getTemplatePrimaryImageUrl } from '@/lib/marketplace-template-media'
import type { MarketplaceTemplate } from '@/lib/types/marketplace'
import { TOKEN_COSTS } from '@/lib/data/plans'

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

interface UserModel {
  id: string
  name: string
  storage_path: string
  public_url: string | null
  source_template_id: string | null
  gender: string
  created_at: string
}

function MarketplaceCard({
  label,
  description,
  thumbnailUrl,
  badge,
  isSelected,
  isSaving,
  eager,
  onSelect,
}: {
  label: string
  description?: string
  thumbnailUrl?: string | null
  badge?: string | null
  isSelected: boolean
  isSaving: boolean
  eager: boolean
  onSelect: () => void
}) {
  const resolvedThumbnailUrl = thumbnailUrl?.trim() || null

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border transition-colors duration-150 cursor-pointer',
        isSelected
          ? 'border-brand-accent ring-1 ring-brand-accent/50 shadow-lg shadow-brand-accent/10'
          : 'border-white/10 hover:border-white/25',
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '320px 520px' }}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden bg-white/5">
        {resolvedThumbnailUrl ? (
          <img
            src={resolvedThumbnailUrl}
            alt={label}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'auto'}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03] text-brand-text/20">
            <ImageIcon className="h-8 w-8" />
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

        {/* Action buttons on hover */}
        {!isSelected && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col gap-1.5 translate-y-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
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
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-brand-text transition-colors hover:border-white/20 hover:bg-white/3 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-brand-text transition-colors hover:border-white/20 hover:bg-white/3 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  )
}

/** Individual card for a user-generated model */
function UserModelCard({
  model,
  isActive,
  onUse,
  onDelete,
  onRename,
  onPreview,
}: {
  model: UserModel
  isActive: boolean
  onUse: (model: UserModel) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onPreview: (model: UserModel) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(model.name)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditName(model.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== model.name) onRename(model.id, trimmed)
    setEditing(false)
  }

  function cancelEdit(e?: React.KeyboardEvent) {
    e?.stopPropagation()
    setEditName(model.name)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 cursor-pointer',
        isActive
          ? 'border-brand-accent ring-1 ring-brand-accent/50 shadow-lg shadow-brand-accent/10'
          : 'border-white/10 hover:border-white/25',
      )}
      onClick={() => onPreview(model)}
    >
      {/* Image area with zoom + overlay buttons */}
      <div className="relative aspect-2/3 w-full overflow-hidden bg-white/5">
        {model.public_url ? (
          <img
            src={model.public_url}
            alt={model.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-8 w-8 text-brand-text/20" />
          </div>
        )}

        {isActive && <div className="absolute inset-0 bg-brand-accent/10" />}
        {!isActive && <div className="absolute inset-0 bg-brand-accent/0 transition-colors duration-150 group-hover:bg-brand-accent/8" />}

        {/* Hover action buttons — float over image, above footer */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col gap-1.5 translate-y-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          {!isActive ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUse(model) }}
              className="w-full rounded-xl bg-brand-accent py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-bg shadow-lg transition-colors hover:bg-brand-accent-hover"
            >
              Use this
            </button>
          ) : (
            <div className="flex w-full items-center justify-center gap-1 rounded-xl bg-brand-accent py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-bg">
              <CheckCircle2 className="h-3 w-3" /> Active
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(model.id) }}
            className="flex w-full items-center justify-center gap-1 rounded-xl bg-red-500/80 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-red-500"
          >
            <Trash2 className="h-2.5 w-2.5" /> Delete
          </button>
        </div>
      </div>

      {/* Footer — always visible, contains editable name */}
      <div
        className={cn(
          'border-t px-3 py-2.5 transition-colors',
          isActive ? 'border-brand-accent/30 bg-brand-accent/8' : 'border-white/[0.07] bg-brand-surface',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') cancelEdit(e)
              }}
              maxLength={60}
              className="min-w-0 flex-1 rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-brand-text outline-none ring-1 ring-brand-accent/60"
            />
            <button type="button" onClick={commitEdit} className="shrink-0 text-brand-accent hover:text-brand-accent-hover">
              <Check className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => cancelEdit()} className="shrink-0 text-brand-text/40 hover:text-brand-text">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className={cn('min-w-0 flex-1 truncate text-sm font-medium leading-tight', isActive ? 'text-brand-text' : 'text-brand-text/80')}>
              {model.name}
            </p>
            <button
              type="button"
              onClick={startEdit}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-brand-text/30 hover:text-brand-text/70"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Lightbox for previewing a model full-size */
function ModelPreviewLightbox({ model, onClose }: { model: UserModel; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-sm w-full mx-4 overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {model.public_url && (
          <img
            src={model.public_url}
            alt={model.name}
            className="h-full w-full object-contain"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <p className="text-sm font-semibold text-white">{model.name}</p>
        </div>
      </div>
    </div>
  )
}

/** Grid section showing user's privately generated models */
function MyModelsPanel({
  models,
  isLoading,
  activeModelId,
  onUse,
  onDelete,
  onRename,
}: {
  models: UserModel[]
  isLoading: boolean
  activeModelId: string | undefined
  onUse: (model: UserModel) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [previewModel, setPreviewModel] = useState<UserModel | null>(null)

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-text/40">My Models</p>
        <p className="text-xs text-brand-text/40">AI models you&apos;ve generated</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-white/[0.07] bg-brand-surface/50 py-8">
          <span className="text-xs text-brand-text/30">Loading…</span>
        </div>
      )}

      {!isLoading && models.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-brand-surface/30 px-4 py-8 text-center">
          <Wand2 className="h-6 w-6 text-brand-text/20" />
          <p className="text-xs text-brand-text/30">
            No models yet. Upload your face and generate your first private model here.
          </p>
        </div>
      )}

      {models.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {models.map((model) => (
            <UserModelCard
              key={model.id}
              model={model}
              isActive={activeModelId === model.id}
              onUse={onUse}
              onDelete={onDelete}
              onRename={onRename}
              onPreview={setPreviewModel}
            />
          ))}
        </div>
      )}

      {previewModel && (
        <ModelPreviewLightbox model={previewModel} onClose={() => setPreviewModel(null)} />
      )}
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

  const { balance, refreshBalance } = useTokens()

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
  const [uploadingCustomFace, setUploadingCustomFace] = useState(false)

  // User models state
  const [userModels, setUserModels] = useState<UserModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const fetchUserModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/user-models')
      const data = await res.json()
      if (res.ok) setUserModels(data.models ?? [])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'avatar') fetchUserModels()
  }, [tab, fetchUserModels])

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
    event.target.value = ''
    if (!file) return

    const ALLOWED_FACE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED_FACE_TYPES.includes(file.type)) {
      setGenerateError('Unsupported file type. Please upload a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setGenerateError('Face image must be under 10MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async (loadEvent) => {
      setUploadingCustomFace(true)
      try {
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
        } else {
          setCustomFaceUrl(null)
          setGenerateError(data?.error ?? 'Could not upload face image. Please try again.')
        }
      } finally {
        setUploadingCustomFace(false)
      }
    }

    reader.readAsDataURL(file)
  }

  async function handleGenerateModel(template: MarketplaceTemplate | null) {
    if (generatingTemplateId) return
    if ((balance ?? 0) < TOKEN_COSTS.model_gen) {
      setGenerateError(`Not enough tokens. You need ${TOKEN_COSTS.model_gen} tokens to generate a model.`)
      return
    }

    setGenerateError(null)
    // Use a sentinel 'custom-face' id so the button shows its loading state
    setGeneratingTemplateId(template ? template.id : 'custom-face')

    const isCustomFace = template === null
    const body = isCustomFace
      ? { useCustomFace: true, style: 'casual' }
      : { templateId: template.id }

    try {
      const res = await fetch('/api/user-models/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setGenerateError(data.error ?? 'Generation failed. Please try again.')
        return
      }

      // Prepend the new model so it appears at the top
      setUserModels((prev) => [data.model, ...prev])
      refreshBalance()

      // Auto-activate the newly generated model
      const config = buildUserModelAvatarConfig(
        data.model.id,
        data.model.storage_path,
        data.model.gender === 'woman' ? 'woman' : 'man',
        'casual',
      )
      setAvatarConfig(config)
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_config: config }),
      })
    } catch {
      setGenerateError('Unexpected error. Please try again.')
    } finally {
      setGeneratingTemplateId(null)
    }
  }

  function handleUseUserModel(model: UserModel) {
    const config = buildUserModelAvatarConfig(
      model.id,
      model.storage_path,
      model.gender === 'woman' ? 'woman' : 'man',
      'casual',
    )
    setAvatarConfig(config)
    savePrefs({ avatar_config: config })
  }

  async function handleDeleteUserModel(id: string) {
    const res = await fetch(`/api/user-models?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setUserModels((prev) => prev.filter((m) => m.id !== id))
      // If this was the active model, clear the avatar config
      if (avatarConfig?.type === 'user_model' && avatarConfig.userModelId === id) {
        setAvatarConfig(null)
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_config: null }),
        })
      }
    }
  }

  async function handleRenameUserModel(id: string, name: string) {
    const res = await fetch('/api/user-models', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    })
    if (res.ok) {
      setUserModels((prev) => prev.map((m) => m.id === id ? { ...m, name } : m))
    }
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

  const activeUserModelId = avatarConfig?.type === 'user_model' ? avatarConfig.userModelId : undefined

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Studio</p>
        <h1
          className="text-[32px] font-black uppercase leading-[0.85] text-brand-text"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
        >
          Templates
        </h1>
        <p className="text-sm text-brand-text/40">Choose preset defaults, or upload your face to generate a private avatar model.</p>
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
        <div className="space-y-8">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-text/40">Your own face</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCustomFace} />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition-all duration-200',
                  avatarConfig?.type === 'custom'
                    ? 'border-brand-accent/60 bg-brand-accent/5'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/2',
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
                  <p className="mt-0.5 text-xs text-brand-text/40">Upload a clear front-facing photo, then generate your own private model.</p>
                  <p className="mt-1 text-[11px] text-amber-300/80">JPG, PNG, or WebP only. Max 10MB.</p>
                </div>
                {avatarConfig?.type === 'custom' && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent">
                    <CheckCircle2 className="h-3 w-3 text-brand-bg" />
                  </div>
                )}
              </div>

              {/* Generate button — only visible when a face has been uploaded */}
              {(customFaceUrl || avatarConfig?.type === 'custom') && (
                <button
                  type="button"
                  onClick={() => handleGenerateModel(null)}
                  disabled={!!generatingTemplateId || uploadingCustomFace}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent/15 border border-brand-accent/30 py-2.5 text-xs font-semibold text-brand-accent transition-colors hover:bg-brand-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {uploadingCustomFace
                    ? 'Saving face upload…'
                    : generatingTemplateId === 'custom-face'
                    ? 'Generating your model…'
                    : `Generate AI Model from my face (${TOKEN_COSTS.model_gen} tokens)`}
                </button>
              )}

              {generateError && (
                <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  {generateError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-xs font-medium text-brand-text/25">or choose a preset</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* Gender toggle — below "or choose a preset" */}
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-brand-bg p-1 w-fit">
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

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-text/40">AI Presets</p>
                <p className="text-[10px] text-brand-text/25">
                  Presets are ready to use immediately as your active avatar
                </p>
              </div>
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
                        thumbnailUrl={getTemplatePrimaryImageUrl(template)}
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

          <MyModelsPanel
            models={userModels}
            isLoading={modelsLoading}
            activeModelId={activeUserModelId}
            onUse={handleUseUserModel}
            onDelete={handleDeleteUserModel}
            onRename={handleRenameUserModel}
          />
        </div>
      )}

      {tab === 'background' && (
        backgroundTemplates.length === 0 ? (
          <p className="text-sm italic text-brand-text/25">No background templates available.</p>
        ) : (
          <div className="max-w-5xl space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleTemplates.map((template, index) => (
                <MarketplaceCard
                  key={template.id}
                  label={template.title}
                  description={template.description ?? undefined}
                  thumbnailUrl={getTemplatePrimaryImageUrl(template)}
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
        <div className="max-w-5xl space-y-3">
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
                    thumbnailUrl={getTemplatePrimaryImageUrl(template)}
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
        <div className="max-w-5xl space-y-3">
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
                    thumbnailUrl={getTemplatePrimaryImageUrl(template)}
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
