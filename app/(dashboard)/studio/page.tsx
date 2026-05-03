import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import {
  getPublishedMarketplaceTemplateGroups,
  getPublishedWorkflowTemplates,
} from '@/lib/data/marketplace-templates'
import { WorkflowCanvas } from '@/components/studio/WorkflowCanvas'

export const metadata = { title: 'Studio · Workflows' }

export default async function StudioWorkflowPage() {
  const session = await verifySession()
  if (!session) redirect('/login')

  const [workflowTemplates, marketplaceGroups] = await Promise.all([
    getPublishedWorkflowTemplates(),
    getPublishedMarketplaceTemplateGroups(),
  ])

  return (
    <WorkflowCanvas
      userId={session.user.id}
      workflowTemplates={workflowTemplates}
      avatarTemplates={marketplaceGroups.avatar}
      backgroundTemplates={marketplaceGroups.background}
      cameraTemplates={marketplaceGroups.shot_type}
      movementTemplates={marketplaceGroups.motion_style}
      videoFlowTemplates={marketplaceGroups.video_flow}
    />
  )
}
