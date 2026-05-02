import { describe, expect, it, vi } from 'vitest'
import { readNdjsonStream } from '@/test/helpers/stream'

const createClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const getTokenBalance = vi.hoisted(() => vi.fn())
const deductTokens = vi.hoisted(() => vi.fn())
const syncSubscriptionTokenAccrual = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const getMarketplaceTemplateDefaults = vi.hoisted(() => vi.fn())
const getPublishedMarketplaceTemplateById = vi.hoisted(() => vi.fn())
const getTemplateConfigValue = vi.hoisted(() => vi.fn())
const getGoogleVendorCostUsd = vi.hoisted(() => vi.fn())
const recordVendorCostEvent = vi.hoisted(() => vi.fn())
const assertStorageCapacity = vi.hoisted(() => vi.fn())
const resolveProjectThumbnailUrl = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/billing/tokens', () => ({ deductTokens, getTokenBalance, syncSubscriptionTokenAccrual }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/data/marketplace-templates', () => ({
  getMarketplaceTemplateDefaults,
  getPublishedMarketplaceTemplateById,
  getTemplateConfigValue,
}))
vi.mock('@/lib/analytics/profitability', () => ({
  getGoogleVendorCostUsd,
  recordVendorCostEvent,
}))
vi.mock('@/lib/storage/quota', () => ({
  StorageLimitError: class StorageLimitError extends Error {},
  assertStorageCapacity,
}))
vi.mock('@/lib/projects/thumbnail', () => ({
  resolveProjectThumbnailUrl,
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { POST } from './route'

function adminMock() {
  const projectImageInsertSingle = vi.fn(async () => ({ data: { id: 'img_1' }, error: null }))
  const from = vi.fn((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  avatar: {
                    type: 'preset',
                    avatarReferenceB64: Buffer.from('avatar').toString('base64'),
                    avatarReferenceMime: 'image/png',
                    backgroundReferenceB64: Buffer.from('bg').toString('base64'),
                    backgroundReferenceMime: 'image/png',
                  },
                },
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
      }
    }
    if (table === 'project_images') {
      const productSelectChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [{ b64_data: Buffer.from('shirt').toString('base64'), mime_type: 'image/png', position: 1 }],
            })),
          })),
        })),
      }
      const latestGeneratedChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: { storage_path: 'u1/p1/generated-0.png' }, error: null })),
                })),
              })),
            })),
          })),
        })),
      }
      return {
        select: vi.fn((fields?: string) => (fields?.includes('b64_data') ? productSelectChain : latestGeneratedChain)),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: projectImageInsertSingle })) })),
        delete: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
      }
    }
    if (table === 'storage_files') {
      return { upsert: vi.fn(async () => ({ data: null, error: null })) }
    }
    return {}
  })
  return {
    from,
    rpc: vi.fn(async () => ({ data: 1, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        remove: vi.fn(async () => ({ data: {}, error: null })),
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://signed' }, error: null })),
      })),
    },
  }
}

describe('POST /api/generate — timeout behavior', () => {
  it('emits image_error with code "timeout" and does not deduct tokens when Gemini is aborted', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })
    createAdminClient.mockReturnValue(adminMock())
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 1_000 })
    getTokenBalance.mockResolvedValue(1000)
    deductTokens.mockResolvedValue(true)
    getMarketplaceTemplateDefaults.mockResolvedValue({ shotTypeTemplateId: 'cam_1' })
    getPublishedMarketplaceTemplateById.mockResolvedValue({})
    getTemplateConfigValue.mockReturnValue('eye level')

    // Fetch immediately rejects with an AbortError when the controller signals abort.
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined
        if (!signal) return
        if (signal.aborted) {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
          return
        }
        signal.addEventListener('abort', () => {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    // Fake timers fire the 60s timeout immediately.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const resPromise = POST(new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId: '550e8400-e29b-41d4-a716-446655440000' }),
    }) as never)

    // Allow microtasks to start the fetch, then trigger the timeout.
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(61_000)

    const res = await resPromise
    vi.useRealTimers()

    expect(res.status).toBe(200)
    const chunks = await readNdjsonStream(res)
    const errorChunk = chunks.find(c => c.type === 'image_error')
    expect(errorChunk).toBeDefined()
    expect(errorChunk?.code).toBe('timeout')
    expect(deductTokens).not.toHaveBeenCalled()
    expect(chunks.at(-1)?.type).toBe('done')
    expect((chunks.at(-1) as { success: number }).success).toBe(0)
  })
})
