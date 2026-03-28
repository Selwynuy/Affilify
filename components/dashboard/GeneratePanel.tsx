'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/lib/context/preferences-context'
import {
  ImagePlus, X, Download, Clapperboard, User, UserRound,
  Zap, Sparkles, Video, RotateCcw, ChevronDown, CheckCircle2,
  AlertCircle, ArrowRight, Clock,
} from 'lucide-react'
import { buildVideoPrompt, getTemplate, MOTION_TEMPLATES } from '@/lib/data/templates'
import { VIDEO_MODELS, getAvailableModels, TOKEN_COSTS } from '@/lib/data/plans'
import type { VideoModel, PlanId } from '@/lib/types/billing'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedImage { id: string; url: string }
interface VideoResult { imageId: string; videoUrl: string; filename: string }
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
  { id: 'upload', label: 'Upload products' },
  { id: 'image', label: 'Generate image' },
  { id: 'review', label: 'Review image' },
  { id: 'video', label: 'Create video' },
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
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i < activeIndex
        const active = i === activeIndex
        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all',
              done ? 'bg-emerald-500/15 text-emerald-400'
              : active ? 'bg-violet-500/15 text-violet-300'
              : 'text-white/20',
            )}>
              {done ? <CheckCircle2 className="w-3 h-3" /> : (
                <span className={cn(
                  'w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold',
                  active ? 'border-violet-500 text-violet-400' : 'border-white/15 text-white/25',
                )}>{i + 1}</span>
              )}
              <span className="hidden sm:block">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-4 h-px', done ? 'bg-emerald-500/40' : 'bg-white/8')} />
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
  const current = options.find((o) => o.id === value) ?? options[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 hover:border-white/15 transition-all w-full text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/35 leading-none mb-0.5">{label}</p>
          <p className="text-xs font-medium text-white truncate">{current.name}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-white/30 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border border-white/10 bg-[#0f0d1a] shadow-xl shadow-black/40 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false) }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors text-xs',
                opt.id === value ? 'text-violet-300 bg-violet-500/5' : 'text-white/60',
              )}
            >
              {opt.name}
              {opt.badge && (
                <span className="text-[9px] font-medium text-white/30 border border-white/10 rounded-full px-1.5 py-0.5">{opt.badge}</span>
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
  const [open, setOpen] = useState(false)
  if (runs.length === 0) return null

  return (
    <div className="border-t border-white/8 pt-6 space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
      >
        <Clock className="w-4 h-4" />
        Past runs ({runs.length})
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-6">
          {runs.map((run) => (
            <div key={run.projectId} className="space-y-2">
              <p className="text-xs text-white/30">
                {new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex flex-wrap gap-3">
                {run.videos.map((v, i) => (
                  <div key={v.imageId} className="space-y-1.5 w-32">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-white/5">
                      <video src={v.videoUrl} controls playsInline className="w-full h-full object-cover" />
                    </div>
                    <a
                      href={v.videoUrl}
                      download={v.filename}
                      className="flex items-center justify-center gap-1 w-full text-[10px] text-white/50 hover:text-white transition-colors border border-white/8 hover:border-white/20 rounded-md py-1"
                    >
                      <Download className="w-2.5 h-2.5" />
                      Video {i + 1}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function GeneratePanel() {
  const { avatarConfig, backgroundConfig, cameraTemplateId, movementTemplateId, setCameraTemplateId, setMovementTemplateId } = usePreferences()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [productDescription, setProductDescription] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [pendingImage, setPendingImage] = useState<GeneratedImage | null>(null)
  const [lastProjectId, setLastProjectId] = useState<string | null>(null)
  const [lastDescription, setLastDescription] = useState('')
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [videoProgress, setVideoProgress] = useState<{ current: number; total: number } | null>(null)
  const [avatarImgError, setAvatarImgError] = useState(false)
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const [availableModels, setAvailableModels] = useState<VideoModel[]>([VIDEO_MODELS[0]])
  const [selectedModelId, setSelectedModelId] = useState<string>(VIDEO_MODELS[0].id)

  // Local copies of template IDs — synced from context but overrideable per-run
  const [localCameraId, setLocalCameraId] = useState(cameraTemplateId)
  const [localMovementId, setLocalMovementId] = useState(movementTemplateId)

  useEffect(() => { setLocalCameraId(cameraTemplateId) }, [cameraTemplateId])
  useEffect(() => { setLocalMovementId(movementTemplateId) }, [movementTemplateId])

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => { setHistoryRuns(d.runs ?? []); setHistoryLoaded(true) }).catch(() => setHistoryLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/billing/balance').then((r) => r.json()).then((d) => {
      setTokenBalance(d.balance ?? 0)
      const models = d.planId ? getAvailableModels(d.planId as PlanId) : [VIDEO_MODELS[0]]
      setAvailableModels(models)
      setSelectedModelId((prev) => models.find((m) => m.id === prev) ? prev : models[0].id)
    }).catch(() => {})
  }, [])

  const selectedModel = availableModels.find((m) => m.id === selectedModelId) ?? availableModels[0]
  const avatarThumb = !avatarImgError && avatarConfig?.type === 'custom' ? avatarConfig.faceUrl : null
  const GenderIcon = avatarConfig?.gender === 'woman' ? UserRound : User

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
    // Refresh balance after image generation cost
    fetch('/api/billing/balance').then((r) => r.json()).then((d) => setTokenBalance(d.balance ?? 0))
  }

  async function handleApproveImage() {
    if (!pendingImage || !lastProjectId) return
    setStage('making-videos')

    try {
      const motionPrompt = buildVideoPrompt(localMovementId, avatarConfig?.gender ?? 'man', backgroundConfig?.roomAesthetic ?? 'masculine')
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
      fetch('/api/billing/balance').then((r) => r.json()).then((d) => setTokenBalance(d.balance ?? 0))
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

  const cameraOptions = MOTION_TEMPLATES.filter((t) => t.category === 'camera').map((t) => ({ id: t.id, name: t.name, badge: t.badge }))
  const movementOptions = MOTION_TEMPLATES.filter((t) => t.category === 'movement').map((t) => ({ id: t.id, name: t.name, badge: t.badge }))

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header + step indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Studio</h1>
          <p className="text-sm text-white/40 mt-0.5">Generate AI product videos in 4 steps.</p>
        </div>
        {stage !== 'idle' && <StepIndicator stage={stage} />}
      </div>

      {/* Avatar / background warning */}
      {!avatarConfig && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <Link href="/profile" className="underline underline-offset-2 hover:text-amber-300">Set up your avatar and background</Link> before generating.
          </span>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">

        {/* ── Left: inputs ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Avatar + background summary */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/profile" className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 hover:border-white/15 hover:bg-white/5 transition-all">
              {avatarThumb ? (
                <img src={avatarThumb} alt="Avatar" onError={() => setAvatarImgError(true)} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/8 border border-white/8 flex items-center justify-center shrink-0">
                  <GenderIcon className="w-4 h-4 text-white/40" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 leading-none">Avatar</p>
                <p className="text-xs font-medium text-white/80 truncate mt-0.5 capitalize">
                  {avatarConfig ? (avatarConfig.type === 'preset' ? 'AI model' : 'Custom face') : 'Not set'}
                </p>
              </div>
            </Link>

            <Link href="/profile" className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 hover:border-white/15 hover:bg-white/5 transition-all">
              {backgroundConfig?.thumbnailUrl ? (
                <img src={backgroundConfig.thumbnailUrl} alt="Background" className="w-8 h-8 rounded-md object-cover border border-white/10 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-white/8 border border-white/8 flex items-center justify-center shrink-0 text-[9px] text-white/30 font-medium">BG</div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 leading-none">Background</p>
                <p className="text-xs font-medium text-white/80 truncate mt-0.5 capitalize">
                  {backgroundConfig?.roomAesthetic ?? 'Not set'}
                </p>
              </div>
            </Link>
          </div>

          {/* Product images */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Product images {productFiles.length > 0 && <span className="normal-case text-white/25 font-normal">({productFiles.length}/5)</span>}
            </p>

            {productFiles.length === 0 ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 px-4 py-8 cursor-pointer transition-colors">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                <ImagePlus className="w-6 h-6 text-white/25" />
                <span className="text-sm text-white/40">Drop images here or click to browse</span>
                <span className="text-xs text-white/20">Up to 5 images per run</span>
              </label>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.02]">
                {productFiles.map(({ file, previewUrl }) => (
                  <div key={file.name} className="relative group">
                    <img src={previewUrl} alt={file.name} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                    <button
                      onClick={() => removeFile(file.name)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/70 border border-white/15 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {productFiles.length < 5 && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 hover:border-violet-500/40 flex items-center justify-center cursor-pointer transition-colors">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                    <ImagePlus className="w-4 h-4 text-white/25" />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Product hint <span className="normal-case text-white/25 font-normal">(optional)</span>
            </p>
            <input
              type="text"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g. wireless earbuds, face serum…"
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Camera + movement inline selectors */}
          <div className="grid grid-cols-2 gap-2">
            <InlineSelector
              label="Camera angle"
              options={cameraOptions}
              value={localCameraId}
              onChange={setLocalCameraId}
            />
            <InlineSelector
              label="Movement"
              options={movementOptions}
              value={localMovementId}
              onChange={setLocalMovementId}
            />
          </div>

          {/* Generate image CTA */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white disabled:opacity-30 font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
            >
              {stage === 'uploading' ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />Uploading…</span>
              ) : stage === 'generating' ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />Generating image…</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate image
                  <span className="flex items-center gap-0.5 text-white/60 text-[10px] font-normal border border-white/20 rounded px-1.5 py-0.5 ml-1">
                    <Zap className="w-2.5 h-2.5" />{TOKEN_COSTS.image_gen}
                  </span>
                </span>
              )}
            </Button>
            <p className="text-[10px] text-center text-white/20">
              After approval you'll pick a video model and confirm
            </p>
          </div>
        </div>

        {/* ── Right: results ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] min-h-[400px] overflow-hidden flex flex-col">

          {/* Empty state */}
          {stage === 'idle' && (
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="text-center space-y-5 max-w-xs">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center mx-auto">
                  <Clapperboard className="w-6 h-6 text-violet-400/60" />
                </div>
                <div className="space-y-3">
                  {[
                    { n: 1, icon: <ImagePlus className="w-3.5 h-3.5" />, text: 'Upload product photos (up to 5)', cost: null },
                    { n: 2, icon: <Sparkles className="w-3.5 h-3.5" />, text: 'Generate image', cost: `${TOKEN_COSTS.image_gen} tokens` },
                    { n: 3, icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Review & approve the image', cost: null },
                    { n: 4, icon: <Video className="w-3.5 h-3.5" />, text: 'Create video', cost: `${selectedModel?.tokenCost ?? '—'} tokens` },
                  ].map(({ n, icon, text, cost }) => (
                    <div key={n} className="flex items-center gap-3 text-left">
                      <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold flex items-center justify-center shrink-0">{n}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-white/30">{icon}</span>
                        <p className="text-sm text-white/60">{text}</p>
                        {cost && (
                          <span className="ml-auto flex items-center gap-0.5 text-[10px] text-white/25 shrink-0">
                            <Zap className="w-2.5 h-2.5" />{cost}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generating image */}
          {stage === 'generating' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
              <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white">Generating your image…</p>
                <p className="text-xs text-white/35">AI is compositing your face onto the product shot</p>
              </div>
              <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Review panel */}
          {stage === 'reviewing' && pendingImage && (
            <div className="flex-1 flex flex-col sm:flex-row gap-0 overflow-hidden">
              {/* Image */}
              <div className="sm:w-56 shrink-0 bg-black/20 flex items-center justify-center p-4">
                <div className="relative rounded-xl overflow-hidden border border-white/10 w-full max-w-[160px] aspect-[9/16] mx-auto">
                  <img src={pendingImage.url} alt="Generated" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Review your image</h2>
                  <p className="text-xs text-white/40 mt-1">Happy with it? Approve to create the video. Not happy? Regenerate free of charge.</p>
                </div>

                <div className="space-y-2.5">
                  {/* Video model — shown here, only when it matters */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider">Video model</p>
                      {tokenBalance !== null && (
                        <span className="flex items-center gap-1 text-[10px] text-white/30">
                          <Zap className="w-2.5 h-2.5 text-violet-400" />
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
                              ? 'border-violet-500/50 bg-violet-500/8'
                              : 'border-white/8 bg-white/[0.02] hover:border-white/15',
                          )}
                        >
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', selectedModelId === model.id ? 'bg-violet-400' : 'bg-white/15')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white leading-tight">{model.name}</p>
                            <p className="text-[10px] text-white/30">{model.qualityLabel}</p>
                          </div>
                          <span className="flex items-center gap-0.5 text-[10px] text-white/40 border border-white/8 rounded px-1.5 py-0.5 shrink-0">
                            <Zap className="w-2.5 h-2.5" />{model.tokenCost}
                          </span>
                        </button>
                      ))}
                      {availableModels.length < VIDEO_MODELS.length && (
                        <p className="text-[10px] text-white/25 px-1">
                          <Link href="/billing" className="underline underline-offset-2 hover:text-white/50">Upgrade</Link> to unlock more models
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleApproveImage}
                    className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20"
                  >
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Approve — create video
                      <span className="flex items-center gap-0.5 text-white/60 text-[10px] font-normal border border-white/20 rounded px-1.5 py-0.5 ml-1">
                        <Zap className="w-2.5 h-2.5" />{selectedModel?.tokenCost}
                      </span>
                    </span>
                  </Button>

                  <button
                    onClick={handleRegenerateImage}
                    className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/8 text-sm text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Regenerate image
                    <span className="flex items-center gap-0.5 text-[10px] text-white/30 border border-white/8 rounded px-1.5 py-0.5 ml-1">
                      <Zap className="w-2.5 h-2.5" />{TOKEN_COSTS.image_gen}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = pendingImage.url
                      a.download = `affilify-image.jpg`
                      a.click()
                    }}
                    className="w-full h-9 rounded-xl text-xs text-white/35 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    Download image only
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Making video */}
          {stage === 'making-videos' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
              <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-fuchsia-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white">Creating your video…</p>
                <p className="text-xs text-white/35">This usually takes 1–3 minutes</p>
              </div>
              <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          )}

          {/* Done */}
          {stage === 'done' && videos.length > 0 && (
            <div className="flex-1 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Video ready
                  </p>
                  <p className="text-xs text-white/35 mt-0.5">Download and post to TikTok</p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors border border-white/8 rounded-lg px-3 py-1.5"
                >
                  <ArrowRight className="w-3 h-3" />
                  New run
                </button>
              </div>

              <div className="flex flex-wrap gap-4">
                {videos.map((v, i) => (
                  <div key={v.imageId} className="space-y-2 w-44">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-black">
                      <video src={v.videoUrl} controls playsInline className="w-full h-full object-cover" />
                    </div>
                    <a
                      href={v.videoUrl}
                      download={v.filename}
                      className="flex items-center justify-center gap-1.5 w-full text-xs text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-lg py-2 bg-white/[0.02] hover:bg-white/5"
                    >
                      <Download className="w-3 h-3" />
                      Download video {i + 1}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
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
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white disabled:opacity-30 rounded-xl h-9 text-sm"
                >
                  Try again
                </Button>
                <button onClick={handleReset} className="text-xs text-white/35 hover:text-white/60 transition-colors">
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {historyLoaded && <HistorySection runs={historyRuns} />}
    </div>
  )
}
