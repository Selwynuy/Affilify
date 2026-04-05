import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid, verifySameOrigin } from '@/lib/security'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = verifySameOrigin(_req)
  if (originError) return originError

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid file id' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify ownership and get storage path
  const { data: file } = await admin
    .from('storage_files')
    .select('id, storage_path, user_id, file_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from Supabase Storage
  if (file.storage_path) {
    if (file.file_type === 'generated_image') {
      await admin.storage.from('generated').remove([file.storage_path])
    } else if (file.file_type !== 'generated_video') {
      await admin.storage.from('uploads').remove([file.storage_path])
    }
  }

  // Delete from DB
  await admin.from('storage_files').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
