import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'

export interface ProjectFolder {
  id: string
  name: string
  created_at: string
}

export interface ProjectListItem {
  id: string
  name: string
  status: string
  thumbnail_url: string | null
  folder_id: string | null
  parent_project_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectDetail extends ProjectListItem {
  avatar: Record<string, unknown> | null
}

export interface ProjectImage {
  id: string
  kind: 'product' | 'generated'
  url: string
  storage_path: string
  position: number
  generation_round: number
  created_at: string
  signedUrl?: string
}

export interface ProjectVideo {
  id: string
  image_id: string | null
  video_url: string | null
  status: string
  created_at: string
}

export interface ProjectStorageSummary {
  usedBytes: number
  fileCount: number
  limitBytes: number
  planId: PlanId | null
}

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

export async function listFolders(): Promise<ProjectFolder[]> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data } = await admin
    .from('project_folders')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return (data ?? []) as ProjectFolder[]
}

export async function listProjects(folderId?: string | null): Promise<ProjectListItem[]> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  let query = admin
    .from('projects')
    .select('id, name, status, thumbnail_url, folder_id, parent_project_id, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (folderId === null) {
    query = query.is('folder_id', null)
  } else if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  const { data } = await query
  return (data ?? []) as ProjectListItem[]
}

export async function getProject(id: string): Promise<{
  project: ProjectDetail
  images: ProjectImage[]
  videos: ProjectVideo[]
} | null> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('id, name, status, thumbnail_url, folder_id, parent_project_id, avatar, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!project) return null

  const { data: rawImages } = await admin
    .from('project_images')
    .select('id, kind, url, storage_path, position, generation_round, created_at')
    .eq('project_id', id)
    .order('generation_round', { ascending: false })
    .order('position', { ascending: true })

  // Generate signed URLs for generated images
  const images: ProjectImage[] = await Promise.all(
    ((rawImages ?? []) as ProjectImage[]).map(async (img) => {
      if (img.kind !== 'generated') return img
      const { data: signed } = await admin.storage
        .from('generated')
        .createSignedUrl(img.storage_path, 60 * 60 * 24 * 7)
      return { ...img, signedUrl: signed?.signedUrl ?? undefined }
    }),
  )

  const { data: videos } = await admin
    .from('project_videos')
    .select('id, image_id, video_url, status, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return {
    project: project as ProjectDetail,
    images,
    videos: (videos ?? []) as ProjectVideo[],
  }
}

export async function getProjectStorageSummary(): Promise<ProjectStorageSummary> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: projects } = await admin
    .from('projects')
    .select('id')
    .eq('user_id', userId)

  const projectIds = (projects ?? []).map(project => project.id)

  const { data: storageFiles } = projectIds.length === 0
    ? { data: [] as Array<{ size_bytes: number | null }> }
    : await admin
      .from('storage_files')
      .select('size_bytes')
      .eq('user_id', userId)
      .in('project_id', projectIds)

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const limitBytes = (plan?.storageGb ?? 0) * 1024 * 1024 * 1024
  const files = storageFiles ?? []

  return {
    usedBytes: files.reduce((total, file) => total + Number(file.size_bytes ?? 0), 0),
    fileCount: files.length,
    limitBytes,
    planId,
  }
}
