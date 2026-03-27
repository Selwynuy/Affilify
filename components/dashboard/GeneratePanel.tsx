'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/lib/context/preferences-context'
import {
  ImagePlus,
  X,
  ArrowRight,
  Download,
  Clapperboard,
  User,
  UserRound,
  Clock,
  ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedImage { id: string; url: string }
interface VideoResult { imageId: string; videoUrl: string; filename: string }
interface HistoryRun { projectId: string; createdAt: string; videos: VideoResult[] }

interface ProductFile {
  file: File
  previewUrl: string
}

type Stage = 'idle' | 'uploading' | 'generating' | 'making-videos' | 'done' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMotionPrompt(gender: string, roomAesthetic: string): string {
  return (
    `A ${gender} with an elegant style standing in a ${roomAesthetic} bedroom, ` +
    `performing a complete 360-degree spin clockwise in one continuous direction, making a full circle. ` +
    `They smoothly rotate through front, right side, back, left side, and front again, without stopping or reversing. ` +
    `The motion is elegant, uninterrupted, and confident, clearly showcasing their outfit from every angle. ` +
    `The camera stays static with a calm and aesthetic atmosphere. ` +
    `No speaking, no lip-sync, and no slow motion.`
  )
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageGrid({
  images,
  videos,
  totalImages,
  generatingVideos,
  videoProgress,
}: {
  images: GeneratedImage[]
  videos: VideoResult[]
  totalImages: number
  generatingVideos: boolean
  videoProgress: number // how many videos done so far
}) {
  // Show placeholder slots while generating
  const slots = Array.from({ length: totalImages || images.length || 4 })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
      {slots.map((_, i) => {
        const img = images[i]
        const vid = videos.find((v) => v.imageId === img?.id)

        return (
          <div key={i} className="space-y-1.5">
            <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-white/5">
              {vid ? (
                <video src={vid.videoUrl} controls playsInline className="w-full h-full object-cover" />
              ) : img ? (
                <>
                  <img src={img.url} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                  {generatingVideos && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
                      <span className="text-[10px] text-white/60">Making video…</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-violet-400/60 animate-spin" />
                  <span className="text-[10px] text-white/30">Image {i + 1}</span>
                </div>
              )}
            </div>

            {/* Download — only when video is ready */}
            {vid && (
              <a
                href={vid.videoUrl}
                download={vid.filename}
                className="flex items-center justify-center gap-1 w-full text-xs text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-md py-1"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HistorySection({ runs }: { runs: HistoryRun[] }) {
  const [open, setOpen] = useState(false)

  if (runs.length === 0) return null

  return (
    <div className="border-t border-white/8 pt-6 space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
                {run.videos.map((v, i) => (
                  <div key={v.imageId} className="space-y-1.5">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-white/5">
                      <video src={v.videoUrl} controls playsInline className="w-full h-full object-cover" />
                    </div>
                    <a
                      href={v.videoUrl}
                      download={v.filename}
                      className="flex items-center justify-center gap-1 w-full text-xs text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-md py-1"
                    >
                      <Download className="w-3 h-3" />
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

// ─── Main component ───────────────────────────────────────────────────────────

export function GeneratePanel() {
  const { avatarConfig, backgroundConfig } = usePreferences()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [productDescription, setProductDescription] = useState('')

  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Images stream in one by one
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [imageProgress, setImageProgress] = useState<{ current: number; total: number } | null>(null)

  // Videos stream in one by one
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [videoProgress, setVideoProgress] = useState<{ current: number; total: number } | null>(null)

  const [projectId, setProjectId] = useState<string | null>(null)
  const [avatarImgError, setAvatarImgError] = useState(false)

  // History
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((data) => {
        setHistoryRuns(data.runs ?? [])
        setHistoryLoaded(true)
      })
      .catch(() => setHistoryLoaded(true))
  }, [])

  const avatarThumb = !avatarImgError && avatarConfig
    ? (avatarConfig.type === 'custom' ? avatarConfig.faceUrl : null)
    : null
  const bgThumb = backgroundConfig?.thumbnailUrl ?? null

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
    setImageProgress(null)
    setVideoProgress(null)

    try {
      // ── 1. Upload ────────────────────────────────────────────────────────────
      const fd = new FormData()
      fd.append('usePreferences', 'true')
      // Always create a fresh project on each run
      productFiles.forEach(({ file }) => fd.append('products', file))

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
      const pid: string = uploadData.projectId
      setProjectId(pid)

      // ── 2. Generate images (streaming) ───────────────────────────────────────
      setStage('generating')
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: pid, productDescription }),
      })
      if (!genRes.ok) {
        const err = await genRes.json()
        throw new Error(err.error ?? 'Generation failed')
      }

      const collectedImages: GeneratedImage[] = []

      for await (const event of readNDJSON(genRes)) {
        if (event.type === 'progress') {
          setImageProgress({ current: event.index as number, total: event.total as number })
        } else if (event.type === 'image') {
          const img = event.image as GeneratedImage
          collectedImages.push(img)
          setGeneratedImages((prev) => [...prev, img])
          setImageProgress({ current: (event.index as number) + 1, total: event.total as number })
        } else if (event.type === 'done') {
          setImageProgress({ current: event.success as number, total: event.total as number })
        }
      }

      if (collectedImages.length === 0) throw new Error('No images could be generated')

      // ── 3. Make videos (streaming) ───────────────────────────────────────────
      setStage('making-videos')
      const motionPrompt = buildMotionPrompt(
        avatarConfig?.gender ?? 'man',
        backgroundConfig?.roomAesthetic ?? 'masculine',
      )

      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: pid,
          imageIds: collectedImages.map((img) => img.id),
          imageUrls: collectedImages.map((img) => img.url),
          motionPrompt,
        }),
      })
      if (!exportRes.ok) {
        const err = await exportRes.json()
        throw new Error(err.error ?? 'Video generation failed')
      }

      for await (const event of readNDJSON(exportRes)) {
        if (event.type === 'progress') {
          setVideoProgress({ current: event.index as number, total: event.total as number })
        } else if (event.type === 'video') {
          const vid = event.video as VideoResult
          setVideos((prev) => [...prev, vid])
          setVideoProgress({ current: (event.index as number) + 1, total: event.total as number })
        } else if (event.type === 'done') {
          setVideoProgress({ current: event.success as number, total: event.total as number })
        }
      }

      setStage('done')

      // Refresh history after run
      fetch('/api/history').then((r) => r.json()).then((d) => setHistoryRuns(d.runs ?? []))
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
    setProjectId(null)
    setStage('idle')
    setErrorMsg('')
    setImageProgress(null)
    setVideoProgress(null)
  }

  const isGenerating = stage === 'uploading' || stage === 'generating' || stage === 'making-videos'
  const canGenerate = productFiles.length > 0 && !!avatarConfig && !!backgroundConfig && !isGenerating
  const GenderIcon = avatarConfig?.gender === 'woman' ? UserRound : User

  const showResults = generatedImages.length > 0 || stage === 'generating' || stage === 'making-videos' || stage === 'done'

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Generate</h1>
        <p className="text-sm text-white/50">Upload product images and create AI videos in seconds.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left panel ─────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 lg:shrink-0 space-y-4">

          {/* Setup chips */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Your setup</p>

            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3.5 py-3">
              <div className="flex items-center gap-3">
                {avatarThumb ? (
                  <img
                    src={avatarThumb}
                    alt="Avatar"
                    onError={() => setAvatarImgError(true)}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                    <GenderIcon className="w-4 h-4 text-white/50" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white capitalize leading-tight">
                    {avatarConfig
                      ? `${avatarConfig.type === 'preset' ? 'AI model' : 'Custom'} · ${avatarConfig.gender}`
                      : 'No avatar'}
                  </p>
                  <p className="text-xs text-white/40 capitalize mt-0.5">{avatarConfig?.type ?? 'Not set'}</p>
                </div>
              </div>
              <Link href="/profile" className="text-xs text-white/50 hover:text-white transition-colors font-medium">
                Change
              </Link>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3.5 py-3">
              <div className="flex items-center gap-3">
                {bgThumb ? (
                  <img src={bgThumb} alt="Background" className="w-9 h-9 rounded-md object-cover border border-white/10" />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-xs font-medium">
                    bg
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white capitalize leading-tight">
                    {backgroundConfig?.roomAesthetic ?? 'No background'}
                  </p>
                  <p className="text-xs text-white/40 capitalize mt-0.5">{backgroundConfig?.type ?? 'Not set'}</p>
                </div>
              </div>
              <Link href="/profile" className="text-xs text-white/50 hover:text-white transition-colors font-medium">
                Change
              </Link>
            </div>
          </div>

          <div className="border-t border-white/8" />

          {/* Product upload */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Product images
              {productFiles.length > 0 && (
                <span className="normal-case text-white/30 ml-1">({productFiles.length}/5)</span>
              )}
            </p>
            <label
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 cursor-pointer transition-colors',
                productFiles.length > 0
                  ? 'border-white/15 bg-white/5'
                  : 'border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5',
              )}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              <ImagePlus className="w-6 h-6 text-white/30" />
              <span className="text-sm text-white/50 text-center">Drop product images here</span>
              <span className="text-xs text-white/25">Up to 5 images</span>
            </label>

            {productFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {productFiles.map(({ file, previewUrl }) => (
                  <div key={file.name} className="relative group">
                    <img src={previewUrl} alt={file.name} className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                    <button
                      onClick={() => removeFile(file.name)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/60 border border-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {productFiles.length < 5 && (
                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-white/10 hover:border-violet-500/40 flex items-center justify-center cursor-pointer transition-colors">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                    <ImagePlus className="w-4 h-4 text-white/30" />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Description <span className="normal-case text-white/25">(optional)</span>
            </p>
            <input
              type="text"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g. wireless earbuds, face serum"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white disabled:opacity-30 font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                {stage === 'uploading' && 'Uploading…'}
                {stage === 'generating' && 'Generating image…'}
                {stage === 'making-videos' && 'Creating video…'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Generate video{productFiles.length > 1 ? 's' : ''}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {!avatarConfig && (
            <p className="text-xs text-amber-400/90 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
              <Link href="/profile" className="underline underline-offset-2">Complete your profile</Link> to enable generation.
            </p>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">

          {/* Empty state */}
          {!showResults && stage !== 'error' && (
            <div className="h-full min-h-[320px] flex items-center justify-center p-8">
              <div className="space-y-6 text-center max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <Clapperboard className="w-5 h-5 text-violet-400" />
                </div>
                <div className="space-y-4">
                  {[
                    { step: '1', label: 'Upload product photos', sub: 'Up to 5 images per run' },
                    { step: '2', label: 'Hit Generate', sub: 'AI places your product on your avatar' },
                    { step: '3', label: 'Watch videos appear live', sub: 'Each one ready as it finishes' },
                  ].map(({ step, label, sub }) => (
                    <div key={step} className="flex items-start gap-3 text-left">
                      <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">
                        {step}
                      </span>
                      <div>
                        <p className="text-sm text-white/80 font-medium">{label}</p>
                        <p className="text-xs text-white/40 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live results panel */}
          {showResults && (
            <div className="p-6 space-y-5">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold text-white">
                    {stage === 'done' ? 'Your videos' : 'Generating…'}
                  </h2>
                  {stage === 'generating' && (
                    <p className="text-xs text-white/40">Generating your image — video will follow</p>
                  )}
                  {stage === 'making-videos' && (
                    <p className="text-xs text-white/40">Creating video · ~1–3 min</p>
                  )}
                  {stage === 'done' && (
                    <p className="text-xs text-white/40">Ready</p>
                  )}
                </div>

                {stage === 'done' && (
                  <button onClick={handleReset} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
                    New run <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {isGenerating && (
                <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                    style={{
                      width: stage === 'generating' ? '30%'
                        : stage === 'making-videos' && videos.length === 0 ? '55%'
                        : '5%',
                    }}
                  />
                </div>
              )}

              <ImageGrid
                images={generatedImages}
                videos={videos}
                totalImages={1}
                generatingVideos={stage === 'making-videos'}
                videoProgress={videoProgress?.current ?? 0}
              />
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{errorMsg}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white disabled:opacity-30 rounded-xl"
                >
                  <span className="flex items-center gap-2">Try again <ArrowRight className="w-4 h-4" /></span>
                </Button>
                <button onClick={handleReset} className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  Clear and start over
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
