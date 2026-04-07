import { notFound, redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getProject } from '@/lib/data/projects'
import { ProjectDetailClient } from '@/components/dashboard/ProjectDetailClient'
import { PageWrapper } from '@/components/dashboard/PageWrapper'

export const metadata = { title: 'Project' }

type Props = { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const session = await verifySession()
  if (!session) redirect('/login')

  const { id } = await params
  const data = await getProject(id)
  if (!data) notFound()

  return (
    <PageWrapper>
      <ProjectDetailClient
        project={data.project}
        images={data.images}
        videos={data.videos}
      />
    </PageWrapper>
  )
}
