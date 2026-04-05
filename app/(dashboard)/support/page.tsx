import { SupportPageClient } from '@/components/dashboard/SupportPageClient'
import { getSupportTickets } from '@/lib/data/dashboard'
import { PageWrapper } from '@/components/dashboard/PageWrapper'

export default async function SupportPage() {
  const initialTickets = await getSupportTickets()
  return <PageWrapper><SupportPageClient initialTickets={initialTickets} /></PageWrapper>
}
