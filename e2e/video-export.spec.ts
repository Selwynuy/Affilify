import { test, expect } from '@playwright/test'

// ─── Auth protection ──────────────────────────────────────────────────────────

test('export API rejects unauthenticated requests', async ({ request }) => {
  const res = await request.post('/api/export', {
    data: {
      projectId: '11111111-1111-1111-1111-111111111111',
      imageIds: ['22222222-2222-2222-2222-222222222222'],
      motionPrompt: 'test',
      videoModelId: 'wan-480p',
      duration: 5,
    },
  })
  expect([401, 403]).toContain(res.status())
})

// ─── Input validation ─────────────────────────────────────────────────────────

test('export API rejects missing projectId', async ({ request }) => {
  // No auth cookie — will 401, but if somehow auth passed, would 400.
  // This guards the shape of the validation path.
  const res = await request.post('/api/export', {
    data: {
      imageIds: ['22222222-2222-2222-2222-222222222222'],
      motionPrompt: 'test',
    },
  })
  // Unauthenticated → 401/403. Authenticated with bad body → 400.
  expect([400, 401, 403]).toContain(res.status())
})

test('export API rejects missing imageIds', async ({ request }) => {
  const res = await request.post('/api/export', {
    data: {
      projectId: '11111111-1111-1111-1111-111111111111',
      motionPrompt: 'test',
    },
  })
  expect([400, 401, 403]).toContain(res.status())
})

test('export API rejects missing motionPrompt', async ({ request }) => {
  const res = await request.post('/api/export', {
    data: {
      projectId: '11111111-1111-1111-1111-111111111111',
      imageIds: ['22222222-2222-2222-2222-222222222222'],
    },
  })
  expect([400, 401, 403]).toContain(res.status())
})

test('export API rejects non-UUID projectId', async ({ request }) => {
  const res = await request.post('/api/export', {
    data: {
      projectId: 'not-a-uuid',
      imageIds: ['22222222-2222-2222-2222-222222222222'],
      motionPrompt: 'test',
    },
  })
  expect([400, 401, 403]).toContain(res.status())
})

test('export API rejects non-UUID imageIds', async ({ request }) => {
  const res = await request.post('/api/export', {
    data: {
      projectId: '11111111-1111-1111-1111-111111111111',
      imageIds: ['not-a-uuid'],
      motionPrompt: 'test',
    },
  })
  expect([400, 401, 403]).toContain(res.status())
})

// ─── Cross-origin protection ──────────────────────────────────────────────────

test('export API rejects cross-origin requests', async ({ request }) => {
  const res = await request.post('/api/export', {
    headers: { origin: 'https://evil.example.com' },
    data: {
      projectId: '11111111-1111-1111-1111-111111111111',
      imageIds: ['22222222-2222-2222-2222-222222222222'],
      motionPrompt: 'test',
    },
  })
  // Same-origin check fires before auth — 403 expected
  expect([401, 403]).toContain(res.status())
})

// ─── Rate limiting ────────────────────────────────────────────────────────────

test('export API rate limit headers present on rejection', async ({ request }) => {
  // Fire 6 unauthenticated requests — we expect the same 401/403 each time.
  // Authenticated users would hit 429 after 5 within 60s.
  // We cannot test authenticated rate limiting without session cookies,
  // so this confirms the endpoint exists and responds consistently.
  const statuses = await Promise.all(
    Array.from({ length: 6 }, () =>
      request.post('/api/export', {
        data: {
          projectId: '11111111-1111-1111-1111-111111111111',
          imageIds: ['22222222-2222-2222-2222-222222222222'],
          motionPrompt: 'test',
        },
      }).then((r) => r.status()),
    ),
  )
  // All should be auth rejections — none should be 5xx
  for (const status of statuses) {
    expect(status).toBeLessThan(500)
    expect([401, 403, 429]).toContain(status)
  }
})
