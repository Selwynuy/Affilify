import { SupportPageClient } from '@/components/dashboard/SupportPageClient'
import { getSupportTickets } from '@/lib/data/dashboard'

export default async function SupportPage() {
  const initialTickets = await getSupportTickets()
  return <SupportPageClient initialTickets={initialTickets} />
}
