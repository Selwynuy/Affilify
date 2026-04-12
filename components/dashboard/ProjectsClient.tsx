'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  FolderOpen, Folder, Plus, MoreHorizontal, Pencil, Copy, Trash2, FolderInput,
  Film, Sparkles, X, Check, ChevronRight, LayoutGrid, Clock, CheckSquare, Square, HardDrive, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectFolder, ProjectListItem, ProjectStorageSummary } from '@/lib/data/projects'

interface Props {
  initialProjects: ProjectListItem[]
  initialFolders: ProjectFolder[]
  storageSummary: ProjectStorageSummary
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ── InlineEdit ─────────────────────────────────────────────────────────────────

function InlineEdit({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.select() }, [])
  function commit() {
    const t = draft.trim()
    if (t && t !== value) onSave(t); else onCancel()
  }
  return (
    <div className="flex items-center gap-1 w-full" onClick={e => e.preventDefault()}>
      <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel() }}
        className="flex-1 bg-white/10 border border-brand-accent/40 text-white text-sm rounded-lg px-2 py-1 outline-none min-w-0"
        maxLength={120} />
      <button onClick={commit} className="p-1 rounded-md text-green-400 hover:bg-white/10"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={onCancel} className="p-1 rounded-md text-white/40 hover:bg-white/10"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ── ProjectCard ────────────────────────────────────────────────────────────────

function ProjectCard({
  project, folders, selected, selecting,
  onSelect, onRename, onDuplicate, onDelete, onMove,
}: {
  project: ProjectListItem
  folders: ProjectFolder[]
  selected: boolean
  selecting: boolean
  onSelect: (id: string, e: React.MouseEvent) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, folderId: string | null) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setShowMoveMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      className={cn(
        'group relative rounded-2xl border transition-all flex flex-col cursor-pointer',
        selected
          ? 'border-brand-accent/60 bg-brand-accent/[0.07] ring-1 ring-brand-accent/30'
          : 'border-white/[0.07] bg-white/3 hover:border-white/13 hover:bg-white/5',
      )}
      onClick={selecting ? e => onSelect(project.id, e) : undefined}
    >
      {/* Selection checkbox — always visible when selecting, hover otherwise */}
      <button
        className={cn(
          'absolute top-2 left-2 z-10 transition-all',
          selecting || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={e => { e.preventDefault(); e.stopPropagation(); onSelect(project.id, e) }}
      >
        {selected
          ? <CheckSquare className="w-5 h-5 text-brand-accent drop-shadow-lg" />
          : <Square className="w-5 h-5 text-white/50 hover:text-white drop-shadow-lg" />}
      </button>

      {/* Thumbnail */}
      <Link
        href={`/projects/${project.id}`}
        className="block relative aspect-9/16 bg-black/40 shrink-0 overflow-hidden max-h-64 rounded-t-2xl"
        onClick={e => { if (selecting) e.preventDefault() }}
      >
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white/15" />
          </div>
        )}
        {project.status === 'videos_ready' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Film className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-300 font-medium">Video</span>
          </div>
        )}
      </Link>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-start justify-between gap-2 flex-1 rounded-b-2xl bg-inherit">
        <div className="min-w-0 flex-1">
          {editing ? (
            <InlineEdit value={project.name}
              onSave={name => { onRename(project.id, name); setEditing(false) }}
              onCancel={() => setEditing(false)} />
          ) : (
            <Link href={`/projects/${project.id}`} className="block" onClick={e => { if (selecting) e.preventDefault() }}>
              <p className="text-sm font-medium text-white truncate leading-tight">{project.name}</p>
              <p className="text-[11px] mt-0.5 flex items-center gap-1 text-white/30">
                <Clock className="w-3 h-3 shrink-0" />
                {formatDate(project.updated_at)}
              </p>
            </Link>
          )}
        </div>

        {/* Context menu — hidden while selecting */}
        {!selecting && (
          <div ref={menuRef} className="relative shrink-0">
            <button onClick={() => setMenuOpen(o => !o)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-50 w-44 rounded-xl border border-white/10 bg-[#18181f] shadow-2xl py-1 text-sm">
                <button onClick={() => { setEditing(true); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5">
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button onClick={() => { onDuplicate(project.id); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                {folders.length > 0 && (
                  <button onClick={() => setShowMoveMenu(m => !m)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5">
                    <FolderInput className="w-3.5 h-3.5" /> Move to folder
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                )}
                {showMoveMenu && (
                  <div className="border-t border-white/8 pt-1 max-h-36 overflow-y-auto">
                    <button onClick={() => { onMove(project.id, null); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5">
                      <LayoutGrid className="w-3.5 h-3.5" /> All Projects
                    </button>
                    {folders.map(f => (
                      <button key={f.id} onClick={() => { onMove(project.id, f.id); setMenuOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5">
                        <Folder className="w-3.5 h-3.5" /><span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t border-white/8 mt-1 pt-1">
                  <button onClick={() => { onDelete(project.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

function DeleteModal({ count, onConfirm, onCancel, isPending }: {
  count: number; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-brand-bg p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Delete {count} project{count !== 1 ? 's' : ''}?
            </p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              All generated images for {count === 1 ? 'this project' : 'these projects'} will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/8 text-sm transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 h-9 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 transition-all">
            {isPending ? 'Deleting…' : `Delete ${count}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function ProjectsClient({ initialProjects, initialFolders, storageSummary }: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects)
  const [folders, setFolders] = useState<ProjectFolder[]>(initialFolders)
  const [activeFolderId, setActiveFolderId] = useState<string | null | 'all'>('all')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)
  const lastSelectedRef = useRef<string | null>(null)

  // Modals / forms
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const usedPercent = storageSummary.limitBytes > 0
    ? Math.min(100, (storageSummary.usedBytes / storageSummary.limitBytes) * 100)
    : 0
  const nearLimit = usedPercent >= 80
  const unfiledCount = projects.filter(p => !p.folder_id).length

  const visibleProjects = activeFolderId === 'all'
    ? projects
    : activeFolderId === null
      ? projects.filter(p => !p.folder_id)
      : projects.filter(p => p.folder_id === activeFolderId)

  const selectedCount = selectedIds.size
  const allVisibleSelected = visibleProjects.length > 0 && visibleProjects.every(p => selectedIds.has(p.id))

  // ── Selection ops ─────────────────────────────────────────────────────────────

  function handleSelect(id: string, e: React.MouseEvent) {
    if (!selecting) setSelecting(true)

    // Shift-click range selection
    if (e.shiftKey && lastSelectedRef.current) {
      const ids = visibleProjects.map(p => p.id)
      const a = ids.indexOf(lastSelectedRef.current)
      const b = ids.indexOf(id)
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a]
        const range = ids.slice(lo, hi + 1)
        setSelectedIds(prev => {
          const next = new Set(prev)
          range.forEach(rid => next.add(rid))
          return next
        })
        return
      }
    }

    const isLastSelected = selectedIds.has(id) && selectedIds.size === 1
    if (isLastSelected) setSelecting(false)

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    lastSelectedRef.current = id
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleProjects.forEach(p => next.delete(p.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleProjects.forEach(p => next.add(p.id))
        return next
      })
      setSelecting(true)
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSelecting(false)
  }

  // ── Delete (single + bulk) ────────────────────────────────────────────────────

  async function deleteOne(id: string) {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(p => p.filter(x => x.id !== id))
  }

  function handleDeleteConfirm() {
    const ids = singleDeleteTarget
      ? [singleDeleteTarget]
      : Array.from(selectedIds)

    startTransition(async () => {
      await Promise.all(ids.map(id => deleteOne(id)))
      setSingleDeleteTarget(null)
      setShowDeleteModal(false)
      clearSelection()
    })
  }

  // ── Folder ops ────────────────────────────────────────────────────────────────

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const res = await fetch('/api/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const { folder } = await res.json()
      setFolders(f => [...f, folder])
      setNewFolderName(''); setShowNewFolder(false)
    }
  }

  async function renameFolder(id: string, name: string) {
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const { folder } = await res.json()
      setFolders(f => f.map(x => x.id === id ? folder : x))
    }
    setEditingFolder(null)
  }

  async function deleteFolder(id: string) {
    const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFolders(f => f.filter(x => x.id !== id))
      setProjects(p => p.map(x => x.folder_id === id ? { ...x, folder_id: null } : x))
      if (activeFolderId === id) setActiveFolderId('all')
    }
  }

  // ── Project ops ───────────────────────────────────────────────────────────────

  function handleRename(id: string, name: string) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const { project } = await res.json()
        setProjects(p => p.map(x => x.id === id ? { ...x, name: project.name } : x))
      }
    })
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        const { project } = await res.json()
        setProjects(p => [project, ...p])
      }
    })
  }

  function handleMove(id: string, folderId: string | null) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_id: folderId }),
      })
      if (res.ok) setProjects(p => p.map(x => x.id === id ? { ...x, folder_id: folderId } : x))
    })
  }

  const deleteModalCount = singleDeleteTarget ? 1 : selectedCount

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Folder sidebar */}
      <aside className="hidden md:flex flex-col w-48 shrink-0 gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 px-2 mb-1">Folders</p>

        <button onClick={() => setActiveFolderId('all')}
          className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all text-left',
            activeFolderId === 'all' ? 'bg-brand-accent/10 text-brand-accent font-medium' : 'text-white/40 hover:text-white hover:bg-white/5')}>
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          All Projects
          <span className="ml-auto text-[10px] opacity-60">{projects.length}</span>
        </button>

        {unfiledCount > 0 && (
          <button onClick={() => setActiveFolderId(null)}
            className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all text-left',
              activeFolderId === null ? 'bg-brand-accent/10 text-brand-accent font-medium' : 'text-white/40 hover:text-white hover:bg-white/5')}>
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            Unfiled
            <span className="ml-auto text-[10px] opacity-60">{unfiledCount}</span>
          </button>
        )}

        {folders.map(f => (
          <div key={f.id} className="group/folder relative">
            {editingFolder === f.id ? (
              <div className="px-2.5 py-1.5">
                <InlineEdit value={f.name} onSave={name => renameFolder(f.id, name)} onCancel={() => setEditingFolder(null)} />
              </div>
            ) : (
              <button onClick={() => setActiveFolderId(f.id)}
                className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all text-left',
                  activeFolderId === f.id ? 'bg-brand-accent/10 text-brand-accent font-medium' : 'text-white/40 hover:text-white hover:bg-white/5')}>
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-[10px] opacity-60 shrink-0">{projects.filter(p => p.folder_id === f.id).length}</span>
              </button>
            )}
            {editingFolder !== f.id && (
              <div className="absolute right-0.5 top-1/2 -translate-y-1/2 hidden group-hover/folder:flex items-center gap-0.5">
                <button onClick={e => { e.stopPropagation(); setEditingFolder(f.id) }}
                  className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10"><Pencil className="w-2.5 h-2.5" /></button>
                <button onClick={e => { e.stopPropagation(); deleteFolder(f.id) }}
                  className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            )}
          </div>
        ))}

        {showNewFolder ? (
          <div className="px-2.5 py-1.5 mt-1">
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
              placeholder="Folder name"
              className="w-full bg-white/10 border border-white/20 text-white text-xs rounded-lg px-2 py-1.5 outline-none placeholder:text-white/30"
              maxLength={120} />
            <div className="flex gap-1 mt-1">
              <button onClick={createFolder} className="flex-1 text-[11px] py-1 rounded-lg bg-brand-accent/20 text-brand-accent hover:bg-brand-accent/30 transition-all">Create</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="flex-1 text-[11px] py-1 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all mt-1">
            <Plus className="w-3 h-3" /> New folder
          </button>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">
              {activeFolderId === 'all' ? 'All Projects' : activeFolderId === null ? 'Unfiled' : folders.find(f => f.id === activeFolderId)?.name ?? 'Folder'}
            </h1>
            <p className="text-sm text-white/40 mt-0.5">{visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {visibleProjects.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/5 hover:bg-white/9 text-white/50 hover:text-white text-sm border border-white/[0.07] transition-all"
              >
                {allVisibleSelected
                  ? <CheckSquare className="w-3.5 h-3.5 text-brand-accent" />
                  : <Square className="w-3.5 h-3.5" />}
                {allVisibleSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
            <Link href="/dashboard"
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-brand-accent text-black text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> New project
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                <HardDrive className="w-4.5 h-4.5 text-brand-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Account storage</p>
                <p className="text-xs text-white/35">
                  Includes project outputs, saved face uploads, and AI model files.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {formatBytes(storageSummary.usedBytes)}
                {storageSummary.limitBytes > 0 ? ` / ${formatBytes(storageSummary.limitBytes)}` : ''}
              </p>
              <p className="text-xs text-white/35">
                {storageSummary.fileCount.toLocaleString()} file{storageSummary.fileCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {storageSummary.limitBytes > 0 && (
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', nearLimit ? 'bg-amber-500' : 'bg-brand-accent')}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-white/30">
                <span>{usedPercent.toFixed(1)}% used</span>
                <span>{formatBytes(Math.max(storageSummary.limitBytes - storageSummary.usedBytes, 0))} free</span>
              </div>
            </div>
          )}

          {nearLimit && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Storage is almost full. Delete older projects or saved models you no longer need.
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/9">
            <span className="text-sm font-medium text-white">
              {selectedCount} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/6 hover:bg-white/10 text-white/60 hover:text-white text-xs border border-white/[0.07] transition-all"
              >
                <X className="w-3 h-3" /> Clear
              </button>
              <button
                onClick={() => { setSingleDeleteTarget(null); setShowDeleteModal(true) }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/35 text-red-400 hover:text-red-300 text-xs border border-red-500/20 transition-all font-medium"
              >
                <Trash2 className="w-3 h-3" /> Delete {selectedCount}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white/20" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/50">No projects yet</p>
              <p className="text-xs text-white/25 mt-1">Head to the Studio to generate your first video</p>
            </div>
            <Link href="/dashboard"
              className="mt-2 flex items-center gap-2 h-9 px-4 rounded-xl bg-brand-accent text-black text-sm font-semibold hover:opacity-90 transition-opacity">
              Open Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {visibleProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                folders={folders}
                selected={selectedIds.has(p.id)}
                selecting={selecting}
                onSelect={handleSelect}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={id => { setSingleDeleteTarget(id); setShowDeleteModal(true) }}
                onMove={handleMove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteModal
          count={deleteModalCount}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setShowDeleteModal(false); setSingleDeleteTarget(null) }}
          isPending={isPending}
        />
      )}
    </div>
  )
}
