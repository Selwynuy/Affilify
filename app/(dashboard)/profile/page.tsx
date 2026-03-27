import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettings } from '@/components/profile/ProfileSettings'
import type { AvatarConfig, BackgroundConfig, OutfitConfig } from '@/lib/types/preferences'

export default async function ProfilePage() {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('avatar_config, background_config, defaults')
    .eq('user_id', session!.user.id)
    .single()

  return (
    <ProfileSettings
      initialAvatarConfig={(prefs?.avatar_config as AvatarConfig) ?? null}
      initialBackgroundConfig={(prefs?.background_config as BackgroundConfig) ?? null}
      initialOutfit={(prefs?.defaults as OutfitConfig) ?? null}
    />
  )
}
