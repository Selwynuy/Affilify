import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, verifySameOrigin } from '@/lib/security'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

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

  return NextResponse.json({ project })
}
