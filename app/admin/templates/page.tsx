import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import TemplatesTable from './_components/templates-table'
import type { MarketplaceTemplate, TemplateStatus } from '@/lib/types/marketplace'

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
  const { data, error } = await admin
    .from('marketplace_templates')
    .select('id, title, description, category, status, updated_at, sort_order')
    .order('category')
    .order('sort_order')

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

      <TemplatesTable initialStatus={activeStatus} rows={rows} />
    </div>
  )
}
