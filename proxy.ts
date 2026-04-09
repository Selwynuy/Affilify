import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|tiktok-demo.mp4|ffmpeg-core|Homepage Carousel|Introduction Section|api/reviews|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|wasm|js)$).*)',
  ],
}
