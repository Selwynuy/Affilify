import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { Sidebar } from '@/components/dashboard/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/login')

  // Check onboarding status — redirect new users to complete setup
  const supabase = await createClient()
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('onboarding_completed')
    .eq('user_id', session.user.id)
    .single()

  if (!prefs || !prefs.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
