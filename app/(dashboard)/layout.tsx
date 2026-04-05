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
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
} from '@/lib/preferences'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('avatar_config, background_config, camera_template_id, movement_template_id')
    .eq('user_id', session.user.id)
    .single()

  const templateDefaults = await getMarketplaceTemplateDefaults()
  const {
    avatar: avatarTemplates,
    background: backgroundTemplates,
    camera: cameraTemplates,
    movement: movementTemplates,
  } =
    await getPublishedMarketplaceTemplateGroups()

  const defaultAvatarTemplate =
    avatarTemplates.find((template) => template.id === templateDefaults.avatarTemplateId)
    ?? avatarTemplates[0]
    ?? null
  const defaultBackgroundTemplate =
    backgroundTemplates.find((template) => template.id === templateDefaults.backgroundTemplateId)
    ?? backgroundTemplates[0]
    ?? null

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

  const initialAvatarConfig =
    (prefs?.avatar_config as AvatarConfig | null) ?? buildAvatarConfigFromTemplate(defaultAvatarTemplate)
  const initialBackgroundConfig =
    (prefs?.background_config as BackgroundConfig | null) ?? buildBackgroundConfigFromTemplate(defaultBackgroundTemplate)

  return (
    <TokenProvider>
      <PreferencesProvider
        initialAvatarConfig={initialAvatarConfig}
        initialBackgroundConfig={initialBackgroundConfig}
        initialCameraTemplateId={initialCameraTemplateId}
        initialMovementTemplateId={initialMovementTemplateId}
      >
        <div className="flex h-screen overflow-hidden bg-brand-bg">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            {children}
          </main>
        </div>
      </PreferencesProvider>
    </TokenProvider>
  )
}
