import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Files list
  const { data: rawFiles } = await admin
    .from('storage_files')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Refresh signed URLs for Supabase-hosted files (generated_image, product_image, face_upload)
  // Videos from Replicate are external URLs that don't expire
  const files = await Promise.all((rawFiles ?? []).map(async (file) => {
    if (file.file_type === 'generated_video') return file // external URL, no refresh needed
    if (file.public_url) return file // already has a URL, use it
    // No URL yet — generate a fresh signed URL
    const bucket = file.file_type === 'generated_image' ? 'generated' : 'uploads'
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(file.storage_path, 60 * 60 * 24 * 7)
    if (signed?.signedUrl) {
      // Persist so next load is instant
      await admin.from('storage_files').update({ public_url: signed.signedUrl }).eq('id', file.id)
      return { ...file, public_url: signed.signedUrl }
    }
    return file
  }))

  // Usage aggregate
  const { data: usage } = await admin
    .from('user_storage_usage')
    .select('file_count, total_bytes')
    .eq('user_id', user.id)
    .single()

  // Plan storage limit
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', user.id)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const limitBytes = (plan?.storageGb ?? 0) * 1024 * 1024 * 1024

  return NextResponse.json({
    files: files ?? [],
    usedBytes: Number(usage?.total_bytes ?? 0),
    fileCount: Number(usage?.file_count ?? 0),
    limitBytes,
    planId,
  })
}
