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

// Auto-pick a motion prompt based on avatar gender + background aesthetic
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

export function GeneratePanel({ initialAvatarConfig, initialBackgroundConfig }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [productFiles, setProductFiles] = useState<File[]>([])
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
    const files = Array.from(e.target.files ?? []).slice(0, 5)
    setProductFiles(files)
    e.target.value = ''
  }

  function removeFile(name: string) {
    setProductFiles((prev) => prev.filter((f) => f.name !== name))
  }

  async function handleGenerate() {
    if (!productFiles.length) return
    setStatus('uploading')
    setErrorMsg('')
    setGeneratedImages([])
    setVideos([])

    try {
      // Step 1: Upload products, use preferences for avatar
      const fd = new FormData()
      fd.append('usePreferences', 'true')
      if (projectId) fd.append('projectId', projectId)
      productFiles.forEach((f) => fd.append('products', f))

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
      const pid: string = uploadData.projectId
      setProjectId(pid)

      // Step 2: Generate images
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

      // Step 3: Auto-generate videos for all images
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
    setGeneratedImages([])
    setVideos([])
    setProjectId(null)
    setStatus('idle')
    setErrorMsg('')
  }

  const isGenerating = status === 'uploading' || status === 'generating' || status === 'making-videos'
  const canGenerate = productFiles.length > 0 && !!initialAvatarConfig && !!initialBackgroundConfig && !isGenerating

  return (
    <div className="flex gap-6 h-full min-h-[70vh]">
      {/* Left panel — inputs */}
      <div className="w-72 shrink-0 space-y-5">
        {/* Avatar chip */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5">
          <div className="flex items-center gap-3">
            {avatarThumb ? (
              <img
                src={avatarThumb}
                alt="Avatar"
                onError={() => setAvatarImgError(true)}
                className="w-9 h-9 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs">
                {initialAvatarConfig?.gender === 'woman' ? '♀' : '♂'}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-white capitalize">
                {initialAvatarConfig?.style ?? 'No avatar'} · {initialAvatarConfig?.gender ?? ''}
              </p>
              <p className="text-[10px] text-zinc-500 capitalize">{initialAvatarConfig?.type ?? 'Not set'}</p>
            </div>
          </div>
          <Link href="/profile" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Change
          </Link>
        </div>

        {/* Background chip */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5">
          <div className="flex items-center gap-3">
            {bgThumb ? (
              <img
                src={bgThumb}
                alt="Background"
                className="w-9 h-9 rounded-md object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-md bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs">
                bg
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-white capitalize">
                {initialBackgroundConfig?.roomAesthetic ?? 'No background'}
              </p>
              <p className="text-[10px] text-zinc-500 capitalize">{initialBackgroundConfig?.type ?? 'Not set'}</p>
            </div>
          </div>
          <Link href="/profile" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Change
          </Link>
        </div>

        {/* Product upload */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Product images</p>
          <label
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
              productFiles.length > 0 ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500',
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
            <span className="text-2xl text-zinc-600">+</span>
            <span className="text-xs text-zinc-500 text-center">
              Drop product images here<br />1–5 images
            </span>
          </label>

          {productFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {productFiles.map((f) => (
                <div key={f.name} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1">
                  <span className="text-xs text-zinc-300 max-w-[100px] truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-zinc-500 hover:text-zinc-200 text-xs leading-none ml-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional description */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Product description <span className="normal-case">(optional)</span></p>
          <input
            type="text"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="e.g. wireless earbuds, face serum"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40"
        >
          Generate videos →
        </Button>

        {!initialAvatarConfig && (
          <p className="text-xs text-yellow-500">
            <Link href="/profile" className="underline">Complete your profile</Link> to enable generation.
          </p>
        )}
      </div>

      {/* Right panel — results */}
      <div className="flex-1 min-w-0">
        {status === 'idle' && generatedImages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-zinc-600 text-sm">Upload product images and hit Generate</p>
              <p className="text-zinc-700 text-xs">Your videos will appear here</p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="h-full flex items-center justify-center">
            <div className="space-y-3 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-600 border-t-white animate-spin mx-auto" />
              <p className="text-sm text-zinc-300">
                {status === 'uploading' && 'Uploading files…'}
                {status === 'generating' && 'Generating 4 AI images…'}
                {status === 'making-videos' && 'Creating videos… (this takes 1–3 min)'}
              </p>
              <p className="text-xs text-zinc-600">Hang tight</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button onClick={handleReset} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Try again
            </button>
          </div>
        )}

        {(status === 'done' || videos.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Your videos</h2>
              <button onClick={handleReset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Generate more variations
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((v, i) => (
                <div key={v.imageId} className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-zinc-700 aspect-[9/16] bg-zinc-900">
                    <video
                      src={v.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Video {i + 1}</span>
                    <a
                      href={v.videoUrl}
                      download={v.filename}
                      className="text-xs text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 rounded px-2 py-0.5"
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
  )
}
