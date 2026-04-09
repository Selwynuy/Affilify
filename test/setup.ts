import { beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.restoreAllMocks()
  process.env.GOOGLE_AI_STUDIO_KEY = process.env.GOOGLE_AI_STUDIO_KEY || 'test-key'
})
