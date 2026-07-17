import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, mockSupabaseQueue } from './helpers.js'

/**
 * Route smoke suite — every primary surface renders, throws no page errors,
 * and the global chrome (navbar) stays present. Supabase reads are mocked to
 * empty result sets so the suite exercises loading/empty states rather than
 * live data.
 */

const ROUTES = [
  ['/', 'home'],
  ['/map', 'map'],
  ['/leaderboard', 'leaderboard'],
  ['/deploy', 'deployment hub'],
  ['/reviews', 'reviews'],
  ['/review-queue', 'review queue'],
  ['/submit', 'submit'],
  ['/my-submissions', 'my submissions'],
  ['/create-archive', 'create archive'],
  ['/archive/earth', 'archive grid'],
]

function collectErrors(page) {
  const errors = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    // Network-layer noise from mocked/aborted Supabase calls is not an app bug.
    if (/net::|Failed to load resource|fetch/i.test(text)) return
    errors.push(`console.error: ${text}`)
  })
  return errors
}

test.describe('Route smoke', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
    await mockSupabaseQueue(page, [])
  })

  for (const [route, name] of ROUTES) {
    test(`${name} (${route}) renders without errors`, async ({ page }) => {
      const errors = collectErrors(page)
      await page.goto(hashUrl(route))
      // The app shell (navbar) must always be present once a route settles.
      await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 })
      // No horizontal scroll: the document must never overflow the viewport.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(0)
      expect(errors).toEqual([])
    })
  }

  test('leaderboard podium is styled (CSS chunk applied)', async ({ page }) => {
    await page.goto(hashUrl('/leaderboard'))
    const podium = page.locator('.obs-podium')
    await expect(podium).toBeVisible({ timeout: 15000 })
    // If solar-leaderboard.css failed to load, this class resolves to the
    // browser default (static / visible) — grid-based layout proves the
    // stylesheet is attached.
    const display = await podium.evaluate((el) => getComputedStyle(el).display)
    expect(['grid', 'flex']).toContain(display)
  })

  test('theme toggle switches html class and persists', async ({ page }) => {
    await page.goto(hashUrl('/leaderboard'))
    await expect(page.locator('html')).toHaveClass(/dark/)
    const toggle = page.getByRole('button', { name: /theme|light mode|dark mode/i }).first()
    if (await toggle.count()) {
      await toggle.click()
      await expect(page.locator('html')).toHaveClass(/light/)
      await page.reload()
      await expect(page.locator('html')).toHaveClass(/light/)
    }
  })

  test('unknown route falls back to home', async ({ page }) => {
    await page.goto(hashUrl('/definitely-not-a-route'))
    await expect(page).toHaveURL(/#\/$/)
  })
})
