'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/lib/context/preferences-context'
import { useTokens } from '@/lib/context/token-context'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import {
  ImagePlus, X, Download,
  Zap, Sparkles, Video, RotateCcw, ChevronDown, CheckCircle2,
  AlertCircle, ArrowRight,
} from 'lucide-react'
import { VIDEO_MODELS, getAvailableModels, TOKEN_COSTS } from '@/lib/data/plans'
import type { VideoModel, PlanId } from '@/lib/types/billing'
import type { MarketplaceTemplate } from '@/lib/types/marketplace'
import { TikTokShareButton } from '@/components/dashboard/TikTokShareButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedImage { id: string; url: string }
interface VideoResult { imageId: string; videoUrl: string; filename: string; storageFileId?: string | null }
interface HistoryRun { projectId: string; createdAt: string; videos: VideoResult[] }
interface ProductFile { file: File; previewUrl: string }

type Stage = 'idle' | 'uploading' | 'generating' | 'reviewing' | 'making-videos' | 'done' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function* readNDJSON(res: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line)
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer)
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'image', label: 'Generate' },
  { id: 'review', label: 'Review' },
  { id: 'video', label: 'Video' },
]

function StepIndicator({ stage }: { stage: Stage }) {
  const activeIndex =
    stage === 'idle' ? 0
    : stage === 'uploading' ? 0
    : stage === 'generating' ? 1
    : stage === 'reviewing' ? 2
    : stage === 'making-videos' ? 3
    : stage === 'done' ? 4
    : 0

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const done = i < activeIndex
        const active = i === activeIndex
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              {/* Circle */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all',
                done
                  ? 'bg-brand-accent text-brand-bg'
                  : active
                  ? 'border-2 border-brand-accent text-brand-text bg-transparent relative'
                  : 'border border-white/15 text-brand-text/25 bg-transparent',
              )}>
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <>
                    <span className="text-[10px] font-bold">{i + 1}</span>
                    {active && (
                      <span className="absolute inset-0 rounded-full border-2 border-brand-accent animate-ping opacity-30" />
                    )}
                  </>
                )}
              </div>
              {/* Label */}
              <span className={cn(
                'text-[11px] font-semibold hidden sm:block',
                done ? 'text-brand-accent'
                : active ? 'text-brand-text'
                : 'text-brand-text/25',
              )}>
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-3',
                done ? 'bg-brand-accent/50' : 'bg-white/8',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Inline selector (camera / movement) ─────────────────────────────────────

function InlineSelector({
  label, options, value, onChange,
}: {
  label: string
  options: { id: string; name: string; badge?: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.id === value) ?? options[0] ?? null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={options.length === 0}
        className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 hover:border-brand-accent/30 transition-all w-full text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-brand-text/35 leading-none mb-0.5 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-medium text-brand-text truncate">{current?.name ?? 'No templates available'}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-brand-text/30 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border border-white/10 bg-brand-bg shadow-xl shadow-black/40 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false) }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors text-xs',
                opt.id === value ? 'text-brand-accent bg-brand-accent/5' : 'text-brand-text/60',
              )}
            >
              {opt.name}
              {opt.badge && (
                <span className="text-[9px] font-medium text-brand-text/30 border border-white/10 rounded-full px-1.5 py-0.5">{opt.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────

function HistorySection({ runs }: { runs: HistoryRun[] }) {
  if (runs.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Past Runs</p>
      <div className="flex overflow-x-auto gap-4 pb-2">
        {runs.map((run) => (
          <div key={run.projectId} className="shrink-0 space-y-2">
            <p className="text-[10px] text-brand-text/30 whitespace-nowrap">
              {new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="flex gap-3">
              {run.videos.map((v, i) => (
                <div key={v.imageId} className="space-y-1.5 w-28">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-white/5">
                    <video src={v.videoUrl} controls playsInline className="w-full h-full object-cover" />
                  </div>
                  <a
                    href={v.videoUrl}
                    download={v.filename}
                    className="flex items-center justify-center gap-1 w-full text-[10px] text-brand-text/50 hover:text-brand-accent transition-colors border border-white/8 hover:border-brand-accent/30 rounded-md py-1"
                  >
                    <Download className="w-2.5 h-2.5" />
                    Video {i + 1}
                  </a>
                  {v.storageFileId && (
                    <TikTokShareButton
                      storageFileId={v.storageFileId}
                      fileName={v.filename}
                      buttonLabel="Share"
                      className="w-full h-7 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-white/55 border border-white/8 text-[10px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function buildMovementPrompt(template: MarketplaceTemplate | null, gender: string, roomAesthetic: string) {
  const promptFragment = typeof template?.config.promptFragment === 'string'
    ? template.config.promptFragment
    : ''

  return `A ${gender} in a ${roomAesthetic} room - ${promptFragment} The overall mood is elegant and confident.`
}

export function GeneratePanel({
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
  const { avatarConfig, backgroundConfig, cameraTemplateId, movementTemplateId, setAvatarConfig, setBackgroundConfig } = usePreferences()
  const { balance: tokenBalance, planId: contextPlanId, refreshBalance } = useTokens()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [productDescription, setProductDescription] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [pendingImage, setPendingImage] = useState<GeneratedImage | null>(null)
  const [lastProjectId, setLastProjectId] = useState<string | null>(null)
  const [lastDescription, setLastDescription] = useState('')
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [videoProgress, setVideoProgress] = useState<{ current: number; total: number } | null>(null)
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [availableModels, setAvailableModels] = useState<VideoModel[]>([VIDEO_MODELS[0]])
  const [selectedModelId, setSelectedModelId] = useState<string>(VIDEO_MODELS[0].id)

  // Local copies of template IDs — synced from context but overrideable per-run
  const [localCameraId, setLocalCameraId] = useState(cameraTemplateId || cameraTemplates[0]?.id || '')
  const [localMovementId, setLocalMovementId] = useState(movementTemplateId || movementTemplates[0]?.id || '')

  useEffect(() => { setLocalCameraId(cameraTemplateId) }, [cameraTemplateId])
  useEffect(() => { setLocalMovementId(movementTemplateId) }, [movementTemplateId])

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => { setHistoryRuns(d.runs ?? []); setHistoryLoaded(true) }).catch(() => setHistoryLoaded(true))
  }, [])

  useEffect(() => {
    const models = contextPlanId ? getAvailableModels(contextPlanId as PlanId) : [VIDEO_MODELS[0]]
    setAvailableModels(models)
    setSelectedModelId((prev) => models.find((m) => m.id === prev) ? prev : models[0].id)
  }, [contextPlanId])

  const selectedModel = availableModels.find((m) => m.id === selectedModelId) ?? availableModels[0]

  const isGenerating = stage === 'uploading' || stage === 'generating' || stage === 'making-videos'
  const canGenerate = productFiles.length > 0 && !!avatarConfig && !!backgroundConfig && !isGenerating && stage !== 'reviewing'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
    setProductFiles((prev) => {
      const combined = [...prev]
      for (const f of newFiles) {
        if (combined.length >= 5) break
        if (!combined.find((p) => p.file.name === f.name)) {
          combined.push({ file: f, previewUrl: URL.createObjectURL(f) })
        }
      }
      return combined
    })
    e.target.value = ''
  }

  function removeFile(name: string) {
    setProductFiles((prev) => {
      const removed = prev.find((p) => p.file.name === name)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((p) => p.file.name !== name)
    })
  }

  async function handleGenerate() {
    if (!productFiles.length) return
    setStage('uploading')
    setErrorMsg('')
    setGeneratedImages([])
    setVideos([])
    setVideoProgress(null)
    setPendingImage(null)

    try {
      const fd = new FormData()
      fd.append('usePreferences', 'true')
      productFiles.forEach(({ file }) => fd.append('products', file))

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
      const pid: string = uploadData.projectId
      setLastProjectId(pid)
      setLastDescription(productDescription)
      await runImageGeneration(pid, productDescription)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStage('error')
    }
  }

  async function runImageGeneration(pid: string, description: string) {
    setStage('generating')
    setGeneratedImages([])
    setPendingImage(null)

    const genRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: pid, productDescription: description, cameraTemplateId: localCameraId }),
    })
    if (!genRes.ok) {
      const err = await genRes.json()
      throw new Error(err.error ?? 'Generation failed')
    }

    const collected: GeneratedImage[] = []
    for await (const event of readNDJSON(genRes)) {
      if (event.type === 'image') {
        const img = event.image as GeneratedImage
        collected.push(img)
        setGeneratedImages((prev) => [...prev, img])
      }
    }

    if (collected.length === 0) throw new Error('No images could be generated')
    setPendingImage(collected[0])
    setStage('reviewing')
    refreshBalance()
  }

  async function handleApproveImage() {
    if (!pendingImage || !lastProjectId) return
    setStage('making-videos')

    try {
      const selectedMovementTemplate = movementTemplates.find((template) => template.id === localMovementId) ?? movementTemplates[0] ?? null
      const motionPrompt = buildMovementPrompt(
        selectedMovementTemplate,
        avatarConfig?.gender ?? 'man',
        backgroundConfig?.roomAesthetic ?? 'masculine',
      )
      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: lastProjectId, imageIds: [pendingImage.id], imageUrls: [pendingImage.url], motionPrompt, videoModelId: selectedModelId }),
      })
      if (!exportRes.ok) {
        const err = await exportRes.json()
        throw new Error(err.error ?? 'Video generation failed')
      }

      for await (const event of readNDJSON(exportRes)) {
        if (event.type === 'progress') {
          setVideoProgress({ current: event.index as number, total: event.total as number })
        } else if (event.type === 'video') {
          setVideos((prev) => [...prev, event.video as VideoResult])
          setVideoProgress({ current: (event.index as number) + 1, total: event.total as number })
        }
      }

      setStage('done')
      fetch('/api/history').then((r) => r.json()).then((d) => setHistoryRuns(d.runs ?? []))
      refreshBalance()
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStage('error')
    }
  }

  async function handleRegenerateImage() {
    if (!lastProjectId) return
    try {
      await runImageGeneration(lastProjectId, lastDescription)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStage('error')
    }
  }

  function handleReset() {
    productFiles.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    setProductFiles([])
    setGeneratedImages([])
    setVideos([])
    setLastProjectId(null)
    setLastDescription('')
    setPendingImage(null)
    setStage('idle')
    setErrorMsg('')
    setVideoProgress(null)
  }

  const cameraOptions = cameraTemplates.map((template) => ({ id: template.id, name: template.title, badge: template.badge ?? undefined }))
  const movementOptions = movementTemplates.map((template) => ({ id: template.id, name: template.title, badge: template.badge ?? undefined }))
  const avatarOptions = avatarTemplates.map((template) => ({ id: template.id, name: template.title }))
  const backgroundOptions = backgroundTemplates.map((template) => ({ id: template.id, name: template.title }))

  const localAvatarId = avatarConfig?.type === 'preset'
    ? (avatarConfig.presetId ?? avatarOptions[0]?.id ?? '')
    : (avatarOptions[0]?.id ?? '')
  const localBgId = backgroundConfig?.presetId ?? backgroundOptions[0]?.id ?? ''

  async function handleAvatarChange(id: string) {
    const template = avatarTemplates.find((item) => item.id === id)
    if (!template) return
    const style =
      template.config.style === 'streetwear' ||
      template.config.style === 'luxury' ||
      template.config.style === 'minimal'
        ? template.config.style
        : 'casual'
    const config: AvatarConfig = {
      type: 'preset' as const,
      presetId: template.id,
      gender: template.config.gender === 'woman' ? 'woman' : 'man',
      style,
    }
    setAvatarConfig(config)
    fetch('/api/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar_config: config }) })
  }

  async function handleBackgroundChange(id: string) {
    const template = backgroundTemplates.find((item) => item.id === id)
    if (!template) return
    const config: BackgroundConfig = {
      type: 'preset' as const,
      presetId: template.id,
      roomAesthetic: String(template.config.roomAesthetic ?? ''),
      roomColors: String(template.config.roomColors ?? ''),
      roomElements: String(template.config.roomElements ?? ''),
      thumbnailUrl: template.thumbnail_url ?? undefined,
    }
    setBackgroundConfig(config)
    fetch('/api/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ background_config: config }) })
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">

      {/* 1. PAGE HEADER */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Studio</p>
        <h1
          className="text-[32px] font-black uppercase text-brand-text leading-[0.85]"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
        >
          AI Product Studio
        </h1>
      </div>

      {/* 2. PROGRESS TRACK */}
      <StepIndicator stage={stage} />

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="flex gap-4 items-start">

      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">

      {/* 3. AVATAR / BACKGROUND WARNING */}
      {!avatarConfig && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <Link href="/templates" className="underline underline-offset-2 hover:text-amber-300">Set up your avatar and background</Link> before generating.
          </span>
        </div>
      )}

      {/* 4. MAIN AREA */}

      {/* 4a. CANVAS */}
      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col min-h-[320px] sm:min-h-[520px]"
        style={{ background: '#1a1f27' }}
      >

        {/* IDLE */}
        {stage === 'idle' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-lg space-y-8">
              {/* Tagline */}
              <div className="text-center">
                <h2
                  className="text-[36px] sm:text-[44px] font-black uppercase text-brand-text leading-[0.85]"
                  style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
                >
                  YOUR MODEL.{' '}
                  <span className="text-brand-accent">YOUR VIDEO.</span>
                </h2>
              </div>
              {/* Steps */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { n: '1', label: 'Upload product', sub: 'Add 1–5 product images below' },
                  { n: '2', label: 'Generate image', sub: 'AI dresses your model in the product' },
                  { n: '3', label: 'Create video', sub: 'Approve the image to make a video' },
                ].map(({ n, label, sub }) => (
                  <div key={n} className="rounded-xl border border-white/[0.06] p-3 space-y-2" style={{ background: 'var(--color-brand-bg)' }}>
                    <div className="w-6 h-6 rounded-md bg-brand-accent/15 border border-brand-accent/25 flex items-center justify-center">
                      <span className="text-[11px] font-black text-brand-accent">{n}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-brand-text/80">{label}</p>
                      <p className="text-[10px] text-brand-text/35 mt-0.5 leading-snug">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-brand-text/25">Start by uploading product images below ↓</p>
            </div>
          </div>
        )}

        {/* UPLOADING */}
        {stage === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10">
            <div className="w-14 h-14 rounded-full border-2 border-white/10 border-t-brand-accent animate-spin" />
            <p
              className="text-2xl font-black uppercase text-brand-text leading-[0.85]"
              style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
            >
              UPLOADING...
            </p>
            <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* GENERATING */}
        {stage === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-brand-accent/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-brand-accent animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <p
                className="text-3xl font-black uppercase text-brand-text leading-[0.85]"
                style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
              >
                BUILDING YOUR SHOT
              </p>
              <p className="text-sm text-brand-text/40">AI is compositing your model onto the product</p>
            </div>
            <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* REVIEWING */}
        {stage === 'reviewing' && pendingImage && (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
            {/* Image top (mobile) / left (desktop) */}
            <div className="sm:w-[45%] shrink-0 bg-black/30 flex items-stretch">
              <img
                src={pendingImage.url}
                alt="Generated"
                className="w-full object-cover max-h-72 sm:max-h-none sm:h-full"
                style={{ minHeight: undefined }}
              />
            </div>

            {/* Actions right */}
            <div className="flex-1 p-6 flex flex-col justify-center space-y-4 bg-[#1a1f27]">
              <div>
                <h2
                  className="text-2xl font-black uppercase text-brand-text"
                  style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}
                >
                  REVIEW YOUR IMAGE
                </h2>
                <p className="text-xs text-brand-text/40 mt-1">
                  Happy with it? Approve to create the video. Not happy? Regenerate free of charge.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Video model selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-brand-text/35 uppercase tracking-wider">Video model</p>
                    {tokenBalance !== null && (
                      <span className="flex items-center gap-1 text-[10px] text-brand-text/30">
                        <Zap className="w-2.5 h-2.5 text-brand-accent" />
                        {tokenBalance.toLocaleString()} left
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all',
                          selectedModelId === model.id
                            ? 'border-brand-accent/50 bg-brand-accent/10'
                            : 'border-white/8 bg-white/[0.02] hover:border-white/15',
                        )}
                      >
                        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', selectedModelId === model.id ? 'bg-brand-accent' : 'bg-white/15')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-brand-text leading-tight">{model.name}</p>
                          <p className="text-[10px] text-brand-text/30">{model.qualityLabel}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-[10px] text-brand-text/40 border border-white/8 rounded px-1.5 py-0.5 shrink-0">
                          <Zap className="w-2.5 h-2.5" />{model.tokenCost}
                        </span>
                      </button>
                    ))}
                    {availableModels.length < VIDEO_MODELS.length && (
                      <p className="text-[10px] text-brand-text/25 px-1">
                        <Link href="/billing" className="underline underline-offset-2 hover:text-brand-text/50">Upgrade</Link> to unlock more models
                      </p>
                    )}
                  </div>
                </div>

                {/* Approve button */}
                <Button
                  onClick={handleApproveImage}
                  className="w-full h-12 bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-black uppercase rounded-xl shadow-lg shadow-brand-accent/20 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    APPROVE — CREATE VIDEO
                    <span className="flex items-center gap-0.5 text-brand-bg/60 text-[10px] font-normal border border-brand-bg/20 rounded px-1.5 py-0.5 ml-1">
                      <Zap className="w-2.5 h-2.5" />{selectedModel?.tokenCost}
                    </span>
                  </span>
                </Button>

                {/* Regenerate */}
                <button
                  onClick={handleRegenerateImage}
                  className="w-full h-10 rounded-xl border border-white/10 hover:border-brand-accent/40 bg-transparent hover:bg-brand-accent/5 text-sm text-brand-text/60 hover:text-brand-text transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Regenerate free
                  <span className="flex items-center gap-0.5 text-[10px] text-brand-text/30 border border-white/8 rounded px-1.5 py-0.5 ml-1">
                    <Zap className="w-2.5 h-2.5" />{TOKEN_COSTS.image_gen}
                  </span>
                </button>

                {/* Download image only */}
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = pendingImage.url
                    a.download = `genetrify-image.jpg`
                    a.click()
                  }}
                  className="w-full h-9 rounded-xl text-xs text-brand-text/35 hover:text-brand-text/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  Download image only
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAKING VIDEOS */}
        {stage === 'making-videos' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-brand-accent/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-[-6px] rounded-full border border-brand-accent/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-brand-accent animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <p
                className="text-3xl font-black uppercase text-brand-text leading-[0.85]"
                style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
              >
                CREATING YOUR VIDEO
              </p>
              <p className="text-sm text-brand-text/40">This usually takes 1–3 minutes</p>
              {videoProgress && (
                <p className="text-xs text-brand-accent">{videoProgress.current} / {videoProgress.total} complete</p>
              )}
            </div>
            <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full animate-pulse w-1/2" />
            </div>
          </div>
        )}

        {/* DONE */}
        {stage === 'done' && videos.length > 0 && (
          <div className="flex-1 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand-accent" />
                <p
                  className="text-xl font-black uppercase text-brand-text leading-[0.85]"
                  style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
                >
                  VIDEO READY
                </p>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-brand-text/35 hover:text-brand-text/70 transition-colors border border-white/8 hover:border-brand-accent/30 rounded-lg px-3 py-1.5"
              >
                New run
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className={cn(
              'flex gap-4',
              videos.length === 1 ? 'justify-center' : 'flex-wrap justify-center',
            )}>
              {videos.map((v, i) => (
                <div key={v.imageId} className={cn('space-y-2', videos.length === 1 ? 'w-48' : 'w-48')}>
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-black">
                    <video src={v.videoUrl} controls playsInline className="w-full h-full object-cover" />
                  </div>
                  <a
                    href={v.videoUrl}
                    download={v.filename}
                    className="flex items-center justify-center gap-1.5 w-full text-xs text-brand-text/60 hover:text-brand-accent transition-colors border border-white/10 hover:border-brand-accent/30 rounded-lg py-2 bg-white/[0.02] hover:bg-brand-accent/5"
                  >
                    <Download className="w-3 h-3" />
                    Download video {i + 1}
                  </a>
                  {v.storageFileId && (
                    <TikTokShareButton
                      storageFileId={v.storageFileId}
                      fileName={v.filename}
                      className="w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div className="flex-1 flex flex-col justify-center p-6 space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="bg-brand-accent hover:bg-brand-accent-hover text-brand-bg disabled:opacity-30 rounded-xl h-9 text-sm font-bold"
              >
                Try again
              </Button>
              <button onClick={handleReset} className="text-xs text-brand-text/35 hover:text-brand-text/60 transition-colors">
                Start over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4b. CONTROLS ROW */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Product upload */}
        <div className="space-y-1.5 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-text/35">
            Product Images {productFiles.length > 0 && <span className="normal-case font-normal text-brand-text/20">({productFiles.length}/5)</span>}
          </p>
          {productFiles.length === 0 ? (
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 hover:border-brand-accent/40 hover:bg-brand-accent/5 px-3 py-2.5 cursor-pointer transition-colors">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              <ImagePlus className="w-4 h-4 text-brand-text/30 shrink-0" />
              <span className="text-xs text-brand-text/40">Drop or click to upload</span>
            </label>
          ) : (
            <div className="flex items-center gap-2 flex-wrap p-2 rounded-lg border border-white/8 bg-white/[0.02]">
              {productFiles.map(({ file, previewUrl }) => (
                <div key={file.name} className="relative group">
                  <img src={previewUrl} alt={file.name} className="w-10 h-10 rounded-md object-cover border border-white/10" />
                  <button
                    onClick={() => removeFile(file.name)}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 border border-white/15 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              ))}
              {productFiles.length < 5 && (
                <label className="w-10 h-10 rounded-md border border-dashed border-white/10 hover:border-brand-accent/40 flex items-center justify-center cursor-pointer transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  <ImagePlus className="w-3.5 h-3.5 text-brand-text/25" />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Product hint — grows to fill space */}
        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-text/35">
            Product Hint <span className="normal-case font-normal text-brand-text/20">(optional)</span>
          </p>
          <input
            type="text"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="e.g. wireless earbuds, face serum…"
            className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-brand-text/80 placeholder:text-brand-text/20 focus:outline-none focus:border-brand-accent/50 transition-colors"
          />
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="h-12 px-6 w-full sm:w-auto bg-brand-accent hover:bg-brand-accent-hover text-brand-bg font-black uppercase rounded-xl disabled:opacity-30 transition-all shadow-lg shadow-brand-accent/20 shrink-0"
        >
          {stage === 'uploading' ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-bg/20 border-t-brand-bg animate-spin" />
              UPLOADING...
            </span>
          ) : stage === 'generating' ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-bg/20 border-t-brand-bg animate-spin" />
              GENERATING...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              GENERATE IMAGE
              <span className="flex items-center gap-0.5 text-brand-bg/60 text-[10px] font-normal border border-brand-bg/20 rounded px-1.5 py-0.5 ml-1">
                <Zap className="w-2.5 h-2.5" />{TOKEN_COSTS.image_gen}
              </span>
            </span>
          )}
        </Button>
      </div>

      {/* 5. HISTORY */}
      {historyLoaded && historyRuns.length > 0 && (
        <HistorySection runs={historyRuns} />
      )}

      </div>{/* end LEFT COLUMN */}

      {/* RIGHT SIDEBAR — settings */}
      <div className="w-52 shrink-0 hidden lg:flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/30 px-1 mb-1">Settings</p>

        {/* Avatar */}
        <InlineSelector
          label="Avatar"
          options={avatarOptions}
          value={localAvatarId}
          onChange={handleAvatarChange}
        />

        {/* Background */}
        <InlineSelector
          label="Background"
          options={backgroundOptions}
          value={localBgId}
          onChange={handleBackgroundChange}
        />

        {/* Camera */}
        <InlineSelector
          label="Camera Angle"
          options={cameraOptions}
          value={localCameraId}
          onChange={setLocalCameraId}
        />

        {/* Movement */}
        <InlineSelector
          label="Movement"
          options={movementOptions}
          value={localMovementId}
          onChange={setLocalMovementId}
        />

        <div className="border-t border-white/[0.06] my-1" />

        {/* Marketplace link */}
        <Link
          href="/templates"
          className="flex items-center justify-center gap-1.5 text-[11px] text-brand-text/30 hover:text-brand-accent transition-colors py-1"
        >
          <Sparkles className="w-3 h-3" />
          Browse Templates
        </Link>
      </div>

    </div>{/* end TWO-COLUMN */}

    </div>
  )
}
