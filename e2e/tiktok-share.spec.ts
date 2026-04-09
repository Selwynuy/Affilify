import { test, expect } from '@playwright/test'

test('tiktok endpoints require auth', async ({ request }) => {
  const accountRes = await request.get('/api/tiktok/account')
  const shareRes = await request.post('/api/tiktok/share', {
    data: { storageFileId: '11111111-1111-1111-1111-111111111111', privacyLevel: 'SELF_ONLY' },
  })
  expect([401, 403]).toContain(accountRes.status())
  expect([401, 403]).toContain(shareRes.status())
})
