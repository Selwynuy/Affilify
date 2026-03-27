import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GEMINI_MODEL = 'gemini-2.5-flash-image'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const DEFAULT_TEMPLATE =
  `A {{gender}} {{face_description}}, {{height}} cm tall and weighing {{weight}} kg, ` +
  `stands in a modern, neatly arranged and {{room_aesthetic}} aesthetic room. ` +
  `The camera is positioned {{camera_angle}}. ` +
  `Use a {{focal_length}} focal length and an aperture of f/4-f/5.6 to keep the room details gently in focus. ` +
  `They are wearing {{outfit_top}} left loose outside their pants (untucked), paired with {{outfit_bottom}} and {{shoes}}. ` +
  `Their hands are in their pockets, gazing at the camera with an elegant and natural expression. ` +
  `The room interior is dominated by {{room_colors}}, creating a clean, modern impression. ` +
  `Room elements: {{room_elements}}. ` +
  `The product from the product reference photo must be clearly visible — held, worn, or displayed naturally. ` +
  `{{product_note}}` +
  `Visual style: Ultra-realistic fashion lifestyle photography, natural-blend studio lighting, soft shadows, symmetrical interiors. ` +
  `Aspect ratio: 9:16 vertical portrait.`

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{{${key}}}`
  )
}

function buildPrompt(avatar: Record<string, unknown>, productDescription: string): string {
  const vars: Record<string, string | number> = {
    gender:        String(avatar.gender ?? 'man'),
    face_description: avatar.type === 'preset' && avatar.promptHint
      ? String(avatar.promptHint)
      : 'with a face like the one in the face reference photo',
    height:        Number(avatar.height ?? 175),
    weight:        Number(avatar.weight ?? 70),
    room_aesthetic: String(avatar.roomAesthetic ?? 'masculine'),
    camera_angle:  String(avatar.cameraAngle ?? 'directly above the subject at 45° high-angle overhead'),
    focal_length:  String(avatar.focalLength ?? '35-50mm (natural, balanced)'),
    outfit_top:    String(avatar.outfitTop ?? 'a plain white t-shirt'),
    outfit_bottom: String(avatar.outfitBottom ?? 'dark slim-fit pants'),
    shoes:         String(avatar.shoes ?? 'Adidas Samba OG white gum shoes'),
    room_colors:   String(avatar.roomColors ?? 'white and black'),
    room_elements: String(avatar.roomElements ?? 'a dark gray round shag rug, minimalist black-framed posters, warm LED strips'),
    product_note:  productDescription ? `Product being showcased: ${productDescription}. ` : '',
  }
  return fillTemplate(DEFAULT_TEMPLATE, vars)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, productDescription } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch project avatar (includes face b64)
  const { data: project, error: projErr } = await admin
    .from('projects')
    .select('avatar')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (projErr || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const avatar: Record<string, unknown> = project.avatar ?? {}
  const { faceB64, faceMime } = avatar

  // Fetch product images (with b64 data)
  const { data: productRows } = await admin
    .from('project_images')
    .select('b64_data, mime_type, position')
    .eq('project_id', projectId)
    .eq('kind', 'product')
    .order('position')

  if (!productRows || productRows.length === 0) {
    return NextResponse.json({ error: 'No product images found for this project' }, { status: 400 })
  }

  const prompt = buildPrompt(avatar, productDescription || '')

  // Build multimodal parts: text prompt + face image (custom only) + product images
  const parts: unknown[] = [{ text: prompt }]

  // Preset avatars use a promptHint injected into the text — no face image
  const isPreset = avatar.type === 'preset'
  if (!isPreset && faceB64 && faceMime) {
    parts.push({ inlineData: { mimeType: faceMime, data: faceB64 } })
  }

  for (const row of productRows) {
    if (row.b64_data && row.mime_type) {
      parts.push({ inlineData: { mimeType: row.mime_type, data: row.b64_data } })
    }
  }

  // Clear previous generated images
  await admin.from('project_images').delete().eq('project_id', projectId).eq('kind', 'generated')

  const images: { id: string; url: string }[] = []

  // Generate 4 images one at a time (Gemini returns 1 image per call)
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GOOGLE_AI_STUDIO_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`Gemini call ${i} failed:`, err)
      continue
    }

    const data = await res.json()
    const candidate = data.candidates?.[0]
    const imagePart = candidate?.content?.parts?.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/')
    )

    if (!imagePart?.inlineData) {
      console.error(`No image in candidate ${i}`, JSON.stringify(candidate).slice(0, 300))
      continue
    }

    const { mimeType, data: b64 } = imagePart.inlineData
    const ext = mimeType === 'image/png' ? 'png' : 'jpg'
    const storagePath = `${user.id}/${projectId}/generated-${i}.${ext}`

    // Save to storage
    const buffer = Buffer.from(b64, 'base64')
    await admin.storage.from('generated').upload(storagePath, buffer, { contentType: mimeType, upsert: true })

    // Save to DB (store path, not signed URL)
    const { data: imgRow } = await admin.from('project_images').insert({
      project_id: projectId,
      user_id: user.id,
      kind: 'generated',
      url: storagePath,
      storage_path: storagePath,
      position: i,
    }).select('id').single()

    if (imgRow) {
      // Return as data URL — avoids COEP/CORP issues with Supabase signed URLs
      images.push({ id: imgRow.id, url: `data:${mimeType};base64,${b64}` })
    }
  }

  if (images.length === 0) {
    return NextResponse.json({ error: 'No images could be generated. Check server logs for details.' }, { status: 500 })
  }

  await admin.from('projects').update({ status: 'images_generated' }).eq('id', projectId)

  return NextResponse.json({ images, prompt })
}
