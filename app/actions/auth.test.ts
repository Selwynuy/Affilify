import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/email/templates/welcome', () => ({ welcomeEmail: vi.fn(() => ({ subject: 'Welcome', html: '<p>x</p>' })) }))

import { forgotPassword, resetPassword } from './auth'

describe('auth actions', () => {
  it('forgotPassword validates email and never throws user enumeration errors', async () => {
    const fd = new FormData()
    fd.set('email', '')
    expect(await forgotPassword(fd)).toEqual({ error: 'Email is required.' })
  })

  it('resetPassword validates minimum length', async () => {
    const fd = new FormData()
    fd.set('password', 'short')
    fd.set('confirm', 'short')
    expect(await resetPassword(fd)).toEqual({ error: 'Password must be at least 8 characters.' })
  })

  it('resetPassword validates matching confirmation', async () => {
    const fd = new FormData()
    fd.set('password', 'longpassword')
    fd.set('confirm', 'nomatch')
    expect(await resetPassword(fd)).toEqual({ error: 'Passwords do not match.' })
  })
})
