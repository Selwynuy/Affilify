import { test, expect } from '@playwright/test'

test('billing checkout endpoint is protected', async ({ request }) => {
  const res = await request.post('/api/billing/checkout', {
    data: { packId: 'basic' },
  })
  expect([401, 403]).toContain(res.status())
})
