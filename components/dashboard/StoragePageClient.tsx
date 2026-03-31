'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { HardDrive, Trash2, Download, ImageIcon, Video, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { StorageFile, StoragePageData } from '@/lib/data/dashboard'

function Lightbox({ file, onClose }: { file: StorageFile; onClose: () => void }) {
  const isImage = file.file_type !== 'generated_video'
  const isVideo = file.file_type === 'generated_video'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/80 truncate pr-4">{file.file_name}</p>
          <div className="flex items-center gap-2 shrink-0">
            {file.public_url && (
              <a
                href={file.public_url}
                download={file.file_name}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-3 py-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center max-h-[80vh]">
          {isImage && file.public_url && <img src={file.public_url} alt={file.file_name} className="max-w-full max-h-[80vh] object-contain" />}
          {isVideo && file.public_url && <video src={file.public_url} controls autoPlay playsInline className="max-w-full max-h-[80vh]" />}
          {!file.public_url && <div className="p-16 text-center text-white/30 text-sm">No preview available</div>}
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ fileName, onConfirm, onCancel, isPending }: {
  fileName: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-brand-bg p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Delete file?</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              <span className="text-white/60">{fileName}</span> will be permanently deleted. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/8 text-sm">Cancel</Button>
          <Button onClick={onConfirm} disabled={isPending} className="flex-1 h-9 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const FILE_TYPE_LABELS: Record<StorageFile['file_type'], string> = {
  product_image: 'Product',
  generated_image: 'Generated Image',
  generated_video: 'Generated Video',
  face_upload: 'Face Upload',
}

const FILE_TYPE_ICONS: Record<StorageFile['file_type'], React.ReactNode> = {
  product_image: <ImageIcon className="w-4 h-4 text-brand-accent" />,
  generated_image: <ImageIcon className="w-4 h-4 text-brand-accent/70" />,
  generated_video: <Video className="w-4 h-4 text-brand-accent" />,
  face_upload: <ImageIcon className="w-4 h-4 text-brand-text/40" />,
}

export function StoragePageClient({ initialData }: { initialData: StoragePageData }) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<StorageFile | null>(null)
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null)

  async function load() {
    const res = await fetch('/api/storage')
    const json = await res.json()
    setData(json)
  }

  function confirmDelete() {
    if (!confirmDeleteFile) return
    const id = confirmDeleteFile.id
    setDeletingId(id)
    setConfirmDeleteFile(null)
    startTransition(async () => {
      await fetch(`/api/storage/${id}`, { method: 'DELETE' })
      setDeletingId(null)
      await load()
    })
  }

  const usedPercent = data.limitBytes > 0 ? Math.min(100, (data.usedBytes / data.limitBytes) * 100) : 0
  const nearLimit = usedPercent >= 80

  return (
    <div className="space-y-8 max-w-4xl">
      {previewFile && <Lightbox file={previewFile} onClose={() => setPreviewFile(null)} />}
      {confirmDeleteFile && (
        <DeleteConfirmModal
          fileName={confirmDeleteFile.file_name}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteFile(null)}
          isPending={isPending}
        />
      )}

      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30">Files</p>
        <h1 className="text-[32px] font-black uppercase text-brand-text leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Storage</h1>
        <p className="text-sm text-brand-text/40">All your generated content and uploaded files.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-brand-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-brand-text">Storage Used</p>
              <p className="text-xs text-brand-text/40">
                {formatBytes(data.usedBytes)}
                {data.limitBytes > 0 ? ` of ${formatBytes(data.limitBytes)}` : ''}
              </p>
            </div>
          </div>
          {!data.planId && <Link href="/billing" className="text-xs text-brand-accent hover:text-brand-accent-hover transition-colors">Subscribe for storage -&gt;</Link>}
        </div>

        {data.limitBytes > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500', nearLimit ? 'bg-amber-500' : 'bg-brand-accent')} style={{ width: `${usedPercent}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-brand-text/30">{usedPercent.toFixed(1)}% used</p>
              <p className="text-xs text-brand-text/30">{formatBytes(data.limitBytes - data.usedBytes)} free</p>
            </div>
          </div>
        )}

        {nearLimit && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Storage is almost full. Delete old files or <Link href="/billing" className="underline underline-offset-2 hover:text-amber-300">upgrade your plan</Link>.
          </div>
        )}
      </div>

      {data.files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-white/20" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-brand-text/50">No files yet</p>
            <p className="text-xs text-brand-text/30">Files will appear here after you generate content.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.files.map((file) => (
            <div key={file.id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12 px-4 py-3 transition-all cursor-pointer group" onClick={() => setPreviewFile(file)}>
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
                {file.public_url && (file.file_type === 'generated_image' || file.file_type === 'product_image' || file.file_type === 'face_upload') ? (
                  <img src={file.public_url} alt={file.file_name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  FILE_TYPE_ICONS[file.file_type]
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-brand-text/80 font-medium truncate">{file.file_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-brand-text/30 border border-white/8 rounded-full px-1.5 py-0.5">{FILE_TYPE_LABELS[file.file_type]}</span>
                  <span className="text-[10px] text-brand-text/25">{formatBytes(file.size_bytes)}</span>
                  <span className="text-[10px] text-brand-text/25">{new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {file.public_url ? (
                  <a href={file.public_url} download={file.file_name} onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg text-brand-text/25 hover:text-brand-text hover:bg-white/5 transition-all" title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div className="p-2 opacity-20">
                    <Download className="w-3.5 h-3.5 text-brand-text/30" />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteFile(file) }}
                  disabled={isPending && deletingId === file.id}
                  className="p-2 rounded-lg text-brand-text/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
