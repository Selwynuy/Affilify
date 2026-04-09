import { describe, expect, it, vi } from 'vitest'

const verifyAdmin = vi.hoisted(() => vi.fn())

vi.mock('@/lib/admin/auth', () => ({ verifyAdmin }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { createTemplate, updateTemplate } from './templates'

describe('template actions', () => {
  it('createTemplate returns unauthorized when admin check fails', async () => {
    verifyAdmin.mockResolvedValue(null)
    const form = new FormData()
    form.set('title', 'Template')
    form.set('category', 'avatar')
    const result = await createTemplate({}, form)
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('updateTemplate validates missing template id', async () => {
    verifyAdmin.mockResolvedValue({ id: 'u1' })
    const form = new FormData()
    form.set('title', 'Template')
    form.set('category', 'avatar')
    const result = await updateTemplate({}, form)
    expect(result).toEqual({ error: 'Missing template ID' })
  })
})
