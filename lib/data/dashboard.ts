import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTokenBalance } from '@/lib/billing/tokens'
import { getPlan } from '@/lib/data/plans'
import type { Plan, PlanId, Subscription } from '@/lib/types/billing'
import type { SupportTicket } from '@/lib/types/support'

export interface BillingPageData {
  balance: number
  planId: PlanId | null
  plan: Plan | null
  subscription: Subscription | null
}

export interface StorageFile {
  id: string
  file_name: string
  file_type: 'product_image' | 'generated_image' | 'generated_video' | 'face_upload'
  storage_path: string
  public_url: string | null
  size_bytes: number
  created_at: string
}

export interface StoragePageData {
  files: StorageFile[]
  usedBytes: number
  fileCount: number
  limitBytes: number
  planId: PlanId | null
}

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user.id
}

export async function getBillingPageData(): Promise<BillingPageData> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status, current_period_end, cancel_at_period_end, billing_interval')
    .eq('user_id', userId)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const balance = await getTokenBalance(userId)

  return {
    balance,
    planId,
    plan,
    subscription: (sub ?? null) as Subscription | null,
  }
}

export async function getStoragePageData(): Promise<StoragePageData> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: rawFiles } = await admin
    .from('storage_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const files = await Promise.all((rawFiles ?? []).map(async (file) => {
    if (file.file_type === 'generated_video' || file.public_url) return file

    const bucket = file.file_type === 'generated_image' ? 'generated' : 'uploads'
    const { data: signed } = await admin.storage
      .from(bucket)
      .createSignedUrl(file.storage_path, 60 * 60 * 24 * 7)

    if (signed?.signedUrl) {
      await admin.from('storage_files').update({ public_url: signed.signedUrl }).eq('id', file.id)
      return { ...file, public_url: signed.signedUrl }
    }

    return file
  }))

  const { data: usage } = await admin
    .from('user_storage_usage')
    .select('file_count, total_bytes')
    .eq('user_id', userId)
    .single()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .single()

  const planId = (sub?.status === 'active' ? sub.plan_id : null) as PlanId | null
  const plan = planId ? getPlan(planId) : null
  const limitBytes = (plan?.storageGb ?? 0) * 1024 * 1024 * 1024

  return {
    files: (files ?? []) as StorageFile[],
    usedBytes: Number(usage?.total_bytes ?? 0),
    fileCount: Number(usage?.file_count ?? 0),
    limitBytes,
    planId,
  }
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const userId = await getAuthenticatedUserId()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('support_tickets')
    .select('*, ticket_messages(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SupportTicket[]
}
