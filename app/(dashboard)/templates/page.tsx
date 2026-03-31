import MarketplaceClient  from './_components/marketplace-client'
import { getPublishedMarketplaceTemplateGroups } from '@/lib/data/marketplace-templates'

/**
 * Server component — fetches published templates from the database, then
 * hands them to the interactive client component.
 *
 * Customers only ever see templates with status = 'published'.
 * The admin CRUD system at /admin/templates controls what is published.
 */
export default async function MarketplacePage() {
  const {
    avatar: avatarTemplates,
    background: backgroundTemplates,
    camera: cameraTemplates,
    movement: movementTemplates,
  } = await getPublishedMarketplaceTemplateGroups()

  return (
    <MarketplaceClient
      avatarTemplates={avatarTemplates}
      backgroundTemplates={backgroundTemplates}
      cameraTemplates={cameraTemplates}
      movementTemplates={movementTemplates}
    />
  )
}
