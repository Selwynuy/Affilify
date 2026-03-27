import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import LandingPage from '@/components/landing/landing-page'

export default async function Home() {
  const session = await verifySession()
  if (session) redirect('/dashboard')

  return <LandingPage />
}
