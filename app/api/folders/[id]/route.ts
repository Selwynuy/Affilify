import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, sanitizeText, verifySameOrigin } from '@/lib/security'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid folder id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = sanitizeText(body?.name, { maxLength: 120 })
  if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('project_folders')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, created_at')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ folder: data })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid folder id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Move all projects in this folder back to root (null folder_id)
  await admin
    .from('projects')
    .update({ folder_id: null })
    .eq('folder_id', id)
    .eq('user_id', user.id)

  const { error } = await admin
    .from('project_folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
