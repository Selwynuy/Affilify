'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Check, Eye, FileText, Layers, Pencil, Search, Trash2 } from 'lucide-react'
import {
  deleteTemplateInline,
  deleteTemplatesInline,
  setTemplatesStatusInline,
} from '@/app/actions/templates'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { useNotify } from '@/components/feedback/use-notify'
import { cn } from '@/lib/utils'
import type { MarketplaceTemplate, TemplateCategory, TemplateStatus } from '@/lib/types/marketplace'

type TemplateRow = Pick<
  MarketplaceTemplate,
  'id' | 'title' | 'description' | 'category' | 'status' | 'updated_at' | 'sort_order'
>

type StatusTab = TemplateStatus | 'all'
type CategoryFilter = TemplateCategory | 'all'

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
]

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All categories' },
  { id: 'camera', label: 'Camera' },
  { id: 'movement', label: 'Movement' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'background', label: 'Background' },
  { id: 'other', label: 'Other' },
]

const STATUS_STYLE: Record<TemplateStatus, string> = {
  draft: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  archived: 'text-white/30 bg-white/5 border-white/10',
}

const STATUS_ICON: Record<TemplateStatus, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  published: <Eye className="h-3 w-3" />,
  archived: <Archive className="h-3 w-3" />,
}

function buildHref({
  status,
  category,
  query,
  page,
}: {
  status: StatusTab
  category: CategoryFilter
  query: string
  page: number
}) {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (category !== 'all') params.set('category', category)
  if (query.trim()) params.set('q', query.trim())
  if (page > 1) params.set('page', String(page))
  const search = params.toString()
  return search ? `/admin/templates?${search}` : '/admin/templates'
}

function RowDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const notify = useNotify()
  const [state, action, pending] = useActionState(deleteTemplateInline, {})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    if (state?.success) {
      notify.success({ description: state.success })
      router.refresh()
    }
  }, [notify, router, state?.success])

  useEffect(() => {
    if (state?.error) {
      notify.error({ description: state.error })
    }
  }, [notify, state?.error])

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          setConfirmOpen(true)
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {pending ? 'Deleting...' : 'Delete'}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete template?"
        description={`Delete "${title}" permanently? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() => {
          setConfirmOpen(false)
          formRef.current?.requestSubmit()
        }}
      />
    </form>
  )
}

function BulkActions({
  ids,
  onClear,
}: {
  ids: string[]
  onClear: () => void
}) {
  const router = useRouter()
  const notify = useNotify()
  const [statusState, statusAction, statusPending] = useActionState(setTemplatesStatusInline, {})
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTemplatesInline, {})
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false)
  const selectedCount = ids.length

  useEffect(() => {
    if (statusState?.success || deleteState?.success) {
      notify.success({ description: statusState?.success ?? deleteState?.success ?? 'Action completed' })
      onClear()
      router.refresh()
    }
  }, [deleteState?.success, notify, onClear, router, statusState?.success])

  useEffect(() => {
    if (statusState?.error) notify.error({ description: statusState.error })
    if (deleteState?.error) notify.error({ description: deleteState.error })
  }, [deleteState?.error, notify, statusState?.error])

  const message = deleteState?.error ?? deleteState?.success ?? statusState?.error ?? statusState?.success

  return (
    <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-white/70">
          {selectedCount} template{selectedCount !== 1 ? 's' : ''} selected
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form action={statusAction}>
            {ids.map((id) => (
              <input key={`publish-${id}`} type="hidden" name="ids" value={id} />
            ))}
            <input type="hidden" name="status" value="published" />
            <button
              type="submit"
              disabled={statusPending || deletePending}
              className="rounded-lg border border-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publish selected
            </button>
          </form>

          <form action={statusAction}>
            {ids.map((id) => (
              <input key={`draft-${id}`} type="hidden" name="ids" value={id} />
            ))}
            <input type="hidden" name="status" value="draft" />
            <button
              type="submit"
              disabled={statusPending || deletePending}
              className="rounded-lg border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Draft selected
            </button>
          </form>

          <form action={statusAction}>
            {ids.map((id) => (
              <input key={`archive-${id}`} type="hidden" name="ids" value={id} />
            ))}
            <input type="hidden" name="status" value="archived" />
            <button
              type="submit"
              disabled={statusPending || deletePending}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Archive selected
            </button>
          </form>

          <form action={deleteAction}>
            {ids.map((id) => (
              <input key={`delete-${id}`} type="hidden" name="ids" value={id} />
            ))}
            <button
              type="button"
              disabled={statusPending || deletePending}
              onClick={() => setConfirmBulkDeleteOpen(true)}
              className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete selected
            </button>
            <ConfirmDialog
              open={confirmBulkDeleteOpen}
              onOpenChange={setConfirmBulkDeleteOpen}
              title="Delete selected templates?"
              description={`Delete ${selectedCount} selected template${selectedCount !== 1 ? 's' : ''} permanently? This cannot be undone.`}
              confirmLabel="Delete selected"
              destructive
              pending={deletePending}
              onConfirm={() => {
                setConfirmBulkDeleteOpen(false)
                const formData = new FormData()
                ids.forEach((id) => formData.append('ids', id))
                deleteAction(formData)
              }}
            />
          </form>

          <button
            type="button"
            onClick={onClear}
            disabled={statusPending || deletePending}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear selection
          </button>
        </div>
      </div>

      {message && (
        <p className={cn('text-xs', deleteState?.error || statusState?.error ? 'text-red-400' : 'text-white/50')}>
          {message}
        </p>
      )}
    </div>
  )
}

function BrandCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
}) {
  return (
    <label className="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        ref={(node) => {
          if (node) node.indeterminate = indeterminate
        }}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-white/35 bg-[#15121f] transition-colors peer-focus-visible:border-brand-accent/80 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-accent/25 peer-checked:border-brand-accent peer-checked:bg-brand-accent/20" />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white transition-opacity">
        {indeterminate ? (
          <span className="h-0.5 w-2 rounded-full bg-brand-accent" />
        ) : (
          <Check className={cn('h-3 w-3 text-brand-accent opacity-0 transition-opacity', checked && 'opacity-100')} strokeWidth={3} />
        )}
      </span>
    </label>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <p className="text-xs text-white/40">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function TemplatesTable({
  initialStatus,
  initialCategory,
  initialQuery,
  currentPage,
  pageSize,
  totalRows,
  rows,
  showHeader = true,
}: {
  initialStatus: StatusTab
  initialCategory: CategoryFilter
  initialQuery: string
  currentPage: number
  pageSize: number
  totalRows: number
  rows: TemplateRow[]
  showHeader?: boolean
}) {
  const router = useRouter()
  const [activeStatus, setActiveStatus] = useState<StatusTab>(initialStatus)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(initialCategory)
  const [search, setSearch] = useState(initialQuery)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    setActiveStatus(initialStatus)
  }, [initialStatus])

  useEffect(() => {
    setActiveCategory(initialCategory)
  }, [initialCategory])

  useEffect(() => {
    setSearch(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    setSelectedIds([])
  }, [currentPage, initialCategory, initialQuery, initialStatus, rows])

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const rowIds = rows.map((row) => row.id)
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id))
  const someSelected = rowIds.some((id) => selectedIds.includes(id))

  function navigate(next: { status?: StatusTab; category?: CategoryFilter; query?: string; page?: number }) {
    const status = next.status ?? activeStatus
    const category = next.category ?? activeCategory
    const query = next.query ?? search.trim()
    const page = next.page ?? currentPage
    router.replace(buildHref({ status, category, query, page }))
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate({ query: search.trim(), page: 1 })
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id]
      }
      return current.filter((item) => item !== id)
    })
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...rowIds]))
      }
      return current.filter((id) => !rowIds.includes(id))
    })
  }

  return (
    <>
      {showHeader && (
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Templates</h1>
          <p className="text-sm text-white/50">
            {totalRows} template{totalRows !== 1 ? 's' : ''}
            {activeStatus !== 'all' && ` - ${activeStatus}`}
            {activeCategory !== 'all' && ` - ${activeCategory}`}
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 w-fit">
          {STATUS_TABS.map((tab) => {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveStatus(tab.id)
                  navigate({ status: tab.id, page: 1 })
                }}
                aria-pressed={activeStatus === tab.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
                  activeStatus === tab.id
                    ? 'bg-white/10 text-white'
                    : 'cursor-pointer text-white/40 hover:text-white',
                )}
              >
                {tab.label}
                {tab.id === 'all' && totalRows > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      activeStatus === tab.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30',
                    )}
                  >
                    {totalRows}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <form onSubmit={handleSearchSubmit} className="flex flex-1">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or description..."
                className="w-full rounded-l-xl rounded-r-none border border-white/8 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/25 transition-colors focus:border-violet-500/50 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              aria-label="Search templates"
              className="inline-flex items-center justify-center rounded-l-none rounded-r-xl border border-l-0 border-white/8 bg-white/[0.03] px-3 text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white focus:border-violet-500/50 focus:outline-none"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <select
            value={activeCategory}
            onChange={(event) => {
              const nextCategory = event.target.value as CategoryFilter
              setActiveCategory(nextCategory)
              navigate({ category: nextCategory, page: 1 })
            }}
            className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors focus:border-violet-500/50 focus:outline-none md:w-56"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-[#0d0d14] text-white">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <BulkActions ids={selectedIds} onClear={() => setSelectedIds([])} />
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 py-24">
          <Layers className="h-8 w-8 text-white/15" />
          <p className="text-sm text-white/30">No templates match the current filters</p>
          <Link href="/admin/templates/new" className="text-sm text-violet-400 transition-colors hover:text-violet-300">
            Create a new template
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="w-12 px-4 py-3 text-left">
                    <BrandCheckbox
                      checked={allSelected}
                      indeterminate={!allSelected && someSelected}
                      onChange={toggleAllVisible}
                      ariaLabel="Select all visible templates"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Title</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 sm:table-cell">Category</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 sm:table-cell">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-white/40 md:table-cell">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((template) => (
                  <tr key={template.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 align-top">
                      <div className="mt-1">
                        <BrandCheckbox
                          checked={selectedIds.includes(template.id)}
                          onChange={(checked) => toggleRow(template.id, checked)}
                          ariaLabel={`Select ${template.title}`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/templates/${template.id}`} className="block">
                        <span className="font-medium text-white/80 transition-colors hover:text-white">{template.title}</span>
                        {template.description && (
                          <span className="mt-0.5 block max-w-[260px] truncate text-xs text-white/30">
                            {template.description}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-xs capitalize text-white/40">{template.category}</span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="tabular-nums text-xs text-white/25">{template.sort_order}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', STATUS_STYLE[template.status])}>
                        {STATUS_ICON[template.status]}
                        {template.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-white/30 md:table-cell">
                      {new Date(template.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/templates/${template.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <RowDeleteButton id={template.id} title={template.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={(page) => navigate({ page })}
          />
        </div>
      )}
    </>
  )
}
