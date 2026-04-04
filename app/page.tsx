import LandingPage from '@/components/landing/landing-page'
import { verifySession } from '@/lib/dal'

export default async function Home() {
  const session = await verifySession()

  return (
    <LandingPage
      user={session?.user?.email ? { email: session.user.email } : null}
    />
  )
}
