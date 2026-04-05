import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid, verifySameOrigin } from '@/lib/security'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_preferences')
    .select('avatar_config, background_config, onboarding_completed, camera_template_id, movement_template_id')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    avatar_config: data?.avatar_config ?? null,
    background_config: data?.background_config ?? null,
    onboarding_completed: data?.onboarding_completed ?? false,
    camera_template_id: data?.camera_template_id ?? null,
    movement_template_id: data?.movement_template_id ?? null,
  })
}

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Build only the fields that were provided
  const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if ('avatar_config' in body) update.avatar_config = body.avatar_config
  if ('background_config' in body) update.background_config = body.background_config
  if ('onboarding_completed' in body) update.onboarding_completed = body.onboarding_completed
  if ('camera_template_id' in body) update.camera_template_id = isUuid(body.camera_template_id) ? body.camera_template_id : null
  if ('movement_template_id' in body) update.movement_template_id = isUuid(body.movement_template_id) ? body.movement_template_id : null

  const { error } = await supabase
    .from('user_preferences')
    .upsert(update, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
