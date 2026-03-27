import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { GeneratePanel } from '@/components/dashboard/GeneratePanel'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

export default async function DashboardPage() {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('avatar_config, background_config')
    .eq('user_id', session!.user.id)
    .single()

  return (
    <GeneratePanel
      initialAvatarConfig={(prefs?.avatar_config as AvatarConfig) ?? null}
      initialBackgroundConfig={(prefs?.background_config as BackgroundConfig) ?? null}
    />
  )
}
