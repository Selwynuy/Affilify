'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive, Eye, FileText, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketplaceTemplate, TemplateStatus } from '@/lib/types/marketplace'

type TemplateRow = Pick<
  MarketplaceTemplate,
  'id' | 'title' | 'description' | 'category' | 'status' | 'updated_at' | 'sort_order'
>

type StatusTab = TemplateStatus | 'all'

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
]

const STATUS_STYLE: Record<TemplateStatus, string> = {
  draft: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  archived: 'text-white/30 bg-white/5 border-white/10',
}

const STATUS_ICON: Record<TemplateStatus, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  published: <Eye className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
}

function getTabHref(status: StatusTab) {
  return status === 'all' ? '/admin/templates' : `/admin/templates?status=${status}`
}

export default function TemplatesTable({
  initialStatus,
  rows,
}: {
  initialStatus: StatusTab
  rows: TemplateRow[]
}) {
  const [activeStatus, setActiveStatus] = useState<StatusTab>(initialStatus)

  useEffect(() => {
    setActiveStatus(initialStatus)
  }, [initialStatus])

  const filteredRows = activeStatus === 'all'
    ? rows
    : rows.filter((row) => row.status === activeStatus)

  const countsByStatus = rows.reduce<Record<TemplateStatus, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, { draft: 0, published: 0, archived: 0 })

  function handleTabChange(status: StatusTab) {
    setActiveStatus(status)

    window.history.replaceState(null, '', getTabHref(status))
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Templates</h1>
        <p className="text-sm text-white/50">
          {filteredRows.length} template{filteredRows.length !== 1 ? 's' : ''}
          {activeStatus !== 'all' && ` - ${activeStatus}`}
        </p>
      </div>

      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 w-fit border border-white/[0.07]">
        {STATUS_TABS.map((tab) => {
          const count = tab.id === 'all' ? rows.length : countsByStatus[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              aria-pressed={activeStatus === tab.id}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                activeStatus === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white cursor-pointer',
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    activeStatus === tab.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border border-white/8 border-dashed">
          <Layers className="w-8 h-8 text-white/15" />
          <p className="text-sm text-white/30">No templates yet</p>
          <Link
            href="/admin/templates/new"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden sm:table-cell">Order</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-white/40 px-4 py-3 hidden md:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${template.id}`} className="block">
                      <span className="text-white/80 font-medium group-hover:text-white transition-colors">
                        {template.title}
                      </span>
                      {template.description && (
                        <span className="block text-xs text-white/30 truncate max-w-[260px] mt-0.5">
                          {template.description}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-white/40 capitalize">{template.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-white/25 tabular-nums">{template.sort_order}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5',
                        STATUS_STYLE[template.status],
                      )}
                    >
                      {STATUS_ICON[template.status]}
                      {template.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-white/30">
                    {new Date(template.updated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
