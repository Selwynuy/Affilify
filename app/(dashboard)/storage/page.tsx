import { StoragePageClient } from '@/components/dashboard/StoragePageClient'
import { getStoragePageData } from '@/lib/data/dashboard'

export default async function StoragePage() {
  const initialData = await getStoragePageData()
  return <StoragePageClient initialData={initialData} />
}
