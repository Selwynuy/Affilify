import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveProjectThumbnailUrl } from '@/lib/projects/thumbnail'
import { isUuid, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`projects-duplicate:user:${user.id}`, RATE_LIMITS.projectsDuplicate)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const admin = createAdminClient()

  // Verify ownership before duplicating
  const { data: owned } = await admin
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: newId, error } = await admin.rpc('duplicate_project', {
    p_project_id: id,
    p_user_id: user.id,
  })

  if (error || !newId) {
    return NextResponse.json({ error: error?.message ?? 'Duplicate failed' }, { status: 500 })
  }

  const { data: project } = await admin
    .from('projects')
    .select('id, name, status, thumbnail_url, folder_id, created_at, updated_at')
    .eq('id', newId)
    .single()

  return NextResponse.json({
    project: project
      ? {
        ...project,
        thumbnail_url: await resolveProjectThumbnailUrl(admin, project.thumbnail_url),
      }
      : null,
  })
}
