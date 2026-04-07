import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  let query = admin
    .from('projects')
    .select('id, name, status, thumbnail_url, folder_id, parent_project_id, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (folderId === 'none') {
    query = query.is('folder_id', null)
  } else if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ projects: data ?? [] })
}
