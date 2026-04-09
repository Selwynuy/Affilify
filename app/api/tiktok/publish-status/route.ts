import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTikTokPublishStatus, getValidTikTokAccessToken } from '@/lib/tiktok'
import { sanitizeText } from '@/lib/security'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const publishId = sanitizeText(req.nextUrl.searchParams.get('publishId'), { maxLength: 100 })
  if (!publishId) return NextResponse.json({ error: 'publishId is required' }, { status: 400 })

  const { accessToken } = await getValidTikTokAccessToken(user.id)
  const status = await fetchTikTokPublishStatus(accessToken, publishId)

  return NextResponse.json({ publishId, status })
}
