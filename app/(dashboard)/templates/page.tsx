import MarketplaceClient  from './_components/marketplace-client'
import { getPublishedMarketplaceTemplateGroups } from '@/lib/data/marketplace-templates'
import { PageWrapper } from '@/components/dashboard/PageWrapper'

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
    shot_type: shotTypeTemplates,
    motion_style: motionStyleTemplates,
    video_flow: videoFlowTemplates,
  } = await getPublishedMarketplaceTemplateGroups()

  return (
    <PageWrapper>
      <MarketplaceClient
        avatarTemplates={avatarTemplates}
        backgroundTemplates={backgroundTemplates}
        cameraTemplates={shotTypeTemplates}
        movementTemplates={motionStyleTemplates}
        videoFlowTemplates={videoFlowTemplates}
      />
    </PageWrapper>
  )
}
