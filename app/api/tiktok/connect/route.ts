import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  buildTikTokAuthorizeUrl,
  createPkcePair,
  createTikTokOauthState,
} from '@/lib/tiktok'

export async function GET() {
  const cookieStore = await cookies()
  const state = createTikTokOauthState()
  const { codeVerifier, codeChallenge } = createPkcePair()
  const secure = process.env.NODE_ENV === 'production'

  cookieStore.set('tiktok_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 10,
  })
  cookieStore.set('tiktok_oauth_verifier', codeVerifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 10,
  })

  return NextResponse.redirect(buildTikTokAuthorizeUrl({ state, codeChallenge }))
}
