'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

interface GeneratedImage { id: string; url: string }
interface VideoResult { imageId: string; videoUrl: string; filename: string }

interface Props {
  initialAvatarConfig: AvatarConfig | null
  initialBackgroundConfig: BackgroundConfig | null
}

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

interface ProductFile {
  file: File
  previewUrl: string
}

export function GeneratePanel({ initialAvatarConfig, initialBackgroundConfig }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [productDescription, setProductDescription] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'making-videos' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [avatarImgError, setAvatarImgError] = useState(false)

  const avatarThumb = !avatarImgError && initialAvatarConfig
    ? (initialAvatarConfig.type === 'custom' ? initialAvatarConfig.faceUrl : null)
    : null

  const bgThumb = initialBackgroundConfig?.thumbnailUrl ?? null

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
    setStatus('uploading')
    setErrorMsg('')
    setGeneratedImages([])
    setVideos([])

    try {
      const fd = new FormData()
      fd.append('usePreferences', 'true')
      if (projectId) fd.append('projectId', projectId)
      productFiles.forEach(({ file }) => fd.append('products', file))

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
      const pid: string = uploadData.projectId
      setProjectId(pid)

      setStatus('generating')
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: pid, productDescription }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error ?? 'Generation failed')

      const images: GeneratedImage[] = genData.images
      setGeneratedImages(images)

      setStatus('making-videos')
      const motionPrompt = buildMotionPrompt(
        initialAvatarConfig?.gender ?? 'man',
        initialBackgroundConfig?.roomAesthetic ?? 'masculine',
      )

      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: pid,
          imageIds: images.map((img) => img.id),
          imageUrls: images.map((img) => img.url),
          motionPrompt,
        }),
      })
      const exportData = await exportRes.json()
      if (!exportRes.ok) throw new Error(exportData.error ?? 'Video generation failed')

      setVideos(exportData.videos.map((v: { videoUrl: string }, i: number) => ({
        imageId: images[i]?.id ?? String(i),
        videoUrl: v.videoUrl,
        filename: `affilify-video-${i + 1}.mp4`,
      })))
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStatus('error')
    }
  }

  function handleReset() {
    productFiles.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    setProductFiles([])
    setGeneratedImages([])
    setVideos([])
    setProjectId(null)
    setStatus('idle')
    setErrorMsg('')
  }

  const isGenerating = status === 'uploading' || status === 'generating' || status === 'making-videos'
  const canGenerate = productFiles.length > 0 && !!initialAvatarConfig && !!initialBackgroundConfig && !isGenerating

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Generate</h1>
        <p className="text-sm text-white/50">Upload product images and create AI videos in seconds.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left panel — inputs */}
        <div className="w-full lg:w-72 lg:shrink-0 space-y-4">

          {/* Setup chips */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Your setup</p>

            {/* Avatar chip */}
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
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 text-sm">
                    {initialAvatarConfig?.gender === 'woman' ? '♀' : '♂'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white capitalize leading-tight">
                    {initialAvatarConfig
                      ? `${initialAvatarConfig.type === 'preset' ? 'AI model' : 'Custom'} · ${initialAvatarConfig.gender}`
                      : 'No avatar'}
                  </p>
                  <p className="text-xs text-white/40 capitalize mt-0.5">{initialAvatarConfig?.type ?? 'Not set'}</p>
                </div>
              </div>
              <Link href="/profile" className="text-xs text-white/50 hover:text-white transition-colors font-medium">
                Change
              </Link>
            </div>

            {/* Background chip */}
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3.5 py-3">
              <div className="flex items-center gap-3">
                {bgThumb ? (
                  <img
                    src={bgThumb}
                    alt="Background"
                    className="w-9 h-9 rounded-md object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-white/40 text-xs font-medium">
                    bg
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white capitalize leading-tight">
                    {initialBackgroundConfig?.roomAesthetic ?? 'No background'}
                  </p>
                  <p className="text-xs text-white/40 capitalize mt-0.5">{initialBackgroundConfig?.type ?? 'Not set'}</p>
                </div>
              </div>
              <Link href="/profile" className="text-xs text-white/50 hover:text-white transition-colors font-medium">
                Change
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/8" />

          {/* Product upload */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Product images</p>
            <label
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 cursor-pointer transition-colors',
                productFiles.length > 0
                  ? 'border-white/15 bg-white/5'
                  : 'border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-2xl text-white/30 leading-none">+</span>
              <span className="text-sm text-white/50 text-center">
                Drop product images here
              </span>
              <span className="text-xs text-white/25">Up to 5 images</span>
            </label>

            {productFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {productFiles.map(({ file, previewUrl }) => (
                  <div key={file.name} className="relative group">
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-14 h-14 rounded-lg object-cover border border-white/10"
                    />
                    <button
                      onClick={() => removeFile(file.name)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 text-white text-[10px] leading-none flex items-center justify-center transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {productFiles.length < 5 && (
                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-white/10 hover:border-violet-500/40 flex items-center justify-center cursor-pointer transition-colors">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                    <span className="text-white/30 text-lg leading-none">+</span>
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
                {status === 'uploading' && 'Uploading…'}
                {status === 'generating' && 'Generating images…'}
                {status === 'making-videos' && 'Creating videos…'}
              </span>
            ) : (
              'Generate videos →'
            )}
          </Button>

          {!initialAvatarConfig && (
            <p className="text-xs text-amber-400/90 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
              <Link href="/profile" className="underline underline-offset-2">Complete your profile</Link> to enable generation.
            </p>
          )}
        </div>

        {/* Right panel — results / empty state */}
        <div className="flex-1 min-w-0 rounded-2xl border border-white/8 bg-white/[0.03]">

          {status === 'idle' && generatedImages.length === 0 && (
            <div className="h-full min-h-[320px] flex items-center justify-center p-8">
              <div className="space-y-6 text-center max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div className="space-y-4">
                  {[
                    { step: '1', label: 'Upload product photos', sub: 'Up to 5 images per run' },
                    { step: '2', label: 'Hit Generate', sub: 'AI places your product on your avatar' },
                    { step: '3', label: 'Download your videos', sub: 'Ready-to-post TikTok clips' },
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

          {isGenerating && (
            <div className="h-full min-h-[320px] flex items-center justify-center p-8">
              <div className="space-y-4 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin mx-auto" />
                <div>
                  <p className="text-sm text-white/80 font-medium">
                    {status === 'uploading' && 'Uploading files…'}
                    {status === 'generating' && 'Generating AI images…'}
                    {status === 'making-videos' && 'Creating your videos…'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {status === 'making-videos' ? 'This takes 1–3 minutes' : 'Hang tight'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
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
                  Try again →
                </Button>
                <button
                  onClick={handleReset}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Clear and start over
                </button>
              </div>
            </div>
          )}

          {(status === 'done' || videos.length > 0) && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Your videos</h2>
                <button onClick={handleReset} className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  Generate more →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((v, i) => (
                  <div key={v.imageId} className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] bg-white/5">
                      <video src={v.videoUrl} controls playsInline className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Video {i + 1}</span>
                      <a
                        href={v.videoUrl}
                        download={v.filename}
                        className="text-xs text-white/70 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-md px-2 py-0.5"
                      >
                        ↓ Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
