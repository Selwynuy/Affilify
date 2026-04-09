import { vi } from 'vitest'

type QueryResult = { data?: unknown; error?: unknown }

function makeQueryBuilder(result: QueryResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder

  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => result),
    })),
  }))
  builder.update = vi.fn(chain)
  builder.delete = vi.fn(chain)
  builder.upsert = vi.fn(async () => result)
  builder.single = vi.fn(async () => result)
  builder.rpc = vi.fn(async () => ({ data: 1, error: null }))

  return builder
}

export function createSupabaseMock(userId = 'user-1') {
  const query = makeQueryBuilder({ data: null, error: null })
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: userId, email: 'test@example.com' } } })),
    },
    from: vi.fn(() => query),
    rpc: vi.fn(async () => ({ data: 1, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        remove: vi.fn(async () => ({ data: {}, error: null })),
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://signed.local/file' }, error: null })),
      })),
    },
  }
}
