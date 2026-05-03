import { describe, expect, it, vi, beforeEach } from 'vitest'

const rateLimit = vi.hoisted(() => vi.fn())
const sendEmail = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db-rate-limit', () => ({ rateLimit }))
vi.mock('@/lib/email/resend', () => ({ sendEmail }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Helper: build a chainable supabase admin mock that supports the two
// call shapes used by the route:
//   admin.from('waitlist').insert(...).select('id').single()
//   admin.from('waitlist').update(...).eq('id', ...)
function stubAdmin(opts: {
  insertResult?: { data: { id: string } | null; error: { code?: string } | null }
  updateResult?: { error: { message: string } | null }
} = {}) {
  const insertResult = opts.insertResult ?? { data: { id: 'wl_1' }, error: null }
  const updateResult = opts.updateResult ?? { error: null }

  const updateChain = {
    eq: vi.fn(async () => updateResult),
  }

  const insertChain = {
    select: vi.fn(() => ({
      single: vi.fn(async () => insertResult),
    })),
  }

  const fromMock = vi.fn(() => ({
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
  }))

  createAdminClient.mockReturnValue({ from: fromMock })
  return { fromMock }
}

import { POST } from './route'

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 })
    sendEmail.mockResolvedValue(undefined)
  })

  it('inserts a valid email and sends a confirmation', async () => {
    stubAdmin()
    const res = await POST(buildRequest({ email: 'NEW@example.com' }) as never)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, alreadyOnList: false })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@example.com', subject: expect.stringContaining('waitlist') }),
    )
  })

  it('treats duplicate signups as success without resending the email', async () => {
    stubAdmin({ insertResult: { data: null, error: { code: '23505' } } })

    const res = await POST(buildRequest({ email: 'dupe@example.com' }) as never)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, alreadyOnList: true })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects invalid email with 400 and does not call the DB', async () => {
    const { fromMock } = stubAdmin()

    const res = await POST(buildRequest({ email: 'not-an-email' }) as never)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Please enter a valid email.' })
    expect(fromMock).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns 429 when rate-limited and never touches the DB or email', async () => {
    rateLimit.mockResolvedValue({ allowed: false, resetAt: Date.now() + 3600_000 })
    const { fromMock } = stubAdmin()

    const res = await POST(buildRequest({ email: 'someone@example.com' }) as never)

    expect(res.status).toBe(429)
    expect(fromMock).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns 500 when the DB insert fails for non-duplicate reasons', async () => {
    stubAdmin({ insertResult: { data: null, error: { code: '08000' } } })

    const res = await POST(buildRequest({ email: 'broken@example.com' }) as never)

    expect(res.status).toBe(500)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('lower-cases the email before storing and sending', async () => {
    const { fromMock } = stubAdmin()
    await POST(buildRequest({ email: '  HELLO@Example.COM  ' }) as never)

    // Inspect the insert call payload — first call's first arg.
    const insertArg = fromMock.mock.results[0]?.value.insert.mock.calls[0]?.[0]
    expect(insertArg.email).toBe('hello@example.com')
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'hello@example.com' }))
  })
})
