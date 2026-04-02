import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import TemplatesTable from './_components/templates-table'
import type { MarketplaceTemplate, TemplateCategory, TemplateStatus } from '@/lib/types/marketplace'

const PAGE_SIZE = 20

function parseStatus(value?: string) {
  return (['draft', 'published', 'archived'].includes(value ?? '') ? value : 'all') as TemplateStatus | 'all'
}

function parseCategory(value?: string) {
  return (['camera', 'movement', 'avatar', 'background', 'other'].includes(value ?? '') ? value : 'all') as TemplateCategory | 'all'
}

function parsePage(value?: string) {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; page?: string }>
}) {
  const user = await verifyAdmin()
  if (!user) redirect('/dashboard')

  const { status, category, q, page } = await searchParams
  const activeStatus = parseStatus(status)
  const activeCategory = parseCategory(category)
  const searchQuery = q?.trim() ?? ''
  const currentPage = parsePage(page)

  const admin = createAdminClient()
  let query = admin
    .from('marketplace_templates')
    .select('id, title, description, category, status, updated_at, sort_order', { count: 'exact' })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
    .order('category')
    .order('sort_order')
    .order('updated_at', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }

  if (activeCategory !== 'all') {
    query = query.eq('category', activeCategory)
  }

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Pick<
    MarketplaceTemplate,
    'id' | 'title' | 'description' | 'category' | 'status' | 'updated_at' | 'sort_order'
  >[]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-end gap-4">
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New template
        </Link>
      </div>

      <TemplatesTable
        initialStatus={activeStatus}
        initialCategory={activeCategory}
        initialQuery={searchQuery}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalRows={count ?? 0}
        rows={rows}
      />
    </div>
  )
}
