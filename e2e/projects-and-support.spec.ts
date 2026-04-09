import { test, expect } from '@playwright/test'

test('projects and support APIs are protected', async ({ request }) => {
  const projects = await request.get('/api/projects')
  const tickets = await request.get('/api/support/tickets')
  expect([401, 403]).toContain(projects.status())
  expect([401, 403]).toContain(tickets.status())
})
