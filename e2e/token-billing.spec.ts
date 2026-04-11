import { test, expect } from '@playwright/test'

// ─── Token balance endpoint ───────────────────────────────────────────────────

test('billing balance endpoint requires auth', async ({ request }) => {
  const res = await request.get('/api/billing/balance')
  expect([401, 403]).toContain(res.status())
})

// ─── Billing cancel endpoint ──────────────────────────────────────────────────

test('billing cancel endpoint requires auth', async ({ request }) => {
  const res = await request.post('/api/billing/cancel', {
    data: { intentId: 'pi_test_123' },
  })
  expect([401, 403]).toContain(res.status())
})

test('billing cancel endpoint rejects missing intentId', async ({ request }) => {
  const res = await request.post('/api/billing/cancel', {
    data: {},
  })
  expect([400, 401, 403]).toContain(res.status())
})

// ─── Billing status endpoint ──────────────────────────────────────────────────

test('billing status endpoint requires auth', async ({ request }) => {
  const res = await request.get('/api/billing/status?intentId=pi_test_123')
  expect([401, 403]).toContain(res.status())
})

test('billing status endpoint rejects missing intentId', async ({ request }) => {
  const res = await request.get('/api/billing/status')
  expect([400, 401, 403]).toContain(res.status())
})

// ─── Billing checkout ─────────────────────────────────────────────────────────

test('billing checkout requires auth', async ({ request }) => {
  const res = await request.post('/api/billing/checkout', {
    data: { packId: 'basic' },
  })
  expect([401, 403]).toContain(res.status())
})

test('billing checkout rejects unknown pack ID', async ({ request }) => {
  const res = await request.post('/api/billing/checkout', {
    data: { packId: 'nonexistent-pack' },
  })
  // Auth fires first — but shape validates too
  expect([400, 401, 403]).toContain(res.status())
})

// ─── Webhook endpoint ─────────────────────────────────────────────────────────

test('billing webhook rejects requests without paymongo signature', async ({ request }) => {
  const res = await request.post('/api/billing/webhook', {
    data: { type: 'payment.paid' },
  })
  // Missing signature → 400
  expect([400]).toContain(res.status())
})

test('billing webhook rejects invalid signature', async ({ request }) => {
  const res = await request.post('/api/billing/webhook', {
    headers: { 'paymongo-signature': 'invalid_signature_value' },
    data: { type: 'payment.paid' },
  })
  expect([400]).toContain(res.status())
})

// ─── Export API — token-related scenarios ────────────────────────────────────
// These confirm the API shape for token-related rejections.
// Full 402 flow requires an authenticated session with a real DB — tested manually.

test('export API returns 4xx not 5xx for all bad anonymous requests', async ({ request }) => {
  const cases = [
    // Missing everything
    {},
    // Valid UUID but no auth
    {
      projectId: '11111111-1111-1111-1111-111111111111',
      imageIds: ['22222222-2222-2222-2222-222222222222'],
      motionPrompt: 'walk forward confidently',
      videoModelId: 'wan-480p',
      duration: 5,
    },
    // Invalid model ID
    {
      projectId: '11111111-1111-1111-1111-111111111111',
      imageIds: ['22222222-2222-2222-2222-222222222222'],
      motionPrompt: 'walk forward confidently',
      videoModelId: 'not-a-real-model',
      duration: 5,
    },
  ]

  for (const data of cases) {
    const res = await request.post('/api/export', { data })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  }
})
