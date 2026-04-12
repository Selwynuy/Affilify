/* eslint-disable @typescript-eslint/no-explicit-any */

import { getPlan } from '@/lib/data/plans'
import type { PlanId } from '@/lib/types/billing'

export const FREE_PLAN_STORAGE_BYTES = 300 * 1024 * 1024

interface UserStorageSummary {
  usedBytes: number
  fileCount: number
  limitBytes: number
  planId: PlanId | null
}

export class StorageLimitError extends Error {
  limitBytes: number
  usedBytes: number
  requestedBytes: number

  constructor(message: string, options: { limitBytes: number; usedBytes: number; requestedBytes: number }) {
    super(message)
    this.name = 'StorageLimitError'
    this.limitBytes = options.limitBytes
    this.usedBytes = options.usedBytes
    this.requestedBytes = options.requestedBytes
  }
}

function getStorageLimitBytes(planId: PlanId | null): number {
  if (!planId) return FREE_PLAN_STORAGE_BYTES
  return getPlan(planId).storageGb * 1024 * 1024 * 1024
}

function joinStoragePath(basePath: string, childName: string): string {
  return basePath ? `${basePath}/${childName}` : childName
}

function splitStoragePath(path: string): { parent: string; name: string } {
  const segments = path.split('/').filter(Boolean)
  const name = segments.pop() ?? ''
  return {
    parent: segments.join('/'),
    name,
  }
}

async function sumBucketPath(
  admin: any,
  bucket: string,
  path: string,
): Promise<{ usedBytes: number; fileCount: number }> {
  let usedBytes = 0
  let fileCount = 0
  let offset = 0

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(path, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw new Error(`Failed to inspect storage quota usage: ${error.message}`)
    }

    const entries = data ?? []
    for (const entry of entries) {
      const name = typeof entry.name === 'string' ? entry.name : ''
      if (!name) continue

      const size = typeof entry.metadata?.size === 'number' ? entry.metadata.size : null
      if (size != null) {
        usedBytes += size
        fileCount += 1
        continue
      }

      const nested = await sumBucketPath(admin, bucket, joinStoragePath(path, name))
      usedBytes += nested.usedBytes
      fileCount += nested.fileCount
    }

    if (entries.length < 1000) break
    offset += entries.length
  }

  return { usedBytes, fileCount }
}

async function getStoredObjectSize(admin: any, bucket: string, path: string): Promise<number> {
  const { parent, name } = splitStoragePath(path)
  if (!name) return 0

  const { data, error } = await admin.storage.from(bucket).list(parent, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    throw new Error(`Failed to inspect existing storage object: ${error.message}`)
  }

  const match = (data ?? []).find((entry: { name?: string }) => entry.name === name) as {
    metadata?: { size?: number } | null
  } | undefined

  return typeof match?.metadata?.size === 'number' ? match.metadata.size : 0
}

async function getActivePlanId(
  admin: any,
  userId: string,
): Promise<PlanId | null> {
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .single()

  return sub?.status === 'active' ? sub.plan_id : null
}

export async function getUserStorageSummary(
  admin: any,
  userId: string,
): Promise<UserStorageSummary> {
  const { data: storageFiles } = await admin
    .from('storage_files')
    .select('size_bytes')
    .eq('user_id', userId)

  const trackedBytes = (storageFiles ?? []).reduce(
    (total: number, file: { size_bytes: number | null }) => total + Number(file.size_bytes ?? 0),
    0,
  )
  const trackedCount = (storageFiles ?? []).length
  const uploads = await sumBucketPath(admin, 'uploads', userId)
  const userModels = await sumBucketPath(admin, 'generated', `user-models/${userId}`)
  const planId = await getActivePlanId(admin, userId)

  return {
    usedBytes: trackedBytes + uploads.usedBytes + userModels.usedBytes,
    fileCount: trackedCount + uploads.fileCount + userModels.fileCount,
    limitBytes: getStorageLimitBytes(planId),
    planId,
  }
}

export async function assertStorageCapacity(
  admin: any,
  userId: string,
  bytesToAdd: number,
  options?: {
    replacingObject?: {
      bucket: string
      path: string
    }
  },
): Promise<void> {
  const requestedBytes = Math.max(0, Number(bytesToAdd) || 0)
  if (requestedBytes === 0) return

  const summary = await getUserStorageSummary(admin, userId)
  const replacedBytes = options?.replacingObject
    ? await getStoredObjectSize(admin, options.replacingObject.bucket, options.replacingObject.path)
    : 0
  const netNewBytes = Math.max(0, requestedBytes - replacedBytes)
  if (summary.usedBytes + netNewBytes <= summary.limitBytes) return

  const planLabel = summary.planId ? `${getPlan(summary.planId).name} plan` : 'free plan'
  throw new StorageLimitError(
    `Storage limit exceeded. Your ${planLabel} allows ${Math.round(summary.limitBytes / (1024 * 1024))} MB total storage.`,
    {
      limitBytes: summary.limitBytes,
      usedBytes: summary.usedBytes,
      requestedBytes: netNewBytes,
    },
  )
}
