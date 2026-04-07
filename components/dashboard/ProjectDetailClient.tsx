'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Copy, Trash2, Film, Download, X, Check,
  ChevronLeft, ChevronRight, Sparkles, Clock, FolderOpen,
} from 'lucide-react'
import { TikTokShareButton } from '@/components/dashboard/TikTokShareButton'
import type { ProjectDetail, ProjectImage, ProjectVideo } from '@/lib/data/projects'

interface Props {
  project: ProjectDetail
  images: ProjectImage[]
  videos: ProjectVideo[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── InlineProjectName ──────────────────────────────────────────────────────────

function InlineProjectName({ name, onSave }: { name: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  function start() { setDraft(name); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }
  function commit() {
    const v = draft.trim()
    if (v && v !== name) onSave(v)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={commit}
          className="text-xl font-bold text-white bg-white/10 border border-brand-accent/40 rounded-lg px-3 py-1 outline-none w-full max-w-xs"
          maxLength={120}
          autoFocus
        />
        <button onClick={commit} className="p-1.5 rounded-lg text-green-400 hover:bg-white/10"><Check className="w-4 h-4" /></button>
        <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-white/40 hover:bg-white/10"><X className="w-4 h-4" /></button>
      </div>
    )
  }

  return (
    <button onClick={start} className="group flex items-center gap-2 text-left">
      <h1 className="text-xl font-bold text-white group-hover:text-white/80 transition-colors">{name}</h1>
      <Pencil className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
    </button>
  )
}

// ── ImageLightbox ──────────────────────────────────────────────────────────────

function ImageLightbox({ images, startIdx, onClose }: {
  images: (ProjectImage & { displayUrl: string })[]
  startIdx: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIdx)
  const img = images[idx]
  if (!img) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-sm w-full flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            Round {img.generation_round} · Image {img.position + 1}
          </p>
          <div className="flex items-center gap-2">
            {img.displayUrl && (
              <a
                href={img.displayUrl}
                download={`generation-${img.generation_round}-${img.position + 1}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-3 py-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
          <img src={img.displayUrl} alt="" className="w-full object-contain max-h-[75vh]" />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white/60 hover:text-white hover:bg-black/80 disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))}
                disabled={idx === images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white/60 hover:text-white hover:bg-black/80 disabled:opacity-20 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, isPending }: {
  name: string; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-brand-bg p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Delete project?</p>
            <p className="text-xs text-white/40 mt-1">
              <span className="text-white/60">{name}</span> and all generated images will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/8 text-sm transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending} className="flex-1 h-9 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 transition-all">
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function ProjectDetailClient({ project: initialProject, images, videos }: Props) {
  const [project, setProject] = useState(initialProject)
  const [lightbox, setLightbox] = useState<{ imgs: (ProjectImage & { displayUrl: string })[]; idx: number } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const generatedImages = images.filter(img => img.kind === 'generated')
  const rounds = Array.from(new Set(generatedImages.map(img => img.generation_round)))
    .sort((a, b) => b - a)

  function getDisplayUrl(img: ProjectImage) {
    return img.signedUrl ?? img.url ?? ''
  }

  function openLightbox(round: number, posIdx: number) {
    const roundImgs = generatedImages
      .filter(img => img.generation_round === round)
      .sort((a, b) => a.position - b.position)
      .map(img => ({ ...img, displayUrl: getDisplayUrl(img) }))
    setLightbox({ imgs: roundImgs, idx: posIdx })
  }

  function handleRename(name: string) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const { project: updated } = await res.json()
        setProject(p => ({ ...p, name: updated.name }))
      }
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        const { project: dup } = await res.json()
        window.open(`/projects/${dup.id}`, '_blank')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (res.ok) window.location.href = '/projects'
    })
  }

  const videosByImageId = new Map<string, ProjectVideo[]>()
  for (const v of videos) {
    if (v.image_id) {
      if (!videosByImageId.has(v.image_id)) videosByImageId.set(v.image_id, [])
      videosByImageId.get(v.image_id)!.push(v)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all -ml-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <InlineProjectName name={project.name} onSave={handleRename} />
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-white/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {formatDate(project.updated_at)}
              </p>
              {project.folder_id && (
                <p className="text-xs text-white/30 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  In folder
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            disabled={isPending}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-sm transition-all border border-white/[0.08] disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 text-white/40 hover:text-red-400 border border-white/[0.06] transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {generatedImages.length === 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-white/20 mx-auto" />
          <p className="text-sm text-white/40">No images yet.</p>
          <p className="text-xs text-white/25">Generate from the Studio to populate this project.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-2 h-9 px-4 rounded-xl bg-brand-accent text-black text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Open Studio
          </Link>
        </div>
      )}

      {/* Generation rounds */}
      {rounds.map((round, rIdx) => {
        const roundImgs = generatedImages
          .filter(img => img.generation_round === round)
          .sort((a, b) => a.position - b.position)

        return (
          <section key={round}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/30">
                {rIdx === 0 ? 'Latest' : `Round ${round}`}
              </span>
              <span className="text-[11px] text-white/20">
                {formatDate(roundImgs[0]?.created_at ?? '')}
              </span>
              {rIdx === 0 && rounds.length > 1 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20 font-medium">
                  Latest
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {roundImgs.map((img, posIdx) => {
                const imgVideos = videosByImageId.get(img.id) ?? []
                const videoUrl = imgVideos.find(v => v.video_url)?.video_url ?? null
                const storageFileForVideo = imgVideos.find(v => v.video_url)

                return (
                  <div key={img.id} className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-black">
                    <button
                      onClick={() => openLightbox(round, posIdx)}
                      className="block w-full aspect-[9/16] relative"
                    >
                      <img
                        src={getDisplayUrl(img)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {videoUrl && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
                          <Film className="w-3 h-3 text-purple-400" />
                          <span className="text-[10px] text-purple-300 font-medium">Video</span>
                        </div>
                      )}
                    </button>

                    {/* Hover actions */}
                    <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      {videoUrl && (
                        <div className="flex gap-1.5">
                          <a
                            href={videoUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] transition-all"
                          >
                            <Download className="w-3 h-3" /> Video
                          </a>
                          {storageFileForVideo && (
                            <TikTokShareButton
                              storageFileId={storageFileForVideo.id}
                              fileName={`video-${img.id.slice(0, 6)}.mp4`}
                              fileUrl={videoUrl}
                              buttonLabel="TikTok"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {lightbox && (
        <ImageLightbox
          images={lightbox.imgs}
          startIdx={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          name={project.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isPending={isPending}
        />
      )}
    </div>
  )
}
