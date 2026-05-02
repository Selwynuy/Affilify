import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

/** GET /api/user-models — list the current user's generated models with fresh signed URLs */
export async function GET(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: models, error } = await admin
    .from('user_models')
    .select('id, name, storage_path, public_url, source_template_id, gender, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Refresh signed URLs (1-hour TTL for display, 7-day when saved to preferences)
  const enriched = await Promise.all(
    (models ?? []).map(async (model) => {
      const { data: signed } = await admin.storage
        .from('generated')
        .createSignedUrl(model.storage_path, 60 * 60)
      return { ...model, public_url: signed?.signedUrl ?? model.public_url }
    }),
  )

  return NextResponse.json({ models: enriched })
}

/** PATCH /api/user-models — rename a model: body { id, name } */
export async function PATCH(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`user-models-patch:${user.id}`, RATE_LIMITS.userModelsWrite)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json()
  const id = isUuid(body?.id) ? body.id : null
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : null

  if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_models')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/user-models?id=<uuid> — delete one of the user's models */
export async function DELETE(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`user-models-delete:${user.id}`, RATE_LIMITS.userModelsWrite)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const id = req.nextUrl.searchParams.get('id')
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch the row first to verify ownership and get the storage path
  const { data: model } = await admin
    .from('user_models')
    .select('storage_path, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from storage
  await admin.storage.from('generated').remove([model.storage_path])

  // Delete the row (RLS enforces ownership)
  await admin.from('user_models').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
