import { BillingPageClient } from '@/components/dashboard/BillingPageClient'
import { getBillingPageData } from '@/lib/data/dashboard'
import { PageWrapper } from '@/components/dashboard/PageWrapper'

export default async function BillingPage() {
  const initialData = await getBillingPageData()
  return (
    <PageWrapper className="max-w-6xl">
      <BillingPageClient initialData={initialData} />
    </PageWrapper>
  )
}
