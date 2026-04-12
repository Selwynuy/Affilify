'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { useNotify } from '@/components/feedback/use-notify'
import {
  Archive,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  createTemplate,
  deleteTemplate,
  setTemplateStatus,
  updateTemplate,
} from '@/app/actions/templates'
import { getTemplatePrimaryImageUrl } from '@/lib/marketplace-template-media'
import type {
  MarketplaceTemplate,
  TemplateCategory,
} from '@/lib/types/marketplace'

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
        {required && <span className="ml-1 text-violet-400">*</span>}
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
  value,
  onChange,
}: {
  name: string
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
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
      formData.set('kind', 'image')

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="block text-xs font-medium text-white/60">{label}</label>
        <div className="flex items-center gap-2">
          {!!value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-colors hover:text-white">
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isUploading ? 'Uploading...' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
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

function MediaPreviewCard({
  title,
  description,
  url,
}: {
  title: string
  description: string
  url: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{title}</p>
        <p className="text-[11px] text-white/30">{description}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <img
          src={url}
          alt={`${title} preview`}
          className="aspect-[4/5] w-full object-cover"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
        />
      </div>
      <p className="mt-2 break-all text-[10px] text-white/25">{url}</p>
    </div>
  )
}

function ConfigSection({
  category,
  config,
}: {
  category: TemplateCategory
  config: Record<string, unknown>
}) {
  if (category === 'shot_type') {
    return (
      <FieldGroup
        name="config.cameraAnglePrompt"
        label="Shot Type Prompt"
        hint="Describe the still-image framing and composition. This shapes the generated image before video animation."
        defaultValue={(config.cameraAnglePrompt as string) ?? ''}
        multiline
        required
      />
    )
  }

  if (category === 'motion_style') {
    return (
      <FieldGroup
        name="config.promptFragment"
        label="Motion Style Prompt"
        hint="Describe how the final generated image should animate. Focus on subject motion and shot energy; avoid conflicting reframing directives."
        defaultValue={(config.promptFragment as string) ?? ''}
        multiline
        required
      />
    )
  }

  if (category === 'video_flow') {
    return (
      <div className="space-y-4">
        <FieldGroup
          name="config.flowSummary"
          label="Flow Summary"
          hint="Short operator-facing summary of what this sequence is for, such as hook + demo + payoff."
          defaultValue={(config.flowSummary as string) ?? ''}
          multiline
          required
        />
        <FieldGroup
          name="config.defaultStepId"
          label="Default Step ID"
          hint="Which step should the app preselect first when this flow is chosen."
          defaultValue={(config.defaultStepId as string) ?? ''}
          required
        />
        <FieldGroup
          name="config.stepsJson"
          label="Flow Steps JSON"
          hint="Ordered array of steps with id, title, beatGoal, shotTypeTemplateId, motionStyleTemplateId, durationSec, and promptFragment."
          defaultValue={JSON.stringify(config.steps ?? [], null, 2)}
          multiline
          required
        />
      </div>
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
              <option value="man" className="bg-[#0d0d14] text-white">Man</option>
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
              <option value="casual" className="bg-[#0d0d14] text-white">Casual</option>
              <option value="streetwear" className="bg-[#0d0d14] text-white">Streetwear</option>
              <option value="luxury" className="bg-[#0d0d14] text-white">Luxury</option>
              <option value="minimal" className="bg-[#0d0d14] text-white">Minimal</option>
            </select>
          </div>
        </div>
        <FieldGroup
          name="config.promptHint"
          label="Avatar Prompt Hint"
          hint="Short facial/persona description used when this preset is selected instead of a custom face photo."
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
    <p className="text-sm italic text-white/30">
      No predefined config fields for this category.
    </p>
  )
}

function StatusPanel({ template }: { template: MarketplaceTemplate }) {
  const notify = useNotify()
  const [statusState, statusAction, statusPending] = useActionState(setTemplateStatus, {})
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTemplate, {})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteFormRef = useRef<HTMLFormElement | null>(null)

  const { status } = template
  const isPublished = status === 'published'
  const isArchived = status === 'archived'

  useEffect(() => {
    if (statusState?.success) notify.success({ description: statusState.success })
    if (statusState?.error) notify.error({ description: statusState.error })
  }, [notify, statusState?.error, statusState?.success])

  useEffect(() => {
    if (deleteState?.error) notify.error({ description: deleteState.error })
  }, [deleteState?.error, notify])

  return (
    <div className="space-y-3">
      <form action={statusAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={template.id} />

        {!isPublished && (
          <button
            type="submit"
            name="status"
            value="published"
            disabled={statusPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-600/20 px-3 py-2.5 text-sm font-medium text-emerald-400 transition-colors disabled:opacity-50 hover:bg-emerald-600/30"
          >
            {statusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Publish
          </button>
        )}

        {isPublished && (
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={statusPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-600/20 px-3 py-2.5 text-sm font-medium text-amber-400 transition-colors disabled:opacity-50 hover:bg-amber-600/30"
          >
            {statusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Unpublish
          </button>
        )}

        {!isArchived && (
          <button
            type="submit"
            name="status"
            value="archived"
            disabled={statusPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-white/40 transition-colors disabled:opacity-50 hover:bg-white/[0.06] hover:text-white/60"
          >
            {statusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            Archive
          </button>
        )}

        {isArchived && (
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={statusPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-white/40 transition-colors disabled:opacity-50 hover:bg-white/[0.06] hover:text-white/60"
          >
            {statusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Restore to Draft
          </button>
        )}
      </form>

      {statusState?.error && <p className="text-xs text-red-400">{statusState.error}</p>}
      {statusState?.success && <p className="text-xs text-emerald-400">{statusState.success}</p>}

      <div className="h-px bg-white/5" />

      <form action={deleteAction} ref={deleteFormRef}>
        <input type="hidden" name="id" value={template.id} />
        <button
          type="button"
          disabled={deletePending}
          onClick={() => setDeleteDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-600/10 px-3 py-2.5 text-sm font-medium text-red-400 transition-colors disabled:opacity-50 hover:bg-red-600/20"
        >
          {deletePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete permanently
        </button>
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete template?"
          description={`Delete "${template.title}" permanently? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          pending={deletePending}
          onConfirm={() => {
            setDeleteDialogOpen(false)
            deleteFormRef.current?.requestSubmit()
          }}
        />
      </form>

      {deleteState?.error && <p className="text-xs text-red-400">{deleteState.error}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    archived: 'text-white/30 bg-white/5 border-white/10',
  }

  return (
    <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', styles[status] ?? styles.draft)}>
      {status}
    </span>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-white/30">{label}</span>
      <span className="max-w-[120px] truncate font-mono text-xs text-white/50">{value}</span>
    </div>
  )
}

export default function TemplateForm({ template }: { template?: MarketplaceTemplate }) {
  const isEdit = !!template
  const notify = useNotify()
  const action = isEdit ? updateTemplate : createTemplate
  const [state, formAction, isPending] = useActionState(action, {})

  const [category, setCategory] = useState<TemplateCategory>(template?.category ?? 'shot_type')
  const [imageUrl, setImageUrl] = useState(getTemplatePrimaryImageUrl(template) ?? '')
  const isImageTemplate = category === 'avatar' || category === 'background'

  useEffect(() => {
    if (state?.success) notify.success({ description: state.success })
    if (state?.error) notify.error({ description: state.error })
  }, [notify, state?.error, state?.success])

  return (
    <div className="grid max-w-5xl grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_268px]">
      <form action={formAction} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={template!.id} />}

        <section className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Basic Info</h2>

          <FieldGroup
            name="title"
            label="Title"
            defaultValue={template?.title ?? ''}
            required
          />

          <FieldGroup
            name="description"
            label="Description"
            hint="Shown below the card title in the marketplace."
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
                onChange={(event) => setCategory(event.target.value as TemplateCategory)}
                className={inputCls}
              >
                <option value="shot_type" className="bg-[#0d0d14] text-white">Shot Type</option>
                <option value="motion_style" className="bg-[#0d0d14] text-white">Motion Style</option>
                <option value="video_flow" className="bg-[#0d0d14] text-white">Video Flow</option>
                <option value="avatar" className="bg-[#0d0d14] text-white">Avatar</option>
                <option value="background" className="bg-[#0d0d14] text-white">Background</option>
                <option value="other" className="bg-[#0d0d14] text-white">Other</option>
              </select>
            </div>

            <FieldGroup
              name="sort_order"
              label="Sort Order"
              type="number"
              defaultValue={String(template?.sort_order ?? 0)}
              hint="Lower numbers appear first within the category."
            />
          </div>

          <FieldGroup
            name="badge"
            label="Badge"
            defaultValue={template?.badge ?? ''}
            hint='Short label shown on the card, e.g. "Popular" or "New".'
          />
        </section>

        <section className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="space-y-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Media</h2>
              <p className="mt-1 text-sm text-white/35">
                Use one canonical image. It powers the marketplace card and, for avatar/background templates, also acts as the generation source.
              </p>
            </div>

            {isImageTemplate && (
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/6 p-4 text-sm text-white/55">
                <p className="font-medium text-white/75">Avatar and background templates</p>
                <p className="mt-1">Upload the exact still you want customers to browse and Gemini to use as the source reference.</p>
              </div>
            )}
          </div>

          <MediaField
            name="image_url"
            label="Image URL"
            value={imageUrl}
            onChange={setImageUrl}
            hint={isImageTemplate
              ? 'Used as both the marketplace card image and the generation source image.'
              : 'Used as the template card image in the marketplace.'}
          />

          {imageUrl && (
            <div className="grid gap-3 md:grid-cols-1">
              <MediaPreviewCard
                title="Image"
                description={isImageTemplate ? 'Marketplace card and generation source image' : 'Marketplace card image'}
                url={imageUrl}
              />
            </div>
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Config</h2>
            <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] capitalize text-white/25">
              {category}
            </span>
          </div>
          <ConfigSection category={category} config={template?.config ?? {}} />
        </section>

        {state?.error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {state.success}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 hover:bg-violet-500"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Save changes' : 'Create template'}
        </button>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-6">
        {isEdit && (
          <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Status</h3>
              <StatusBadge status={template!.status} />
            </div>
            <StatusPanel template={template!} />
          </div>
        )}

        {isEdit && template!.status === 'published' && (
          <a
            href={`/templates?tab=${template!.category === 'motion_style' ? 'motion_style' : template!.category === 'video_flow' ? 'video_flow' : template!.category === 'avatar' ? 'avatar' : template!.category === 'background' ? 'background' : 'shot_type'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            View in marketplace
          </a>
        )}

        {isEdit && (
          <div className="space-y-2.5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Metadata</h3>
            <MetaRow label="ID" value={`${template!.id.slice(0, 8)}...`} />
            <MetaRow label="Created" value={new Date(template!.created_at).toLocaleDateString()} />
            <MetaRow label="Updated" value={new Date(template!.updated_at).toLocaleDateString()} />
          </div>
        )}

        {!isEdit && (
          <div className="space-y-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Draft</p>
            <p className="text-xs leading-relaxed text-white/30">
              New templates are saved as drafts. After saving, use the publish button to make them visible in the marketplace.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
