import { verifySession } from '@/lib/dal'
import LandingPage from '@/components/landing/landing-page'

export default async function Home() {
  const session = await verifySession()
  const user = session?.user.email ? { email: session.user.email } : null

  return <LandingPage user={user} />
}
