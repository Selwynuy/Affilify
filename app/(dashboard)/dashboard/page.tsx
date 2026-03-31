import { GeneratePanel } from '@/components/dashboard/GeneratePanel'
import { getPublishedMarketplaceTemplateGroups } from '@/lib/data/marketplace-templates'

export default async function DashboardPage() {
  const {
    avatar: avatarTemplates,
    background: backgroundTemplates,
    camera: cameraTemplates,
    movement: movementTemplates,
  } = await getPublishedMarketplaceTemplateGroups()

  return (
    <GeneratePanel
      avatarTemplates={avatarTemplates}
      backgroundTemplates={backgroundTemplates}
      cameraTemplates={cameraTemplates}
      movementTemplates={movementTemplates}
    />
  )
}
