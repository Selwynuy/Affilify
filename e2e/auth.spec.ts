import { test, expect } from '@playwright/test'

test.describe('auth flow smoke', () => {
  test('login page is reachable', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('signup page is reachable', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/signup/)
  })
})
