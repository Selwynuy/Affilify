import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_preferences')
    .select('defaults, avatar_config, background_config, onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    defaults: data?.defaults ?? null,
    avatar_config: data?.avatar_config ?? null,
    background_config: data?.background_config ?? null,
    onboarding_completed: data?.onboarding_completed ?? false,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Build only the fields that were provided
  const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if ('defaults' in body) update.defaults = body.defaults
  if ('avatar_config' in body) update.avatar_config = body.avatar_config
  if ('background_config' in body) update.background_config = body.background_config
  if ('onboarding_completed' in body) update.onboarding_completed = body.onboarding_completed

  const { error } = await supabase
    .from('user_preferences')
    .upsert(update, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
