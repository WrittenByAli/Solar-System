import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth } from './helpers.js'

test.describe('Reviews page', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
  })

  test('renders scroll intro and feed', async ({ page }) => {
    await page.goto(hashUrl('/reviews'))
    await expect(page.getByTestId('reviews-page')).toBeVisible()
    await expect(page.getByTestId('reviews-intro')).toBeVisible()
    await expect(page.getByText('three independent grades.')).toBeVisible()
    await expect(page.getByTestId('reviews-feed')).toBeVisible()
  })

  test('reviewer sees open queue CTA', async ({ page }) => {
    await page.goto(hashUrl('/reviews'))
    await expect(page.getByTestId('reviews-cta-queue')).toBeVisible()
    await expect(page.getByTestId('reviews-cta-queue')).toContainText(/review queue/i)
  })

  test('feed filters and cards work', async ({ page }) => {
    await page.goto(hashUrl('/reviews'))
    const cards = page.getByTestId('review-feed-card')
    await expect(cards.first()).toBeVisible()
    const initial = await cards.count()
    expect(initial).toBeGreaterThan(0)

    await page.locator('.rv-filter-pill').filter({ hasText: 'Revision' }).click()
    await expect(cards).toHaveCount(1)

    await page.locator('.rv-filter-pill--gold').filter({ hasText: 'All' }).click()
    expect(await cards.count()).toBeGreaterThan(1)
  })

  test('scroll CTA reaches feed anchor', async ({ page }) => {
    await page.goto(hashUrl('/reviews'))
    await page.getByTestId('reviews-cta-feed').click()
    await expect(page.locator('#sa-reviews-feed')).toBeInViewport()
  })

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(hashUrl('/reviews'))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
    expect(overflow).toBe(false)
  })

  test('testimonial cards show stars and reviewer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(hashUrl('/reviews'))
    const card = page.getByTestId('review-feed-card').first()
    await expect(card).toBeVisible()
    await expect(card.locator('.rv-star-rating')).toBeVisible()
    await expect(card.locator('.rv-testimonial-card__quote')).toBeVisible()
    await expect(card.locator('.rv-testimonial-card__name')).toBeVisible()
  })
})
