import Link          from 'next/link'
import { redirect } from 'next/navigation'
import { verifyAdmin }     from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'
import { Plus, Layers, Eye, FileText, Archive } from 'lucide-react'
import type { MarketplaceTemplate, TemplateStatus } from '@/lib/types/marketplace'

const STATUS_TABS: { id: TemplateStatus | 'all'; label: string }[] = [
  { id: 'all',       label: 'All'       },
  { id: 'draft',     label: 'Draft'     },
  { id: 'published', label: 'Published' },
  { id: 'archived',  label: 'Archived'  },
]

const STATUS_STYLE: Record<TemplateStatus, string> = {
  draft:     'text-amber-400   bg-amber-500/10   border-amber-500/20',
  published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  archived:  'text-white/30    bg-white/5         border-white/10',
}

const STATUS_ICON: Record<TemplateStatus, React.ReactNode> = {
  draft:     <FileText className="w-3 h-3" />,
  published: <Eye      className="w-3 h-3" />,
  archived:  <Archive  className="w-3 h-3" />,
}

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await verifyAdmin()
  if (!user) redirect('/dashboard')

  const { status: rawStatus } = await searchParams
  const activeStatus = (
    ['draft', 'published', 'archived'].includes(rawStatus ?? '') ? rawStatus : 'all'
  ) as TemplateStatus | 'all'

  const admin = createAdminClient()
  let query = admin
    .from('marketplace_templates')
    .select('id, title, description, category, status, updated_at, sort_order')
    .order('category')
    .order('sort_order')

  if (activeStatus !== 'all') query = query.eq('status', activeStatus)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Pick<
    MarketplaceTemplate,
    'id' | 'title' | 'description' | 'category' | 'status' | 'updated_at' | 'sort_order'
  >[]

  const countsByStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Templates</h1>
          <p className="text-sm text-white/50">
            {rows.length} template{rows.length !== 1 ? 's' : ''}
            {activeStatus !== 'all' && ` · ${activeStatus}`}
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New template
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 w-fit border border-white/[0.07]">
        {STATUS_TABS.map((tab) => {
          const href = tab.id === 'all'
            ? '/admin/templates'
            : `/admin/templates?status=${tab.id}`
          const count = tab.id === 'all'
            ? rows.length
            : (countsByStatus[tab.id] ?? 0)
          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                activeStatus === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white',
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  activeStatus === tab.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30',
                )}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border border-white/8 border-dashed">
          <Layers className="w-8 h-8 text-white/15" />
          <p className="text-sm text-white/30">No templates yet</p>
          <Link
            href="/admin/templates/new"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Create your first template →
          </Link>
        </div>
      ) : (

        /* Table */
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
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${t.id}`} className="block">
                      <span className="text-white/80 font-medium group-hover:text-white transition-colors">
                        {t.title}
                      </span>
                      {t.description && (
                        <span className="block text-xs text-white/30 truncate max-w-[260px] mt-0.5">
                          {t.description}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-white/40 capitalize">{t.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-white/25 tabular-nums">{t.sort_order}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5',
                      STATUS_STYLE[t.status],
                    )}>
                      {STATUS_ICON[t.status]}
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-white/30">
                    {new Date(t.updated_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
