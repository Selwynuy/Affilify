import { test, expect } from '@playwright/test'

test('admin routes deny anonymous access', async ({ request }) => {
  const users = await request.get('/api/admin/users')
  const tickets = await request.get('/api/admin/tickets')
  expect([401, 403]).toContain(users.status())
  expect([401, 403]).toContain(tickets.status())
})
