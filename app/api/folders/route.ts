import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeText, verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'

export async function GET(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('project_folders')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ folders: data ?? [] })
}

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(`folders:user:${user.id}`, RATE_LIMITS.foldersWrite)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await req.json()
  const name = sanitizeText(body?.name, { maxLength: 120 })
  if (!name) return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('project_folders')
    .insert({ user_id: user.id, name })
    .select('id, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ folder: data })
}
