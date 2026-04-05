import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getTikTokAccount,
  getValidTikTokAccessToken,
  queryTikTokCreatorInfo,
  revokeTikTokToken,
  deleteTikTokAccount,
  updateTikTokCreatorProfile,
} from '@/lib/tiktok'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await getTikTokAccount(user.id)
  if (!account) {
    return NextResponse.json({ connected: false })
  }

  try {
    const { accessToken } = await getValidTikTokAccessToken(user.id)
    const creatorInfo = await queryTikTokCreatorInfo(accessToken)
    await updateTikTokCreatorProfile(user.id, creatorInfo)

    return NextResponse.json({
      connected: true,
      creator: creatorInfo,
    })
  } catch (err) {
    return NextResponse.json({
      connected: true,
      creator: {
        creator_avatar_url: account.creator_avatar_url,
        creator_username: account.creator_username,
        creator_nickname: account.creator_nickname,
        privacy_level_options: ['SELF_ONLY'],
        comment_disabled: true,
        duet_disabled: true,
        stitch_disabled: true,
        max_video_post_duration_sec: 300,
      },
      warning: err instanceof Error ? err.message : 'TikTok creator info could not be refreshed.',
    })
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await getTikTokAccount(user.id)
  if (!account) return NextResponse.json({ ok: true })

  await revokeTikTokToken(account.access_token)
  await deleteTikTokAccount(user.id)

  return NextResponse.json({ ok: true })
}
