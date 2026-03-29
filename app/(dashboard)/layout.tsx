import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { Sidebar } from '@/components/dashboard/sidebar'
import { createClient } from '@/lib/supabase/server'
import { PreferencesProvider } from '@/lib/context/preferences-context'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import { DEFAULT_CAMERA_TEMPLATE_ID, DEFAULT_MOVEMENT_TEMPLATE_ID } from '@/lib/data/templates'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('onboarding_completed, avatar_config, background_config, camera_template_id, movement_template_id')
    .eq('user_id', session.user.id)
    .single()

  if (!prefs || !prefs.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <PreferencesProvider
      initialAvatarConfig={(prefs.avatar_config as AvatarConfig) ?? null}
      initialBackgroundConfig={(prefs.background_config as BackgroundConfig) ?? null}
      initialCameraTemplateId={(prefs.camera_template_id as string) ?? DEFAULT_CAMERA_TEMPLATE_ID}
      initialMovementTemplateId={(prefs.movement_template_id as string) ?? DEFAULT_MOVEMENT_TEMPLATE_ID}
    >
      <div className="flex h-screen overflow-hidden bg-brand-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-20 lg:pt-10 px-4 pb-10 sm:px-6 md:px-10 md:pt-10">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </PreferencesProvider>
  )
}
