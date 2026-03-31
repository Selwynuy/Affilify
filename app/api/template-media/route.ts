import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'uploads'
const TEMPLATE_MEDIA_PREFIX = 'marketplace-templates/'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')?.trim()

  if (!path || !path.startsWith(TEMPLATE_MEDIA_PREFIX)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(path)

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 })
  }

  const buffer = await data.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
