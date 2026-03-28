'use client'

import { useEffect, useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { HardDrive, Trash2, Download, ImageIcon, Video, AlertTriangle, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function Lightbox({ file, onClose }: { file: StorageFile; onClose: () => void }) {
  const isImage = file.file_type !== 'generated_video'
  const isVideo = file.file_type === 'generated_video'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center max-h-[80vh]">
          {isImage && file.public_url && (
            <img
              src={file.public_url}
              alt={file.file_name}
              className="max-w-full max-h-[80vh] object-contain"
            />
          )}
          {isVideo && file.public_url && (
            <video
              src={file.public_url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[80vh]"
            />
          )}
          {!file.public_url && (
            <div className="p-16 text-center text-white/30 text-sm">No preview available</div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StorageFile {
  id: string
  file_name: string
  file_type: 'product_image' | 'generated_image' | 'generated_video' | 'face_upload'
  storage_path: string
  public_url: string | null
  size_bytes: number
  created_at: string
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
  product_image: <ImageIcon className="w-4 h-4 text-blue-400" />,
  generated_image: <ImageIcon className="w-4 h-4 text-fuchsia-400" />,
  generated_video: <Video className="w-4 h-4 text-violet-400" />,
  face_upload: <ImageIcon className="w-4 h-4 text-pink-400" />,
}

export default function StoragePage() {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [usedBytes, setUsedBytes] = useState(0)
  const [limitBytes, setLimitBytes] = useState(0)
  const [planId, setPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null)

  async function load() {
    const res = await fetch('/api/storage')
    const data = await res.json()
    setFiles(data.files ?? [])
    setUsedBytes(data.usedBytes ?? 0)
    setLimitBytes(data.limitBytes ?? 0)
    setPlanId(data.planId ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await fetch(`/api/storage/${id}`, { method: 'DELETE' })
      setDeletingId(null)
      load()
    })
  }

  const usedPercent = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0
  const nearLimit = usedPercent >= 80

  return (
    <div className="space-y-8 max-w-4xl">
      {previewFile && <Lightbox file={previewFile} onClose={() => setPreviewFile(null)} />}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Storage</h1>
        <p className="text-sm text-white/50">All your generated content and uploaded files.</p>
      </div>

      {/* Storage usage card */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Storage Used</p>
              <p className="text-xs text-white/40">
                {formatBytes(usedBytes)}
                {limitBytes > 0 ? ` of ${formatBytes(limitBytes)}` : ''}
              </p>
            </div>
          </div>
          {!planId && (
            <Link
              href="/billing"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Subscribe for storage →
            </Link>
          )}
        </div>

        {limitBytes > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  nearLimit ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
                )}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/30">{usedPercent.toFixed(1)}% used</p>
              <p className="text-xs text-white/30">{formatBytes(limitBytes - usedBytes)} free</p>
            </div>
          </div>
        )}

        {nearLimit && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Storage is almost full. Consider deleting old files or upgrading your plan.
          </div>
        )}
      </div>

      {/* Files list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/8 animate-pulse" />)}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-white/20" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/50">No files yet</p>
            <p className="text-xs text-white/30">Files will appear here after you generate content.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              onClick={() => setPreviewFile(file)}
            >
              {/* Thumbnail or icon */}
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
                {file.public_url && (file.file_type === 'generated_image' || file.file_type === 'product_image' || file.file_type === 'face_upload') ? (
                  <img
                    src={file.public_url}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  FILE_TYPE_ICONS[file.file_type]
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-white/80 font-medium truncate">{file.file_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-white/30 border border-white/8 rounded-full px-1.5 py-0.5">
                    {FILE_TYPE_LABELS[file.file_type]}
                  </span>
                  <span className="text-[10px] text-white/25">{formatBytes(file.size_bytes)}</span>
                  <span className="text-[10px] text-white/25">
                    {new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {file.public_url ? (
                  <a
                    href={file.public_url}
                    download={file.file_name}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div className="p-2 opacity-20" onClick={(e) => e.stopPropagation()} title="No download available">
                    <Download className="w-3.5 h-3.5 text-white/30" />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Delete this file? This cannot be undone.')) handleDelete(file.id) }}
                  disabled={isPending && deletingId === file.id}
                  className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
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
