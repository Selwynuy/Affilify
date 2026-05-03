import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
const rateLimit = vi.hoisted(() => vi.fn())
const verifySameOrigin = vi.hoisted(() => vi.fn())
const getPublishedWorkflowTemplates = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security')>('@/lib/security')
  return { ...actual, verifySameOrigin }
})
vi.mock('@/lib/data/marketplace-templates', () => ({ getPublishedWorkflowTemplates }))

import { GET } from './route'

function makeRequest() {
  return new Request('http://localhost/api/workflow-templates') as never
}

describe('GET /api/workflow-templates', () => {
  it('returns 401 when no user is authenticated', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    })

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    })
    rateLimit.mockResolvedValue({ allowed: false, resetAt: Date.now() + 1_000 })

    const res = await GET(makeRequest())
    expect(res.status).toBe(429)
  })

  it('returns the published workflow templates when allowed', async () => {
    verifySameOrigin.mockReturnValue(null)
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    })
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 1_000 })
    const fakeTemplates = [
      { id: '44444444-4444-4444-8444-444444444401', title: 'Full Outfit', category: 'workflow_template' },
    ]
    getPublishedWorkflowTemplates.mockResolvedValue(fakeTemplates)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json() as { templates: typeof fakeTemplates }
    expect(body.templates).toEqual(fakeTemplates)
  })

  it('honours the same-origin guard and short-circuits before auth', async () => {
    const blocked = new Response('forbidden', { status: 403 })
    verifySameOrigin.mockReturnValue(blocked)

    const res = await GET(makeRequest())
    expect(res).toBe(blocked)
    expect(createClient).not.toHaveBeenCalled()
  })
})
