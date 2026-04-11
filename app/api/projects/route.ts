import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveProjectThumbnailUrl } from '@/lib/projects/thumbnail'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'

export async function GET(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const rawFolderId = searchParams.get('folder_id')
  const folderId = rawFolderId === 'none' ? 'none' : (isUuid(rawFolderId ?? '') ? rawFolderId : null)

  const admin = createAdminClient()

  const rawLimit = searchParams.get('limit')
  const rawOffset = searchParams.get('offset')
  const pageLimit = Math.min(Math.max(parseInt(rawLimit ?? '50', 10) || 50, 1), 100)
  const pageOffset = Math.max(parseInt(rawOffset ?? '0', 10) || 0, 0)

  let query = admin
    .from('projects')
    .select('id, name, status, thumbnail_url, folder_id, parent_project_id, created_at, updated_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(pageOffset, pageOffset + pageLimit - 1)

  if (folderId === 'none') {
    query = query.is('folder_id', null)
  } else if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const projects = await Promise.all((data ?? []).map(async project => ({
    ...project,
    thumbnail_url: await resolveProjectThumbnailUrl(admin, project.thumbnail_url),
  })))

  return NextResponse.json({ projects, total: count ?? 0, limit: pageLimit, offset: pageOffset })
}
