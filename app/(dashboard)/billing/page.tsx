import { BillingPageClient } from '@/components/dashboard/BillingPageClient'
import { getBillingPageData } from '@/lib/data/dashboard'

export default async function BillingPage() {
  const initialData = await getBillingPageData()
  return <BillingPageClient initialData={initialData} />
}
