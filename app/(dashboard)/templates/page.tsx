import { createClient }   from '@/lib/supabase/server'
import MarketplaceClient  from './_components/marketplace-client'
import type { MarketplaceTemplate } from '@/lib/types/marketplace'

/**
 * Server component — fetches published templates from the database, then
 * hands them to the interactive client component.
 *
 * Customers only ever see templates with status = 'published'.
 * The admin CRUD system at /admin/templates controls what is published.
 */
export default async function MarketplacePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('marketplace_templates')
    .select('*')
    .eq('status', 'published')
    .order('sort_order')

  const templates = (data ?? []) as MarketplaceTemplate[]

  const cameraTemplates   = templates.filter((t) => t.category === 'camera')
  const movementTemplates = templates.filter((t) => t.category === 'movement')

  return (
    <MarketplaceClient
      cameraTemplates={cameraTemplates}
      movementTemplates={movementTemplates}
    />
  )
}
