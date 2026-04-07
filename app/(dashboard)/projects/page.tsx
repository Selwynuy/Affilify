import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getProjectStorageSummary, listProjects, listFolders } from '@/lib/data/projects'
import { ProjectsClient } from '@/components/dashboard/ProjectsClient'
import { PageWrapper } from '@/components/dashboard/PageWrapper'

export const metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const session = await verifySession()
  if (!session) redirect('/login')

  const [projects, folders, storageSummary] = await Promise.all([
    listProjects(),
    listFolders(),
    getProjectStorageSummary(),
  ])

  return (
    <PageWrapper>
      <ProjectsClient
        initialProjects={projects}
        initialFolders={folders}
        storageSummary={storageSummary}
      />
    </PageWrapper>
  )
}
