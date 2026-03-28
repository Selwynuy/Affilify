import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reviews')
    .select('id, name, handle, avatar_letter, avatar_color, rating, body, tag, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ reviews: [] })
  return NextResponse.json({ reviews: data ?? [] })
}
