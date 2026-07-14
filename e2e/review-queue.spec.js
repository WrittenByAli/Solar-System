import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, installMemberAuth, mockSupabaseQueue, MOCK_QUEUE_ENTRY } from './helpers.js'

test.describe('Review queue page', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
    await mockSupabaseQueue(page)
  })

  test('renders workbench with toolbar and queue', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(hashUrl('/review-queue'))
    await expect(page.getByTestId('review-queue-page')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('rq-toolbar')).toBeVisible()
    await expect(page.getByTestId('rq-list')).toBeVisible()
    await expect(page.getByTestId('rq-queue-card')).toHaveCount(1)
    await expect(page.getByText(MOCK_QUEUE_ENTRY.title)).toBeVisible()
  })

  test('accordion expand on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(hashUrl('/review-queue'))
    await page.getByTestId('rq-queue-card').click()
    await expect(page.getByTestId('rq-detail-panel')).toBeVisible()
    await expect(page.getByText(MOCK_QUEUE_ENTRY.short_summary)).toBeVisible()
    await expect(page.getByText('Forces')).toBeVisible()
    await expect(page.getByTestId('rq-grade-form')).toBeVisible()
  })

  test('accordion expand on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(hashUrl('/review-queue'))
    await page.getByTestId('rq-queue-card').click()
    await expect(page.getByTestId('rq-detail-panel')).toBeVisible()
    await expect(page.getByTestId('rq-grade-form')).toBeVisible()
  })

  test('fact-check chips and difficulty selection', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(hashUrl('/review-queue'))
    await page.getByTestId('rq-queue-card').click()

    await page.getByRole('button', { name: /^Fail$/i }).click()
    await expect(page.locator('.rq-fact-chip--fail')).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('radio', { name: /5/i }).click()
    await expect(page.getByRole('radio', { name: /5/i })).toHaveAttribute('aria-checked', 'true')
  })

  test('keyboard help sheet on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(hashUrl('/review-queue'))
    await page.getByLabel('Keyboard shortcuts').click()
    await expect(page.getByTestId('rq-keyboard-help')).toBeVisible()
    await expect(page.getByText('Next entry')).toBeVisible()
  })
})

test.describe('Review queue access control', () => {
  test('member is redirected away from review queue', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await installMemberAuth(page)
    await mockSupabaseQueue(page)
    await page.goto(hashUrl('/review-queue'))
    await expect(page).toHaveURL(/#\/leaderboard/, { timeout: 10000 })
    await context.close()
  })
})
