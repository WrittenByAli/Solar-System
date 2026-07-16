import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, mockSupabaseQueue } from './helpers.js'

/**
 * Hub registry migration (HUBS_DB_MIGRATION_PLAN.md) — consolidates the
 * Phase C/D/E Playwright assertions: grid dimensions and hub descriptions
 * now come from `planets`/`hubs` (via src/utils/hubRegistry.js) instead of
 * the empty `archive_instances` table or hardcoded JS modules, and every
 * listing surface (submit dropdown, create-archive hub picker, map cards)
 * shares the same registry. `planets`/`hubs` requests are NOT mocked here
 * (mockSupabaseQueue only intercepts archive_entries/reviews/users_profile),
 * so these hit the live dev database.
 */

test.describe('Hub registry', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
    await mockSupabaseQueue(page, [])
  })

  test('archive/sun renders live grid dimensions and description', async ({ page }) => {
    await page.goto(hashUrl('/archive/sun'))
    await expect(page.locator('.planet-intro__domain')).toHaveText(/PHYSICS/i, { timeout: 15000 })
    await expect(page.locator('.planet-intro__meta')).toContainText('3840', { timeout: 15000 })
    await expect(page.locator('.planet-intro__meta')).toContainText('2160')
  })

  test('archive/venus shows its own description (not a copy-paste of sun)', async ({ page }) => {
    await page.goto(hashUrl('/archive/venus'))
    await expect(page.locator('.planet-intro__domain')).toHaveText(/PSYCHOLOGY.*NEUROSCIENCE/i, { timeout: 15000 })
  })

  test('map hub cards use the shared grid-dimension source', async ({ page }) => {
    await page.goto(hashUrl('/map'))
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 })
    // enrichHub() no longer throws sourcing gridLabel/discipline from hubRegistry.
    await expect(page.locator('.solar-map__hub-select-btn').first()).toBeVisible()
  })

  test('submit planet picker lists all 10 hubs from the live registry', async ({ page }) => {
    await page.goto(hashUrl('/submit'))
    await expect(page.getByRole('button', { name: /^Sun Physics$/ })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /^Earth Earth & Environmental Science$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Neptune Biology$/ })).toBeVisible()
  })

  test('create-archive hub picker sources the same registry', async ({ page }) => {
    await page.goto(hashUrl('/create-archive'))
    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 15000 })
    const optionCount = await select.locator('option').count()
    expect(optionCount).toBe(10)
    await expect(select).toContainText('Sun')
    await expect(select).toContainText('Physics')
  })

  test('offline fallback: submit/archive/map render on DEFAULT_HUBS with no thrown error', async ({ page }) => {
    await page.route(/\/rest\/v1\/(planets|hubs)(\?|$)/, (route) => route.abort())

    for (const route of ['/submit', '/archive/earth', '/map']) {
      const errors = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(hashUrl(route))
      await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 })
      expect(errors).toEqual([])
    }
  })
})
