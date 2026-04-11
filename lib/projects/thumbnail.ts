export interface StorageSigner {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data?: { signedUrl?: string | null } | null }>
    }
  }
}

function isDirectUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('data:')
}

export async function resolveProjectThumbnailUrl(
  admin: StorageSigner,
  thumbnailRef: string | null | undefined,
): Promise<string | null> {
  if (!thumbnailRef) return null
  if (isDirectUrl(thumbnailRef)) return thumbnailRef

  const { data } = await admin.storage
    .from('generated')
    .createSignedUrl(thumbnailRef, 60 * 60 * 24 * 7)

  return data?.signedUrl ?? null
}
