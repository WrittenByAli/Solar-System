import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, mockCommunityReviews, MOCK_COMMUNITY_REVIEWS } from './helpers.js'

test.describe('Reviews page', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
    await mockCommunityReviews(page)
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
    expect(initial).toBe(MOCK_COMMUNITY_REVIEWS.length)

    await page.locator('.rv-filter-pill').filter({ hasText: 'Mars' }).click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Mars Rover Telemetry Pipelines')

    await page.locator('.rv-filter-pill--gold').filter({ hasText: 'All planets' }).click()
    await expect(cards).toHaveCount(MOCK_COMMUNITY_REVIEWS.length)

    await page.getByTestId('reviews-reviewer-filter').fill('e2e_reviewer')
    await expect(cards).toHaveCount(2)
  })

  test('search debounces and filters results', async ({ page }) => {
    await page.goto(hashUrl('/reviews'))
    await page.getByTestId('reviews-search').fill('telemetry')
    await expect(page.getByTestId('review-feed-card')).toHaveCount(1)
    await expect(page.getByText('Mars Rover Telemetry Pipelines')).toBeVisible()
  })

  test('empty state when no reviews exist', async ({ page }) => {
    await mockCommunityReviews(page, [])
    await page.goto(hashUrl('/reviews'))
    await expect(page.getByTestId('reviews-empty')).toBeVisible()
    await expect(page.getByText(/no community reviews yet/i)).toBeVisible()
  })

  test('error state with retry', async ({ page }) => {
    await page.route(/\/rest\/v1\/public_community_reviews/, async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'upstream failure' }) })
    })
    await page.goto(hashUrl('/reviews'))
    await expect(page.getByTestId('reviews-error')).toBeVisible()
    await mockCommunityReviews(page)
    await page.getByRole('button', { name: /try again/i }).click()
    await expect(page.getByTestId('review-feed-card')).toHaveCount(MOCK_COMMUNITY_REVIEWS.length)
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
    await expect(card.locator('.rv-community-card__metrics')).toBeVisible()
  })
})
