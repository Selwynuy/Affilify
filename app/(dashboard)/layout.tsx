import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { Sidebar } from '@/components/dashboard/sidebar'
import { createClient } from '@/lib/supabase/server'
import { PreferencesProvider } from '@/lib/context/preferences-context'
import { TokenProvider } from '@/lib/context/token-context'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'
import {
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateGroups,
} from '@/lib/data/marketplace-templates'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('onboarding_completed, avatar_config, background_config, camera_template_id, movement_template_id')
    .eq('user_id', session.user.id)
    .single()

  const templateDefaults = await getMarketplaceTemplateDefaults()
  const { camera: cameraTemplates, movement: movementTemplates } =
    await getPublishedMarketplaceTemplateGroups()

  const preferredCameraTemplateId = typeof prefs?.camera_template_id === 'string'
    ? prefs.camera_template_id
    : null
  const preferredMovementTemplateId = typeof prefs?.movement_template_id === 'string'
    ? prefs.movement_template_id
    : null

  const initialCameraTemplateId = cameraTemplates.some((template) => template.id === preferredCameraTemplateId)
    ? preferredCameraTemplateId!
    : templateDefaults.cameraTemplateId
  const initialMovementTemplateId = movementTemplates.some((template) => template.id === preferredMovementTemplateId)
    ? preferredMovementTemplateId!
    : templateDefaults.movementTemplateId

  if (!prefs || !prefs.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <TokenProvider>
      <PreferencesProvider
        initialAvatarConfig={(prefs.avatar_config as AvatarConfig) ?? null}
        initialBackgroundConfig={(prefs.background_config as BackgroundConfig) ?? null}
        initialCameraTemplateId={initialCameraTemplateId}
        initialMovementTemplateId={initialMovementTemplateId}
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
    </TokenProvider>
  )
}
