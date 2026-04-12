import { StudioCanvas } from '@/components/studio/StudioCanvas'
import { redirect } from 'next/navigation'
import { getPublishedMarketplaceTemplateGroups } from '@/lib/data/marketplace-templates'
import { verifySession } from '@/lib/dal'

export const metadata = { title: 'Studio' }

export default async function DashboardPage() {
  const session = await verifySession()
  if (!session) {
    redirect('/login')
  }

  const { avatar, background, shot_type, motion_style, video_flow } =
    await getPublishedMarketplaceTemplateGroups()

  return (
    <StudioCanvas
      userId={session.user.id}
      avatarTemplates={avatar}
      backgroundTemplates={background}
      cameraTemplates={shot_type}
      movementTemplates={motion_style}
      videoFlowTemplates={video_flow}
    />
  )
}
