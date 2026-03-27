import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { Sidebar } from '@/components/dashboard/sidebar'
import { createClient } from '@/lib/supabase/server'
import { PreferencesProvider } from '@/lib/context/preferences-context'
import type { AvatarConfig, BackgroundConfig } from '@/lib/types/preferences'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('onboarding_completed, avatar_config, background_config')
    .eq('user_id', session.user.id)
    .single()

  if (!prefs || !prefs.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <PreferencesProvider
      initialAvatarConfig={(prefs.avatar_config as AvatarConfig) ?? null}
      initialBackgroundConfig={(prefs.background_config as BackgroundConfig) ?? null}
    >
      <div className="flex min-h-screen bg-[#0f0d1a]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-20 lg:pt-10 px-6 pb-10 md:px-10 md:pt-10">
          {children}
        </main>
      </div>
    </PreferencesProvider>
  )
}
