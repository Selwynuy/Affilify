import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeTikTokCode,
  queryTikTokCreatorInfo,
  upsertTikTokAccount,
} from '@/lib/tiktok'

function callbackHtml(payload: { success: boolean; message: string }) {
  const serialized = JSON.stringify({ type: 'tiktok-oauth', ...payload })

  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #0f1115; color: white; display: grid; place-items: center; min-height: 100vh;">
    <p>${payload.message}</p>
    <script>
      const payload = ${serialized};
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
      }
      setTimeout(() => window.close(), 400);
    </script>
  </body>
</html>`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error') || url.searchParams.get('error_description')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('tiktok_oauth_state')?.value
  const codeVerifier = cookieStore.get('tiktok_oauth_verifier')?.value

  cookieStore.delete('tiktok_oauth_state')
  cookieStore.delete('tiktok_oauth_verifier')

  if (error) {
    return new Response(callbackHtml({ success: false, message: error }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return new Response(callbackHtml({ success: false, message: 'TikTok authorization could not be verified.' }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(callbackHtml({ success: false, message: 'You must be signed in before connecting TikTok.' }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const token = await exchangeTikTokCode(code, codeVerifier)
    const creatorInfo = await queryTikTokCreatorInfo(token.access_token)
    await upsertTikTokAccount(user.id, token, creatorInfo)

    return new Response(callbackHtml({ success: true, message: 'TikTok connected. You can close this window.' }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TikTok connection failed.'
    return new Response(callbackHtml({ success: false, message }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
