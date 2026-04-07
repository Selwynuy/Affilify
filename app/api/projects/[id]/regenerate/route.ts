import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, verifySameOrigin } from '@/lib/security'

type Params = { params: Promise<{ id: string }> }

// Triggers a new generation round using the project's stored avatar config
// and its latest product images. Delegates to /api/generate.
export async function POST(req: NextRequest, { params }: Params) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify ownership and that product images exist
  const { data: project } = await admin
    .from('projects')
    .select('id, avatar')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: productImages } = await admin
    .from('project_images')
    .select('id')
    .eq('project_id', id)
    .eq('kind', 'product')
    .limit(1)

  if (!productImages || productImages.length === 0) {
    return NextResponse.json(
      { error: 'No product images found. Upload products before regenerating.' },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const cameraTemplateId = isUuid(body?.cameraTemplateId) ? body.cameraTemplateId : undefined

  // Forward to the generate endpoint — it uses the stored avatar config and product images
  const generateRes = await fetch(new URL('/api/generate', req.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward the original cookies so the session is verified
      cookie: req.headers.get('cookie') ?? '',
      origin: req.headers.get('origin') ?? '',
    },
    body: JSON.stringify({
      projectId: id,
      productDescription: body?.productDescription ?? '',
      cameraTemplateId,
    }),
  })

  // Stream the response directly back to the caller
  return new Response(generateRes.body, {
    status: generateRes.status,
    headers: {
      'Content-Type': generateRes.headers.get('Content-Type') ?? 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
