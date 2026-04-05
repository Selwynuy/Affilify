import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const TIKTOK_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/'
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'

export interface TikTokAccountRow {
  user_id: string
  open_id: string
  scope: string | null
  access_token: string
  refresh_token: string
  access_token_expires_at: string
  refresh_token_expires_at: string
  creator_username: string | null
  creator_nickname: string | null
  creator_avatar_url: string | null
}

export interface TikTokCreatorInfo {
  creator_avatar_url: string
  creator_username: string
  creator_nickname: string
  privacy_level_options: string[]
  comment_disabled: boolean
  duet_disabled: boolean
  stitch_disabled: boolean
  max_video_post_duration_sec: number
}

export interface TikTokTokenResponse {
  access_token: string
  expires_in: number
  open_id: string
  refresh_expires_in: number
  refresh_token: string
  scope?: string
  token_type: string
}

function requireTikTokEnv() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientKey || !clientSecret || !appUrl) {
    throw new Error('TikTok integration is not configured. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.')
  }

  return { clientKey, clientSecret, appUrl }
}

export function getTikTokRedirectUri() {
  const { appUrl } = requireTikTokEnv()
  return `${appUrl.replace(/\/$/, '')}/api/tiktok/callback`
}

export function createTikTokOauthState() {
  return crypto.randomBytes(24).toString('hex')
}

export function createPkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export function buildTikTokAuthorizeUrl(params: { state: string; codeChallenge: string }) {
  const { clientKey } = requireTikTokEnv()
  const url = new URL(TIKTOK_AUTHORIZE_URL)
  url.searchParams.set('client_key', clientKey)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'user.info.basic,video.publish')
  url.searchParams.set('redirect_uri', getTikTokRedirectUri())
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.access_token) {
    const message = data?.error_description || data?.message || data?.error || 'TikTok token request failed'
    throw new Error(message)
  }

  return data as TikTokTokenResponse
}

export async function exchangeTikTokCode(code: string, codeVerifier: string) {
  const { clientKey, clientSecret } = requireTikTokEnv()
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: getTikTokRedirectUri(),
    code_verifier: codeVerifier,
  })

  return exchangeToken(body)
}

export async function refreshTikTokToken(refreshToken: string) {
  const { clientKey, clientSecret } = requireTikTokEnv()
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  return exchangeToken(body)
}

export async function revokeTikTokToken(accessToken: string) {
  const { clientKey, clientSecret } = requireTikTokEnv()
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    token: accessToken,
  })

  await fetch(TIKTOK_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body,
  }).catch(() => null)
}

function toIsoAfter(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

export async function upsertTikTokAccount(
  userId: string,
  token: TikTokTokenResponse,
  creatorInfo?: Partial<TikTokCreatorInfo>,
) {
  const admin = createAdminClient()
  const payload = {
    user_id: userId,
    open_id: token.open_id,
    scope: token.scope ?? null,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    access_token_expires_at: toIsoAfter(token.expires_in),
    refresh_token_expires_at: toIsoAfter(token.refresh_expires_in),
    creator_username: creatorInfo?.creator_username ?? null,
    creator_nickname: creatorInfo?.creator_nickname ?? null,
    creator_avatar_url: creatorInfo?.creator_avatar_url ?? null,
  }

  const { error } = await admin.from('tiktok_accounts').upsert(payload, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

export async function updateTikTokCreatorProfile(userId: string, creatorInfo: Partial<TikTokCreatorInfo>) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('tiktok_accounts')
    .update({
      creator_username: creatorInfo.creator_username ?? null,
      creator_nickname: creatorInfo.creator_nickname ?? null,
      creator_avatar_url: creatorInfo.creator_avatar_url ?? null,
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

async function tiktokApi<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  const response = await fetch(`${TIKTOK_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => null)
  const errorCode = data?.error?.code
  if (!response.ok || (errorCode && errorCode !== 'ok')) {
    const message = data?.error?.message || `TikTok request failed for ${path}`
    throw new Error(message)
  }

  return data as T
}

export async function queryTikTokCreatorInfo(accessToken: string) {
  const data = await tiktokApi<{ data: TikTokCreatorInfo }>('/post/publish/creator_info/query/', accessToken)
  return data.data
}

export async function initTikTokDirectPost(
  accessToken: string,
  payload: {
    post_info: {
      title?: string
      privacy_level: string
      disable_duet: boolean
      disable_comment: boolean
      disable_stitch: boolean
      brand_content_toggle?: boolean
      brand_organic_toggle?: boolean
      is_aigc?: boolean
      video_cover_timestamp_ms?: number
    }
    source_info: {
      source: 'FILE_UPLOAD'
      video_size: number
      chunk_size: number
      total_chunk_count: number
    }
  },
) {
  const data = await tiktokApi<{ data: { publish_id: string; upload_url: string } }>(
    '/post/publish/video/init/',
    accessToken,
    payload,
  )
  return data.data
}

export async function fetchTikTokPublishStatus(accessToken: string, publishId: string) {
  const data = await tiktokApi<{ data: Record<string, unknown> }>('/post/publish/status/fetch/', accessToken, {
    publish_id: publishId,
  })
  return data.data
}

export async function uploadVideoToTikTok(uploadUrl: string, buffer: Buffer, mimeType: string) {
  const minChunkSize = 5 * 1024 * 1024
  const maxChunkSize = 64 * 1024 * 1024
  const chunkSize = buffer.byteLength < minChunkSize
    ? buffer.byteLength
    : Math.min(Math.max(minChunkSize, 10 * 1024 * 1024), maxChunkSize, buffer.byteLength)

  let offset = 0
  while (offset < buffer.byteLength) {
    const end = Math.min(offset + chunkSize, buffer.byteLength)
    const chunk = buffer.subarray(offset, end)

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${offset}-${end - 1}/${buffer.byteLength}`,
      },
      body: new Uint8Array(chunk),
    })

    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'TikTok video upload failed')
    }

    offset = end
  }
}

export async function getTikTokAccount(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tiktok_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as TikTokAccountRow | null
}

export async function deleteTikTokAccount(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('tiktok_accounts').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getValidTikTokAccessToken(userId: string) {
  const account = await getTikTokAccount(userId)
  if (!account) {
    throw new Error('TikTok account not connected')
  }

  const expiresSoon = new Date(account.access_token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
  if (!expiresSoon) {
    return { account, accessToken: account.access_token }
  }

  const token = await refreshTikTokToken(account.refresh_token)
  const creatorInfo = account.creator_username
    ? {
        creator_username: account.creator_username,
        creator_nickname: account.creator_nickname ?? undefined,
        creator_avatar_url: account.creator_avatar_url ?? undefined,
      }
    : undefined

  await upsertTikTokAccount(userId, token, creatorInfo)
  const refreshed = await getTikTokAccount(userId)
  if (!refreshed) throw new Error('TikTok account refresh failed')

  return { account: refreshed, accessToken: refreshed.access_token }
}
