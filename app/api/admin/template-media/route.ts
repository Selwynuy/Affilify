import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAllowedMimeType, verifySameOrigin } from '@/lib/security'

const BUCKET = 'uploads'
const TEMPLATE_MEDIA_PREFIX = 'marketplace-templates'
const MAX_TEMPLATE_MEDIA_BYTES = 20 * 1024 * 1024

function sanitizeFilename(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'file'
}

export async function POST(request: NextRequest) {
  const originError = verifySameOrigin(request)
  if (originError) return originError

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
  if (file.size > MAX_TEMPLATE_MEDIA_BYTES) {
    return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 400 })
  }

  if (kind !== 'image' && kind !== 'thumbnail' && kind !== 'preview' && kind !== 'reference') {
    return NextResponse.json({ error: 'Invalid media kind' }, { status: 400 })
  }

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if ((kind === 'image' || kind === 'thumbnail') && !isImage) {
    return NextResponse.json({ error: 'Image must be an image file' }, { status: 400 })
  }

  if (kind === 'reference' && !isImage) {
    return NextResponse.json({ error: 'Reference must be an image' }, { status: 400 })
  }

  if (kind === 'preview' && !isImage && !isVideo) {
    return NextResponse.json({ error: 'Preview must be an image or video' }, { status: 400 })
  }
  if (isImage && !assertAllowedMimeType(file.type, 'image')) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
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
