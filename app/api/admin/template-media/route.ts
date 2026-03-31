import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'uploads'
const TEMPLATE_MEDIA_PREFIX = 'marketplace-templates'

function sanitizeFilename(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'file'
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const kind = formData.get('kind')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  if (kind !== 'thumbnail' && kind !== 'preview') {
    return NextResponse.json({ error: 'Invalid media kind' }, { status: 400 })
  }

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (kind === 'thumbnail' && !isImage) {
    return NextResponse.json({ error: 'Thumbnail must be an image' }, { status: 400 })
  }

  if (kind === 'preview' && !isImage && !isVideo) {
    return NextResponse.json({ error: 'Preview must be an image or video' }, { status: 400 })
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined
  const filename = sanitizeFilename(file.name)
  const finalName = ext ? filename : `${filename}.${kind === 'preview' && isVideo ? 'mp4' : 'jpg'}`
  const path = `${TEMPLATE_MEDIA_PREFIX}/${user.id}/${Date.now()}-${finalName}`

  const admin = createAdminClient()
  const bytes = await file.arrayBuffer()
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || undefined,
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const url = `/api/template-media?path=${encodeURIComponent(path)}`

  return NextResponse.json({ url, path })
}
