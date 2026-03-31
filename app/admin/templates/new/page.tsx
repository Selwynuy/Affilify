import { redirect } from 'next/navigation'
import Link         from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { verifyAdmin } from '@/lib/admin/auth'
import TemplateForm    from '../_components/template-form'

export default async function NewTemplatePage() {
  const user = await verifyAdmin()
  if (!user) redirect('/dashboard')

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
        <h1 className="text-2xl font-semibold text-white">New Template</h1>
        <p className="text-sm text-white/40">
          Saved as a draft — publish when ready to show customers.
        </p>
      </div>

      <TemplateForm />
    </div>
  )
}
