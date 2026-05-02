import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveProjectThumbnailUrl } from '@/lib/projects/thumbnail'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: project, error } = await admin
    .from('projects')
    .select('id, name, status, thumbnail_url, folder_id, parent_project_id, avatar, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch all generated images grouped by generation_round
  const { data: images } = await admin
    .from('project_images')
    .select('id, kind, url, storage_path, position, generation_round, created_at')
    .eq('project_id', id)
    .order('generation_round', { ascending: false })
    .order('position', { ascending: true })

  // Fetch videos
  const { data: videos } = await admin
    .from('project_videos')
    .select('id, image_id, url, status, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    project: {
      ...project,
      thumbnail_url: await resolveProjectThumbnailUrl(admin, project.thumbnail_url),
    },
    images: images ?? [],
    videos: videos ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`projects:user:${user.id}`, RATE_LIMITS.projectsWrite)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const name = sanitizeText(body.name, { maxLength: 120 })
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    updates.name = name
  }

  if ('folder_id' in body) {
    if (body.folder_id === null) {
      updates.folder_id = null
    } else if (isUuid(body.folder_id)) {
      const admin = createAdminClient()
      const { data: folder } = await admin
        .from('project_folders')
        .select('id')
        .eq('id', body.folder_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }

      updates.folder_id = folder.id
    } else {
      updates.folder_id = null
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, folder_id, updated_at')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })

  return NextResponse.json({ project: data })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`projects:user:${user.id}`, RATE_LIMITS.projectsWrite)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const admin = createAdminClient()

  // Verify ownership before deleting
  const { data: project } = await admin
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove storage files linked to this project
  const { data: storageFiles } = await admin
    .from('storage_files')
    .select('storage_path, file_type')
    .eq('project_id', id)
    .eq('user_id', user.id)

  if (storageFiles && storageFiles.length > 0) {
    const generatedPaths = storageFiles
      .filter(f => f.file_type === 'generated_image')
      .map(f => f.storage_path)
    if (generatedPaths.length > 0) {
      await admin.storage.from('generated').remove(generatedPaths)
    }
  }

  const { error } = await admin
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
