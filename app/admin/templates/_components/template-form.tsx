'use client'

import { useActionState, useMemo, useState } from 'react'
import { cn }        from '@/lib/utils'
import {
  Loader2, Save, Trash2, Eye, EyeOff,
  Archive, RotateCcw, ExternalLink, Upload,
} from 'lucide-react'
import {
  createTemplate,
  updateTemplate,
  setTemplateStatus,
  deleteTemplate,
} from '@/app/actions/templates'
import type {
  MarketplaceTemplate,
  TemplateCategory,
} from '@/lib/types/marketplace'

// ─── Field primitives ─────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white ' +
  'placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors'

function FieldGroup({
  name,
  label,
  hint,
  defaultValue = '',
  required = false,
  multiline = false,
  type = 'text',
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: string
  required?: boolean
  multiline?: boolean
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/60">
        {label}
        {required && <span className="text-violet-400 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={4}
          className={cn(inputCls, 'resize-none leading-relaxed')}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          className={inputCls}
        />
      )}
      {hint && <p className="text-[11px] text-white/30">{hint}</p>}
    </div>
  )
}

function MediaField({
  name,
  label,
  hint,
  accept,
  kind,
  value,
  onChange,
  matchesField,
  syncSource,
}: {
  name: string
  label: string
  hint: string
  accept: string
  kind: 'thumbnail' | 'preview' | 'reference'
  value: string
  onChange: (value: string) => void
  /** Name of the other field this value currently duplicates, e.g. "Reference" */
  matchesField?: string
  /** Label of the field whose value can be copied into this one */
  syncSource?: { label: string; getValue: () => string }
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('kind', kind)

      const response = await fetch('/api/admin/template-media', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Upload failed')
      }

      onChange(data.url ?? '')
      event.target.value = ''
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="block text-xs font-medium text-white/60">{label}</label>
          {matchesField && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400/80 font-mono">
              = {matchesField}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {syncSource && syncSource.getValue() && !matchesField && (
            <button
              type="button"
              onClick={() => onChange(syncSource.getValue())}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs text-white/50 transition-colors hover:text-white/80"
              title={`Use same URL as ${syncSource.label}`}
            >
              ← Use {syncSource.label}
            </button>
          )}
          {!!value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-colors hover:text-white">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {isUploading ? 'Uploading...' : 'Upload file'}
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputCls}
      />

      <p className="text-[11px] text-white/30">{hint}</p>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function normalizeMediaUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed, 'http://localhost')
    parsed.hash = ''
    const searchParams = new URLSearchParams(parsed.search)
    searchParams.sort()
    parsed.search = searchParams.toString()
    return `${parsed.pathname}?${parsed.search}`
  } catch {
    return trimmed
  }
}

function MediaPreviewCard({
  title,
  description,
  url,
  allowVideo = false,
}: {
  title: string
  description: string
  url: string
  allowVideo?: boolean
}) {
  const isVideo = allowVideo && /\.(mp4|webm|mov)(\?|$)/i.test(url)

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{title}</p>
        <p className="text-[11px] text-white/30">{description}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {isVideo ? (
          <video
            src={url}
            className="aspect-[4/5] w-full object-cover"
            controls
            muted
            playsInline
          />
        ) : (
          <img
            src={url}
            alt={`${title} preview`}
            className="aspect-[4/5] w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>
      <p className="mt-2 break-all text-[10px] text-white/25">{url}</p>
    </div>
  )
}

// ─── Dynamic config section — fields change based on selected category ────────

function ConfigSection({
  category,
  config,
}: {
  category: TemplateCategory
  config: Record<string, unknown>
}) {
  if (category === 'camera') {
    return (
      <div className="space-y-4">
        <FieldGroup
          name="config.cameraAnglePrompt"
          label="Camera Angle Prompt"
          hint="Injected into the {{camera_angle}} slot in the Gemini image prompt"
          defaultValue={(config.cameraAnglePrompt as string) ?? ''}
          multiline
          required
        />
        <FieldGroup
          name="config.promptFragment"
          label="Additional Prompt Fragment"
          hint="Optional extra context appended to the image prompt"
          defaultValue={(config.promptFragment as string) ?? ''}
          multiline
        />
      </div>
    )
  }

  if (category === 'movement') {
    return (
      <FieldGroup
        name="config.promptFragment"
        label="Movement Prompt"
        hint="Describes the model's motion — sent to Kling video API. No speaking, no lip-sync."
        defaultValue={(config.promptFragment as string) ?? ''}
        multiline
        required
      />
    )
  }

  if (category === 'avatar') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/60">Gender</label>
            <select
              name="config.gender"
              defaultValue={(config.gender as string) ?? 'man'}
              className={inputCls}
            >
              <option value="man"   className="bg-[#0d0d14] text-white">Man</option>
              <option value="woman" className="bg-[#0d0d14] text-white">Woman</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/60">Style</label>
            <select
              name="config.style"
              defaultValue={(config.style as string) ?? 'casual'}
              className={inputCls}
            >
              <option value="casual"      className="bg-[#0d0d14] text-white">Casual</option>
              <option value="streetwear"  className="bg-[#0d0d14] text-white">Streetwear</option>
              <option value="luxury"      className="bg-[#0d0d14] text-white">Luxury</option>
              <option value="minimal"     className="bg-[#0d0d14] text-white">Minimal</option>
            </select>
          </div>
        </div>
        <FieldGroup
          name="config.promptHint"
          label="Avatar Prompt Hint"
          hint="Short facial/persona description used when this preset is selected instead of a custom face photo"
          defaultValue={(config.promptHint as string) ?? ''}
          multiline
        />
      </div>
    )
  }

  if (category === 'background') {
    return (
      <div className="space-y-4">
        <FieldGroup
          name="config.roomAesthetic"
          label="Room Aesthetic"
          hint='e.g. "minimalist", "industrial", "cozy loft"'
          defaultValue={(config.roomAesthetic as string) ?? ''}
          required
        />
        <FieldGroup
          name="config.roomColors"
          label="Room Colors"
          hint="Comma-separated palette, e.g. white, warm grey, oak"
          defaultValue={(config.roomColors as string) ?? ''}
        />
        <FieldGroup
          name="config.roomElements"
          label="Room Elements"
          hint="Key furniture or props present in the scene"
          defaultValue={(config.roomElements as string) ?? ''}
        />
      </div>
    )
  }

  return (
    <p className="text-sm text-white/30 italic">
      No predefined config fields for this category.
    </p>
  )
}

// ─── Status sidebar panel — publish / unpublish / archive / restore / delete ──

function StatusPanel({ template }: { template: MarketplaceTemplate }) {
  const [statusState, statusAction, statusPending] = useActionState(setTemplateStatus, {})
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTemplate, {})

  const { status } = template
  const isPublished = status === 'published'
  const isArchived  = status === 'archived'

  return (
    <div className="space-y-3">

      {/* Transition buttons */}
      <form action={statusAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={template.id} />

        {/* Publish — shown when draft or archived */}
        {!isPublished && (
          <button
            type="submit" name="status" value="published"
            disabled={statusPending}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {statusPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Eye className="w-3.5 h-3.5" />}
            Publish
          </button>
        )}

        {/* Unpublish — shown when published */}
        {isPublished && (
          <button
            type="submit" name="status" value="draft"
            disabled={statusPending}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/20 text-amber-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {statusPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <EyeOff className="w-3.5 h-3.5" />}
            Unpublish
          </button>
        )}

        {/* Archive — shown when not already archived */}
        {!isArchived && (
          <button
            type="submit" name="status" value="archived"
            disabled={statusPending}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 text-white/40 hover:text-white/60 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {statusPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Archive className="w-3.5 h-3.5" />}
            Archive
          </button>
        )}

        {/* Restore — shown when archived */}
        {isArchived && (
          <button
            type="submit" name="status" value="draft"
            disabled={statusPending}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 text-white/40 hover:text-white/60 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {statusPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RotateCcw className="w-3.5 h-3.5" />}
            Restore to Draft
          </button>
        )}
      </form>

      {statusState?.error   && <p className="text-xs text-red-400">{statusState.error}</p>}
      {statusState?.success && <p className="text-xs text-emerald-400">{statusState.success}</p>}

      <div className="h-px bg-white/5" />

      {/* Delete */}
      <form action={deleteAction}>
        <input type="hidden" name="id" value={template.id} />
        <button
          type="submit"
          disabled={deletePending}
          onClick={(e) => {
            if (!confirm(`Delete "${template.title}" permanently? This cannot be undone.`)) {
              e.preventDefault()
            }
          }}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {deletePending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />}
          Delete permanently
        </button>
      </form>

      {deleteState?.error && <p className="text-xs text-red-400">{deleteState.error}</p>}
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:     'text-amber-400   bg-amber-500/10   border-amber-500/20',
    published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    archived:  'text-white/30    bg-white/5         border-white/10',
  }
  return (
    <span className={cn(
      'text-[10px] font-semibold border rounded-full px-2.5 py-0.5',
      styles[status] ?? styles.draft,
    )}>
      {status}
    </span>
  )
}

// ─── Metadata row ─────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-white/30">{label}</span>
      <span className="text-xs text-white/50 font-mono truncate max-w-[120px]">{value}</span>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function TemplateForm({ template }: { template?: MarketplaceTemplate }) {
  const isEdit   = !!template
  const action   = isEdit ? updateTemplate : createTemplate
  const [state, formAction, isPending] = useActionState(action, {})

  // Category drives which config fields render; controlled locally so switching
  // category immediately shows the right fields without a server round-trip.
  const [category, setCategory] = useState<TemplateCategory>(
    template?.category ?? 'camera',
  )
  const [thumbnailUrl, setThumbnailUrl] = useState(template?.thumbnail_url ?? '')
  const [previewUrl, setPreviewUrl] = useState(template?.preview_url ?? '')
  const [referenceUrl, setReferenceUrl] = useState(template?.reference_url ?? '')
  const isImageTemplate = category === 'avatar' || category === 'background'
  const previewMatchesReference = useMemo(
    () => !!previewUrl && !!referenceUrl && normalizeMediaUrl(previewUrl) === normalizeMediaUrl(referenceUrl),
    [previewUrl, referenceUrl],
  )
  const thumbnailMatchesReference = useMemo(
    () => !!thumbnailUrl && !!referenceUrl && normalizeMediaUrl(thumbnailUrl) === normalizeMediaUrl(referenceUrl),
    [thumbnailUrl, referenceUrl],
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-6 max-w-5xl items-start">

      {/* ── Left: main form ── */}
      <form action={formAction} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={template!.id} />}

        {/* Basic Info */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Basic Info</h2>

          <FieldGroup
            name="title"
            label="Title"
            defaultValue={template?.title ?? ''}
            required
          />

          <FieldGroup
            name="description"
            label="Description"
            hint="Shown below the card title in the marketplace"
            defaultValue={template?.description ?? ''}
            multiline
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/60">
                Category <span className="text-violet-400">*</span>
              </label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className={inputCls}
              >
                <option value="camera"     className="bg-[#0d0d14] text-white">Camera</option>
                <option value="movement"   className="bg-[#0d0d14] text-white">Movement</option>
                <option value="avatar"     className="bg-[#0d0d14] text-white">Avatar</option>
                <option value="background" className="bg-[#0d0d14] text-white">Background</option>
                <option value="other"      className="bg-[#0d0d14] text-white">Other</option>
              </select>
            </div>

            <FieldGroup
              name="sort_order"
              label="Sort Order"
              type="number"
              defaultValue={String(template?.sort_order ?? 0)}
              hint="Lower = appears first in its category"
            />
          </div>

          <FieldGroup
            name="badge"
            label="Badge"
            defaultValue={template?.badge ?? ''}
            hint='Short label shown on the card, e.g. "Popular" or "New" — leave blank to hide'
          />
        </section>

        {/* Media */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
          <div className="space-y-3">
            <div>
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Media</h2>
              <p className="mt-1 text-sm text-white/35">
                Keep each media slot intentional: card thumbnail for browsing, preview for hover playback or a medium preview, reference for the exact full-resolution asset used in generation.
              </p>
            </div>

            {isImageTemplate && (
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/6 p-4 text-sm text-white/55">
                <p className="font-medium text-white/75">Recommended setup for avatar and background templates</p>
                <p className="mt-1">`thumbnail` should be a lightweight card image, `preview` can be a hover image/video, and `reference` should be the exact full-resolution still sent to Gemini.</p>
              </div>
            )}

          </div>

          <MediaField
            name="thumbnail_url"
            label="Thumbnail URL"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            kind="thumbnail"
            accept="image/*"
            hint="Static image shown in the marketplace card (2:3 aspect ratio works best)"
            matchesField={thumbnailMatchesReference ? 'Reference' : undefined}
            syncSource={{ label: 'Reference', getValue: () => referenceUrl }}
          />

          <MediaField
            name="preview_url"
            label="Preview URL"
            value={previewUrl}
            onChange={setPreviewUrl}
            kind="preview"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            hint="GIF or short looping video — displayed on hover over the card"
            matchesField={previewMatchesReference ? 'Reference' : undefined}
            syncSource={{ label: 'Reference', getValue: () => referenceUrl }}
          />

          <MediaField
            name="reference_url"
            label="Reference URL"
            value={referenceUrl}
            onChange={setReferenceUrl}
            kind="reference"
            accept="image/*"
            hint="Full-resolution image used for Gemini generation. Use this for avatar and background templates."
          />

          {(thumbnailUrl || previewUrl || referenceUrl) && (
            <div className="grid gap-3 md:grid-cols-3">
              {thumbnailUrl && (
                <MediaPreviewCard
                  title="Thumbnail"
                  description="Marketplace card media"
                  url={thumbnailUrl}
                />
              )}
              {previewUrl && (
                <MediaPreviewCard
                  title="Preview"
                  description="Hover media shown in the marketplace"
                  url={previewUrl}
                  allowVideo
                />
              )}
              {referenceUrl && (
                <MediaPreviewCard
                  title="Reference"
                  description="Exact full-resolution generation asset"
                  url={referenceUrl}
                />
              )}
            </div>
          )}
        </section>

        {/* Config */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Config</h2>
            <span className="text-[10px] text-white/25 capitalize border border-white/8 rounded-full px-2 py-0.5">
              {category}
            </span>
          </div>
          <ConfigSection category={category} config={template?.config ?? {}} />
        </section>

        {/* Feedback */}
        {state?.error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            {state.success}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
          {isEdit ? 'Save changes' : 'Create template'}
        </button>
      </form>

      {/* ── Right: sidebar ── */}
      <aside className="space-y-4 lg:sticky lg:top-6">

        {/* Status panel — edit mode only */}
        {isEdit && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Status
              </h3>
              <StatusBadge status={template!.status} />
            </div>
            <StatusPanel template={template!} />
          </div>
        )}

        {/* View in marketplace — published only */}
        {isEdit && template!.status === 'published' && (
          <a
            href={`/templates?tab=${template!.category === 'movement' ? 'movement' : template!.category === 'avatar' ? 'avatar' : template!.category === 'background' ? 'background' : 'camera'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            View in marketplace
          </a>
        )}

        {/* Metadata */}
        {isEdit && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Metadata
            </h3>
            <MetaRow label="ID"      value={template!.id.slice(0, 8) + '…'} />
            <MetaRow label="Created" value={new Date(template!.created_at).toLocaleDateString()} />
            <MetaRow label="Updated" value={new Date(template!.updated_at).toLocaleDateString()} />
          </div>
        )}

        {/* New template hint */}
        {!isEdit && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-1.5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Draft
            </p>
            <p className="text-xs text-white/30 leading-relaxed">
              New templates are saved as drafts. After saving, use the publish button
              to make it visible in the customer marketplace.
            </p>
          </div>
        )}
      </aside>

    </div>
  )
}
