'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, Upload, RefreshCw, Download, ExternalLink, Film, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/lib/context/preferences-context'
import { getTemplatePrimaryImageUrl } from '@/lib/marketplace-template-media'
import { TemplatePanelPortal, type TemplateCategory } from '@/components/studio/TemplatePanel'
import { buildFinalImageVideoPrompt } from '@/lib/video-prompt'
import { VIDEO_MODELS } from '@/lib/data/plans'
import type {
  MarketplaceTemplate,
  WorkflowSlotConfig,
  WorkflowSlotRole,
} from '@/lib/types/marketplace'
import type { VideoModel } from '@/lib/types/billing'

// ── Node size constants ────────────────────────────────────────────────────────
const NODE_W = 180
const NODE_H = 160
const PREVIEW_W = 150
const RESULT_W = 260
const GEN_H = 56

interface Props {
  userId: string
  workflowTemplates: MarketplaceTemplate[]
  avatarTemplates: MarketplaceTemplate[]
  backgroundTemplates: MarketplaceTemplate[]
  cameraTemplates: MarketplaceTemplate[]
  movementTemplates: MarketplaceTemplate[]
  videoFlowTemplates: MarketplaceTemplate[]
}

interface SlotState {
  config: WorkflowSlotConfig
  file: File | null
  previewUrl: string | null
}

type GenStatus = 'idle' | 'uploading' | 'generating' | 'ready' | 'error'

export function WorkflowCanvas({
  userId: _userId,
  workflowTemplates,
  avatarTemplates,
  backgroundTemplates,
  cameraTemplates,
  movementTemplates,
  videoFlowTemplates,
}: Props) {
  const fallbackTemplate = workflowTemplates[0]
  const [activeTemplateId, setActiveTemplateId] = useState<string>(fallbackTemplate?.id ?? '')
  const activeTemplate = useMemo(
    () => workflowTemplates.find(t => t.id === activeTemplateId) ?? fallbackTemplate ?? null,
    [activeTemplateId, workflowTemplates, fallbackTemplate],
  )

  // Pull selected templates from preferences so the studio stays in sync
  // with /admin/templates picks made elsewhere (templates page, advanced canvas).
  const { shotTypeTemplateId, motionStyleTemplateId } = usePreferences()

  const [slots, setSlots] = useState<SlotState[]>([])
  const [prompt, setPrompt] = useState<string>('')
  const [status, setStatus] = useState<GenStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultImageId, setResultImageId] = useState<string | null>(null)
  const [resultProjectId, setResultProjectId] = useState<string | null>(null)
  const [openPanel, setOpenPanel] = useState<TemplateCategory | null>(null)

  // ── Video stage state (only relevant once an image is ready) ──────────────
  type VideoStatus = 'idle' | 'generating' | 'ready' | 'error'
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoModelId, setVideoModelId] = useState<string>(VIDEO_MODELS[0]?.id ?? 'seedance-2-fast')
  const [showVideoPanel, setShowVideoPanel] = useState(false)

  useEffect(() => {
    if (!activeTemplate) {
      setSlots([])
      return
    }
    const slotConfigs = (activeTemplate.config?.slots ?? []) as WorkflowSlotConfig[]
    setSlots(slotConfigs.map(config => ({ config, file: null, previewUrl: null })))
    if (!prompt && typeof activeTemplate.config?.defaultPrompt === 'string') {
      setPrompt(activeTemplate.config.defaultPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateId])

  useEffect(() => {
    return () => {
      slots.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setSlotFile(slotIdx: number, file: File | null) {
    setSlots(prev => {
      const next = [...prev]
      const old = next[slotIdx]
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl)
      next[slotIdx] = {
        config: old.config,
        file,
        previewUrl: file ? URL.createObjectURL(file) : null,
      }
      return next
    })
  }

  const filledSlots = slots.filter(s => s.file !== null)
  const requiredFilled = slots.every(s => !s.config.required || s.file !== null)
  const canGenerate = filledSlots.length > 0 && requiredFilled && status !== 'uploading' && status !== 'generating'

  async function handleGenerate() {
    if (!canGenerate) return
    setErrorMessage(null)
    setResultUrl(null)
    setResultImageId(null)
    setResultProjectId(null)
    // Reset video stage too — fresh image means any prior video is stale.
    setShowVideoPanel(false)
    setVideoUrl(null)
    setVideoError(null)
    setVideoStatus('idle')
    setStatus('uploading')

    try {
      const formData = new FormData()
      formData.append('usePreferences', 'true')
      filledSlots.forEach(s => {
        if (s.file) formData.append('products', s.file, s.file.name)
      })

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: 'Upload failed.' }))
        throw new Error(err.error ?? 'Upload failed.')
      }
      const { projectId } = await uploadRes.json() as { projectId: string }

      setStatus('generating')
      const productRoles = filledSlots.map(s => s.config.role)
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          productDescription: prompt,
          productRoles,
          // Pass the user's selected shot type so the image is framed accordingly.
          cameraTemplateId: shotTypeTemplateId || undefined,
        }),
      })
      if (!genRes.ok || !genRes.body) {
        const err = await genRes.json().catch(() => ({ error: 'Generation failed.' }))
        throw new Error(err.error ?? 'Generation failed.')
      }

      const reader = genRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstImageUrl: string | null = null
      let firstImageId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nlIdx: number
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nlIdx).trim()
          buffer = buffer.slice(nlIdx + 1)
          if (!line) continue
          try {
            const evt = JSON.parse(line)
            if (evt.type === 'image' && evt.image?.url && !firstImageUrl) {
              firstImageUrl = evt.image.url as string
              firstImageId = (evt.image.id as string) ?? null
            } else if (evt.type === 'image_error') {
              throw new Error(evt.error ?? 'Generation failed.')
            }
          } catch { /* ignore malformed line */ }
        }
      }

      if (!firstImageUrl) throw new Error('No image returned.')
      setResultUrl(firstImageUrl)
      setResultImageId(firstImageId)
      setResultProjectId(projectId)
      setStatus('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Generation failed.')
      setStatus('error')
    }
  }

  // ── Video generation (image → video) ────────────────────────────────────────
  // Only fires after the user explicitly clicks "Animate to video" — never
  // auto-runs, because each video burns real Replicate credits.
  async function handleAnimateToVideo() {
    if (!resultImageId || !resultProjectId) return
    if (videoStatus === 'generating') return

    const motionTemplate = movementTemplates.find(t => t.id === motionStyleTemplateId) ?? null
    const motionPrompt = buildFinalImageVideoPrompt(prompt, motionTemplate)

    setVideoError(null)
    setVideoUrl(null)
    setVideoStatus('generating')

    try {
      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: resultProjectId,
          imageIds: [resultImageId],
          motionPrompt,
          videoModelId,
        }),
      })

      if (!exportRes.ok || !exportRes.body) {
        const err = await exportRes.json().catch(() => ({ error: 'Video generation failed.' }))
        throw new Error(err.error ?? 'Video generation failed.')
      }

      const reader = exportRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstVideoUrl: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nlIdx: number
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nlIdx).trim()
          buffer = buffer.slice(nlIdx + 1)
          if (!line) continue
          try {
            const evt = JSON.parse(line)
            if (evt.type === 'video' && evt.video?.videoUrl && !firstVideoUrl) {
              firstVideoUrl = evt.video.videoUrl as string
            } else if (evt.type === 'video_error' || evt.type === 'error') {
              throw new Error(evt.error ?? 'Video generation failed.')
            }
          } catch { /* ignore malformed line */ }
        }
      }

      if (!firstVideoUrl) throw new Error('No video returned.')
      setVideoUrl(firstVideoUrl)
      setVideoStatus('ready')
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Video generation failed.')
      setVideoStatus('error')
    }
  }

  if (!activeTemplate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Sparkles className="w-7 h-7 text-white/20" />
        <p className="text-sm text-white/40">No workflow templates available.</p>
        <p className="text-xs text-white/25">Ask an admin to publish a workflow_template.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06]">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white truncate">Studio · Workflows</h1>
          <p className="hidden sm:block text-xs text-white/40 mt-0.5">
            Pre-wired layouts. Drop your products, hit generate.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={activeTemplateId}
            onChange={e => setActiveTemplateId(e.target.value)}
            className="h-9 max-w-[140px] sm:max-w-none rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/80 text-xs sm:text-sm px-2 sm:px-3 outline-none hover:bg-white/[0.07] transition-all truncate"
          >
            {workflowTemplates.map(t => (
              <option key={t.id} value={t.id} className="bg-brand-bg">{t.title}</option>
            ))}
          </select>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white text-xs border border-white/[0.07] transition-all"
            title="Open the freeform canvas"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Advanced</span>
          </Link>
        </div>
      </div>

      {(() => {
        const sharedProps = {
          slots,
          onSlotFile: setSlotFile,
          avatarTemplates,
          backgroundTemplates,
          cameraTemplates,
          movementTemplates,
          onOpenPanel: setOpenPanel,
          prompt,
          onPromptChange: setPrompt,
          status,
          canGenerate,
          onGenerate: handleGenerate,
          resultUrl,
          resultImageId,
          resultProjectId,
          errorMessage,
          videoStatus,
          videoUrl,
          videoError,
          videoModelId,
          onVideoModelChange: setVideoModelId,
          showVideoPanel,
          onShowVideoPanel: setShowVideoPanel,
          onAnimateToVideo: handleAnimateToVideo,
        }
        return (
          <>
            {/* Mobile vertical stack */}
            <div className="md:hidden flex-1 overflow-y-auto px-4 py-4">
              <MobileStack {...sharedProps} />
            </div>

            {/* Desktop graph */}
            <div className="hidden md:flex flex-1 min-h-0">
              <DesktopGraph {...sharedProps} />
            </div>
          </>
        )
      })()}

      {/* Shared template panel portal */}
      <TemplatePanelPortal
        open={openPanel !== null}
        category={openPanel ?? 'avatar'}
        avatarTemplates={avatarTemplates}
        backgroundTemplates={backgroundTemplates}
        cameraTemplates={cameraTemplates}
        movementTemplates={movementTemplates}
        videoFlowTemplates={videoFlowTemplates}
        onClose={() => setOpenPanel(null)}
      />
    </div>
  )
}

// ── Desktop graph ────────────────────────────────────────────────────────────

interface GraphProps {
  slots: SlotState[]
  onSlotFile: (idx: number, file: File | null) => void
  avatarTemplates: MarketplaceTemplate[]
  backgroundTemplates: MarketplaceTemplate[]
  cameraTemplates: MarketplaceTemplate[]
  movementTemplates: MarketplaceTemplate[]
  onOpenPanel: (cat: TemplateCategory) => void
  prompt: string
  onPromptChange: (v: string) => void
  status: GenStatus
  canGenerate: boolean
  onGenerate: () => void
  resultUrl: string | null
  resultImageId: string | null
  resultProjectId: string | null
  errorMessage: string | null
  // ── Video stage ──
  videoStatus: 'idle' | 'generating' | 'ready' | 'error'
  videoUrl: string | null
  videoError: string | null
  videoModelId: string
  onVideoModelChange: (id: string) => void
  showVideoPanel: boolean
  onShowVideoPanel: (show: boolean) => void
  onAnimateToVideo: () => void
}

function DesktopGraph(props: GraphProps) {
  const {
    slots, onSlotFile, avatarTemplates, backgroundTemplates, cameraTemplates, movementTemplates,
    onOpenPanel, prompt, onPromptChange, status, canGenerate, onGenerate,
    resultUrl, resultImageId, resultProjectId, errorMessage,
    videoStatus, videoUrl, videoError, videoModelId, onVideoModelChange,
    showVideoPanel, onShowVideoPanel, onAnimateToVideo,
  } = props

  const isRunning = status === 'uploading' || status === 'generating'
  const errored = status === 'error'
  const hasSlotFile = slots.some(s => s.file)
  const imageReady = status === 'ready' && Boolean(resultUrl) && Boolean(resultImageId)

  const slotWireColor = errored ? '#ef4444' : hasSlotFile ? '#a78bfa' : 'rgba(255,255,255,0.12)'
  const genWireColor = errored ? '#ef4444' : isRunning ? '#a78bfa' : resultUrl ? '#a78bfa' : 'rgba(255,255,255,0.12)'
  const slotWireDash = hasSlotFile ? undefined : '6 5'
  const genWireDash = resultUrl ? undefined : '6 5'

  const WIRE_W = 56
  // Col 2 tiles match Col 1 product slots (NODE_W × NODE_H) so all stacks
  // line up vertically. Same square-ish footprint, image just fills the box.
  const TILE_W = NODE_W
  const TILE_H = NODE_H

  return (
    <div className="flex-1 flex items-stretch overflow-auto scrollbar-brand bg-white/[0.01] border border-white/[0.06] rounded-2xl m-4">
      <div className="flex items-stretch w-max px-6 py-6 gap-0">

        {/* ── Col 1: Product slots ── */}
        <div className="flex flex-col justify-center gap-3 shrink-0">
          {slots.map((slot, i) => (
            <SlotNode key={`slot-${i}`} slot={slot} onFile={file => onSlotFile(i, file)} />
          ))}
        </div>

        {/* ── Wire: Col 1 → Col 2 ── */}
        <WireColumn width={WIRE_W} color={slotWireColor} dash={slotWireDash} />

        {/* ── Col 2: Model + Scene + Shot Type (image-stage style controls) ── */}
        <div className="flex flex-col gap-3 shrink-0 justify-center" style={{ width: TILE_W }}>
          <TemplatePreviewNode
            label="Model"
            category="avatar"
            templates={avatarTemplates}
            onOpen={() => onOpenPanel('avatar')}
            widthOverride={TILE_W}
            heightOverride={TILE_H}
          />
          <TemplatePreviewNode
            label="Scene"
            category="background"
            templates={backgroundTemplates}
            onOpen={() => onOpenPanel('background')}
            widthOverride={TILE_W}
            heightOverride={TILE_H}
          />
          <TemplatePreviewNode
            label="Shot"
            category="shot_type"
            templates={cameraTemplates}
            onOpen={() => onOpenPanel('shot_type')}
            widthOverride={TILE_W}
            heightOverride={TILE_H}
          />
        </div>

        {/* ── Wire: Col 2 → Col 3 ── */}
        <WireColumn width={WIRE_W} color={slotWireColor} dash={slotWireDash} />

        {/* ── Col 3: Prompt + Generate ── */}
        <div className="shrink-0 flex flex-col gap-3 justify-center" style={{ width: 320 }}>
          <PromptNode value={prompt} onChange={onPromptChange} />
          <GenerateNode status={status} canGenerate={canGenerate} onClick={onGenerate} />
        </div>

        {/* ── Wire: Col 3 → Col 4 ── */}
        <WireColumn width={WIRE_W} color={genWireColor} dash={genWireDash} />

        {/* ── Col 4: Result (fixed 9:16) ── */}
        <div className="shrink-0 self-center flex flex-col items-center gap-2.5" style={{ width: RESULT_W }}>
          <div style={{ width: RESULT_W, aspectRatio: '9/16' }}>
            <ResultNode
              status={status}
              resultUrl={resultUrl}
              resultProjectId={resultProjectId}
              errorMessage={errorMessage}
            />
          </div>

          {/* Animate-to-video CTA — only appears once an image is ready */}
          {imageReady && !showVideoPanel && videoStatus === 'idle' && (
            <button
              type="button"
              onClick={() => onShowVideoPanel(true)}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-brand-accent/40 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-xs font-bold uppercase tracking-widest transition-all"
            >
              <Film className="w-3.5 h-3.5" />
              Animate to video
            </button>
          )}
        </div>

        {/* ── Col 5: Video stage (only when user clicks "Animate to video") ── */}
        {(showVideoPanel || videoStatus !== 'idle' || videoUrl) && (
          <>
            <WireColumn
              width={WIRE_W}
              color={videoStatus === 'ready' ? '#a78bfa' : videoStatus === 'error' ? '#ef4444' : 'rgba(255,255,255,0.12)'}
              dash={videoUrl ? undefined : '6 5'}
            />
            <div className="shrink-0 self-center" style={{ width: RESULT_W }}>
              <VideoStageNode
                movementTemplates={movementTemplates}
                onOpenMotionPanel={() => onOpenPanel('motion_style')}
                videoModelId={videoModelId}
                onVideoModelChange={onVideoModelChange}
                videoStatus={videoStatus}
                videoUrl={videoUrl}
                videoError={videoError}
                onAnimate={onAnimateToVideo}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function WireColumn({ width, color, dash }: { width: number; color: string; dash?: string }) {
  const id = `arrow-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <div className="flex items-center justify-center shrink-0 self-center" style={{ width }}>
      <svg width={width} height="2" className="overflow-visible">
        <defs>
          <marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>
        <line
          x1="0" y1="1" x2={width - 6} y2="1"
          stroke={color} strokeWidth="1.5"
          strokeDasharray={dash}
          strokeLinecap="round"
          markerEnd={`url(#${id})`}
        />
      </svg>
    </div>
  )
}

// ── Nodes ────────────────────────────────────────────────────────────────────

function SlotNode({ slot, onFile, fluid = false }: {
  slot: SlotState
  onFile: (file: File | null) => void
  fluid?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const filled = slot.file !== null
  const sizeStyle = fluid
    ? { width: '100%', aspectRatio: '1/1' }
    : { width: NODE_W, height: NODE_H, flexShrink: 0 }
  return (
    <div style={sizeStyle}>
      <button
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative w-full h-full rounded-2xl flex flex-col items-center justify-center text-center px-2 transition-all',
          filled
            ? 'border border-brand-accent/40 bg-brand-accent/[0.06]'
            : 'border-2 border-dashed border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]',
        )}
      >
        {filled && slot.previewUrl ? (
          <>
            <img
              src={slot.previewUrl}
              alt={slot.config.label}
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
            />
            <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono uppercase tracking-widest text-white bg-black/60 px-1.5 py-0.5 rounded-md">
              {slot.config.label}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onFile(null) }}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 text-white/70 hover:text-red-400"
              title="Remove"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-white/30 group-hover:text-white/60 mb-1.5" />
            <p className="text-[11px] font-medium text-white/60">{slot.config.label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">
              {slot.config.required ? 'required' : 'optional'}
            </p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0] ?? null
          onFile(f)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </div>
  )
}

function TemplatePreviewNode({
  label, category, templates, onOpen, fluid = false, widthOverride, heightOverride,
}: {
  label: string
  category: TemplateCategory
  templates: MarketplaceTemplate[]
  onOpen: () => void
  fluid?: boolean
  widthOverride?: number
  heightOverride?: number
}) {
  const {
    avatarConfig, backgroundConfig,
    shotTypeTemplateId, motionStyleTemplateId,
  } = usePreferences()

  // Find which template is currently selected via preferences
  const selected = (() => {
    if (category === 'avatar') {
      if (avatarConfig?.type === 'preset') return templates.find(t => t.id === avatarConfig.presetId)
      return templates[0]
    }
    if (category === 'background') {
      if (backgroundConfig?.type === 'preset') return templates.find(t => t.id === backgroundConfig.presetId)
      return templates[0]
    }
    if (category === 'shot_type') {
      return templates.find(t => t.id === shotTypeTemplateId) ?? templates[0]
    }
    if (category === 'motion_style') {
      return templates.find(t => t.id === motionStyleTemplateId) ?? templates[0]
    }
    return templates[0]
  })() ?? templates[0]

  const thumb = selected ? getTemplatePrimaryImageUrl(selected) : null

  const buttonStyle: React.CSSProperties = fluid
    ? { width: '100%', aspectRatio: '9/16' }
    : heightOverride
      ? { width: widthOverride ?? PREVIEW_W, height: heightOverride, flexShrink: 0 }
      : { width: widthOverride ?? PREVIEW_W, aspectRatio: '9/16', flexShrink: 0 }

  return (
    <button
      type="button"
      onClick={onOpen}
      style={buttonStyle}
      className="group relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden hover:border-brand-accent/40 transition-all cursor-pointer"
    >
      {thumb ? (
        <img
          src={thumb}
          alt={selected?.title ?? label}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center top' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white/20" />
        </div>
      )}

      {/* Top label badge */}
      <span className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-widest text-white/80 bg-black/60 px-1.5 py-0.5 rounded-md">
        {label}
      </span>

      {/* Bottom title gradient + name */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pt-6 pb-2">
        <p className="text-[11px] font-medium text-white truncate text-left">
          {selected?.title ?? '—'}
        </p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold uppercase tracking-widest text-white px-2 py-1 rounded-md bg-brand-accent text-brand-bg transition-all">
          Change
        </span>
      </div>
    </button>
  )
}

function PromptNode({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="w-full h-80 shrink-0">
      <div className="w-full h-full rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Prompt</span>
          <span className="text-[9px] font-mono text-white/25">{value.length}/500</span>
        </div>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={500}
          placeholder="editorial fashion shot, soft daylight, full body composition…"
          className="flex-1 bg-transparent resize-none outline-none text-sm text-white/85 placeholder:text-white/25 leading-relaxed scrollbar-brand"
        />
      </div>
    </div>
  )
}

function GenerateNode({ status, canGenerate, onClick }: {
  status: GenStatus
  canGenerate: boolean
  onClick: () => void
}) {
  const running = status === 'uploading' || status === 'generating'
  const label = status === 'uploading' ? 'Uploading…' : status === 'generating' ? 'Generating…' : 'Generate'
  return (
    <button
      type="button"
      disabled={!canGenerate}
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border flex items-center justify-center gap-2 transition-all shrink-0',
        canGenerate
          ? 'bg-brand-accent text-black border-brand-accent shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:opacity-90'
          : 'bg-white/[0.04] border-white/10 text-white/30 cursor-not-allowed',
      )}
      style={{ height: GEN_H }}
    >
      {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
    </button>
  )
}

function ResultNode({ status, resultUrl, resultProjectId, errorMessage }: {
  status: GenStatus
  resultUrl: string | null
  resultProjectId: string | null
  errorMessage: string | null
}) {
  return (
    <div className="relative w-full h-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      <span className="absolute top-2 left-2 z-10 text-[9px] font-mono uppercase tracking-widest text-white/70 bg-black/60 px-1.5 py-0.5 rounded-md">
        Result
      </span>
      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="text-xs text-red-400/80">{errorMessage ?? 'Generation failed.'}</span>
        </div>
      ) : status === 'generating' || status === 'uploading' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
          <span className="text-[10px] font-mono tracking-widest text-white/40">
            {status === 'uploading' ? 'UPLOADING' : 'GENERATING'}
          </span>
        </div>
      ) : resultUrl ? (
        <img src={resultUrl} alt="Generated result" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-white/15" />
          <span className="text-[10px] font-mono tracking-widest text-white/30">
            YOUR GENERATION APPEARS HERE
          </span>
        </div>
      )}

      {/* Action buttons overlay */}
      {(resultUrl || resultProjectId) && (
        <div className="absolute inset-x-0 bottom-0 p-2 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {resultUrl && (
            <a
              href={resultUrl}
              download={`genetrify-${Date.now()}.png`}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-black/60 backdrop-blur hover:bg-black/80 text-white/80 hover:text-white text-xs border border-white/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}
          {resultProjectId && (
            <Link
              href={`/projects/${resultProjectId}`}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-black/60 backdrop-blur hover:bg-black/80 text-white/80 hover:text-white text-xs border border-white/10 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ── Video stage ──────────────────────────────────────────────────────────────
// Appears beside the Result panel only after the user clicks "Animate to video".
// Lets them pick a Motion Style + a video model (cheap/fast vs slow/cinematic)
// before paying real Replicate credits to generate the clip.

function VideoStageNode({
  movementTemplates,
  onOpenMotionPanel,
  videoModelId,
  onVideoModelChange,
  videoStatus,
  videoUrl,
  videoError,
  onAnimate,
}: {
  movementTemplates: MarketplaceTemplate[]
  onOpenMotionPanel: () => void
  videoModelId: string
  onVideoModelChange: (id: string) => void
  videoStatus: 'idle' | 'generating' | 'ready' | 'error'
  videoUrl: string | null
  videoError: string | null
  onAnimate: () => void
}) {
  const { motionStyleTemplateId } = usePreferences()
  const motionTemplate = movementTemplates.find(t => t.id === motionStyleTemplateId) ?? movementTemplates[0]
  const motionThumb = motionTemplate ? getTemplatePrimaryImageUrl(motionTemplate) : null
  const selectedModel = VIDEO_MODELS.find(m => m.id === videoModelId) ?? VIDEO_MODELS[0]
  const generating = videoStatus === 'generating'

  return (
    <div className="flex flex-col gap-2.5">
      {/* Motion style picker — clickable thumbnail */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1.5">Motion style</p>
        <button
          type="button"
          onClick={onOpenMotionPanel}
          disabled={generating}
          className="group relative w-full aspect-[16/9] rounded-xl border border-white/10 bg-black/40 overflow-hidden hover:border-brand-accent/40 transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {motionThumb ? (
            <img src={motionThumb} alt={motionTemplate?.title ?? 'Motion style'} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
              <Film className="w-5 h-5 text-white/25" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 px-2.5 pt-6 pb-2 bg-gradient-to-t from-black/85 to-transparent">
            <p className="text-[12px] font-medium text-white truncate text-left">
              {motionTemplate?.title ?? 'Pick a motion style'}
            </p>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold uppercase tracking-widest text-brand-bg px-2 py-1 rounded-md bg-brand-accent transition-all">
              Change
            </span>
          </div>
        </button>
      </div>

      {/* Video model dropdown */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">Video model</p>
          <p className="text-[9px] font-mono text-brand-accent/80">{selectedModel.tokenCost} tokens</p>
        </div>
        <select
          value={videoModelId}
          onChange={(e) => onVideoModelChange(e.target.value)}
          disabled={generating}
          className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/10 text-white/85 text-xs px-2.5 outline-none hover:bg-white/[0.05] transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {VIDEO_MODELS.map((m: VideoModel) => (
            <option key={m.id} value={m.id} className="bg-brand-bg">
              {m.name} · {m.qualityLabel} · {m.tokenCost}t
            </option>
          ))}
        </select>
        <p className="text-[10px] text-white/35 mt-1 leading-snug">{selectedModel.description}</p>
      </div>

      {/* Animate button */}
      <button
        type="button"
        onClick={onAnimate}
        disabled={generating || videoStatus === 'ready'}
        className={cn(
          'w-full h-11 rounded-xl border flex items-center justify-center gap-2 transition-all',
          videoStatus === 'ready'
            ? 'bg-white/[0.04] border-white/10 text-white/40 cursor-not-allowed'
            : generating
              ? 'bg-brand-accent/40 border-brand-accent/40 text-brand-bg cursor-not-allowed'
              : 'bg-brand-accent border-brand-accent text-brand-bg shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:opacity-90',
        )}
      >
        {generating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-bold uppercase tracking-widest">Generating…</span>
          </>
        ) : videoStatus === 'ready' ? (
          <>
            <Play className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Done</span>
          </>
        ) : (
          <>
            <Film className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Generate video</span>
          </>
        )}
      </button>

      {/* Video preview / status */}
      <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden" style={{ aspectRatio: '9/16' }}>
        {videoStatus === 'error' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-xs text-red-400/80">{videoError ?? 'Video generation failed.'}</span>
          </div>
        ) : generating ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
            <span className="text-[10px] font-mono tracking-widest text-white/45">RENDERING VIDEO</span>
            <span className="text-[10px] text-white/30 px-4 text-center leading-relaxed">
              This can take 1–5 minutes depending on the model.
            </span>
          </div>
        ) : videoUrl ? (
          <video src={videoUrl} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Play className="w-6 h-6 text-white/15" />
            <span className="text-[10px] font-mono tracking-widest text-white/30">VIDEO APPEARS HERE</span>
          </div>
        )}
      </div>

      {videoUrl && (
        <a
          href={videoUrl}
          download={`genetrify-${Date.now()}.mp4`}
          className="inline-flex items-center justify-center gap-1.5 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white text-xs border border-white/10 transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Download video
        </a>
      )}
    </div>
  )
}

// ── Mobile vertical stack ────────────────────────────────────────────────────

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 px-1">{title}</h2>
      {children}
    </section>
  )
}

function MobileStack(props: GraphProps) {
  const {
    slots, onSlotFile, avatarTemplates, backgroundTemplates, cameraTemplates, movementTemplates,
    onOpenPanel, prompt, onPromptChange, status, canGenerate, onGenerate,
    resultUrl, resultImageId, resultProjectId, errorMessage,
    videoStatus, videoUrl, videoError, videoModelId, onVideoModelChange,
    showVideoPanel, onShowVideoPanel, onAnimateToVideo,
  } = props

  const running = status === 'uploading' || status === 'generating'
  const hasResultActions = Boolean(resultUrl || resultProjectId)
  const imageReady = status === 'ready' && Boolean(resultUrl) && Boolean(resultImageId)
  const videoVisible = showVideoPanel || videoStatus !== 'idle' || Boolean(videoUrl)

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* ── Products ── */}
      <MobileSection title="Products">
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot, i) => (
            <SlotNode
              key={`mob-slot-${i}`}
              slot={slot}
              onFile={(file) => onSlotFile(i, file)}
              fluid
            />
          ))}
        </div>
      </MobileSection>

      {/* ── Style (image stage: model + scene + shot type) ── */}
      <MobileSection title="Style">
        <div className="grid grid-cols-3 gap-2">
          <TemplatePreviewNode
            label="Model"
            category="avatar"
            templates={avatarTemplates}
            onOpen={() => onOpenPanel('avatar')}
            fluid
          />
          <TemplatePreviewNode
            label="Scene"
            category="background"
            templates={backgroundTemplates}
            onOpen={() => onOpenPanel('background')}
            fluid
          />
          <TemplatePreviewNode
            label="Shot"
            category="shot_type"
            templates={cameraTemplates}
            onOpen={() => onOpenPanel('shot_type')}
            fluid
          />
        </div>
      </MobileSection>

      {/* ── Prompt ── */}
      <MobileSection title="Prompt">
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="editorial fashion shot, soft daylight, full body composition…"
            className="w-full bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none resize-none leading-relaxed"
          />
          <span className="absolute bottom-2 right-3 text-[9px] font-mono text-white/25">
            {prompt.length}/500
          </span>
        </div>
      </MobileSection>

      {/* ── Result ── */}
      <MobileSection title="Result">
        <div className="relative w-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden aspect-[3/4] max-h-[60vh]">
          {status === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
              <span className="text-xs text-red-400/80">
                {errorMessage ?? 'Generation failed.'}
              </span>
            </div>
          ) : running ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
              <span className="text-[10px] font-mono tracking-widest text-white/40">
                {status === 'uploading' ? 'UPLOADING' : 'GENERATING'}
              </span>
            </div>
          ) : resultUrl ? (
            <img
              src={resultUrl}
              alt="Generated result"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <Sparkles className="w-6 h-6 text-white/15" />
              <span className="text-[10px] font-mono tracking-widest text-white/30">
                RESULT APPEARS HERE
              </span>
            </div>
          )}
          {hasResultActions && (
            <div className="absolute inset-x-0 bottom-0 p-2 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              {resultUrl && (
                <a
                  href={resultUrl}
                  download
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-black/60 backdrop-blur text-white/80 text-xs border border-white/10"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
              {resultProjectId && (
                <Link
                  href={`/projects/${resultProjectId}`}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-black/60 backdrop-blur text-white/80 text-xs border border-white/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </Link>
              )}
            </div>
          )}
        </div>

        {imageReady && !videoVisible && (
          <button
            type="button"
            onClick={() => onShowVideoPanel(true)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-brand-accent/40 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Film className="w-3.5 h-3.5" />
            Animate to video
          </button>
        )}
      </MobileSection>

      {videoVisible && (
        <MobileSection title="Video">
          <VideoStageNode
            movementTemplates={movementTemplates}
            onOpenMotionPanel={() => onOpenPanel('motion_style')}
            videoModelId={videoModelId}
            onVideoModelChange={onVideoModelChange}
            videoStatus={videoStatus}
            videoUrl={videoUrl}
            videoError={videoError}
            onAnimate={onAnimateToVideo}
          />
        </MobileSection>
      )}

      {/* ── Sticky generate bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[env(safe-area-inset-bottom)] pt-3 bg-gradient-to-t from-brand-bg via-brand-bg/95 to-transparent md:hidden">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className={cn(
            'w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2',
            canGenerate
              ? 'bg-brand-accent text-black shadow-[0_0_24px_rgba(139,92,246,0.5)] hover:opacity-90'
              : 'bg-white/[0.06] text-white/30 cursor-not-allowed',
          )}
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              {status === 'uploading' ? 'Uploading' : 'Generating'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export type { WorkflowSlotRole }
