import { notFound, redirect } from 'next/navigation'
import Link                   from 'next/link'
import { ChevronLeft }        from 'lucide-react'
import { verifyAdmin }          from '@/lib/admin/auth'
import { createAdminClient }    from '@/lib/supabase/admin'
import TemplateForm             from '../_components/template-form'
import type { MarketplaceTemplate } from '@/lib/types/marketplace'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await verifyAdmin()
  if (!user) redirect('/dashboard')

  const { id } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('marketplace_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const template = data as MarketplaceTemplate

  const statusLabel: Record<string, string> = {
    draft:     'Draft',
    published: 'Live',
    archived:  'Archived',
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/templates"
          className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Templates
        </Link>
        <h1 className="text-2xl font-semibold text-white">{template.title}</h1>
        <p className="text-sm text-white/40 capitalize">
          {template.category} · {statusLabel[template.status] ?? template.status}
        </p>
      </div>

      <TemplateForm template={template} />
    </div>
  )
}
