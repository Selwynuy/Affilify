import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySameOrigin } from '@/lib/security'
import { rateLimit } from '@/lib/db-rate-limit'
import { RATE_LIMITS } from '@/lib/rate-limit-policy'
import { getPublishedWorkflowTemplates } from '@/lib/data/marketplace-templates'

export async function GET(req: NextRequest) {
  const originError = verifySameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimit(
    `workflow-templates:user:${user.id}`,
    RATE_LIMITS.workflowTemplatesRead,
  )
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const templates = await getPublishedWorkflowTemplates()
  return NextResponse.json({ templates })
}
