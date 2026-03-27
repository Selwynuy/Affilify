import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/login')
  return <>{children}</>
}
