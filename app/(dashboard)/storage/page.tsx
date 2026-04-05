import { StoragePageClient } from '@/components/dashboard/StoragePageClient'
import { getStoragePageData } from '@/lib/data/dashboard'
import { PageWrapper } from '@/components/dashboard/PageWrapper'

export default async function StoragePage() {
  const initialData = await getStoragePageData()
  return <PageWrapper><StoragePageClient initialData={initialData} /></PageWrapper>
}
