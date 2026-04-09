import { test, expect } from '@playwright/test'

test('templates page is reachable', async ({ page }) => {
  await page.goto('/templates')
  await expect(page.locator('body')).toBeVisible()
})
