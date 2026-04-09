import { test, expect } from '@playwright/test'

test('generate API rejects unauthenticated requests', async ({ request }) => {
  const res = await request.post('/api/generate', {
    data: { projectId: '11111111-1111-1111-1111-111111111111' },
  })
  expect([401, 403]).toContain(res.status())
})
