import { StudioCanvas } from '@/components/studio/StudioCanvas'
import { getPublishedMarketplaceTemplateGroups } from '@/lib/data/marketplace-templates'

export const metadata = { title: 'Studio' }

export default async function DashboardPage() {
  const { avatar, background, camera, movement } =
    await getPublishedMarketplaceTemplateGroups()

  return (
    <StudioCanvas
      avatarTemplates={avatar}
      backgroundTemplates={background}
      cameraTemplates={camera}
      movementTemplates={movement}
    />
  )
}
