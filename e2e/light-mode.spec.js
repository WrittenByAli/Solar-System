import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, mockSupabaseQueue } from './helpers.js'

async function useTheme(page, theme) {
  await page.addInitScript((value) => localStorage.setItem('sa-theme', value), theme)
}

async function expectHealthyPage(page) {
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('html')).toHaveClass(/light/)
  await expect.poll(() => page.locator('body').evaluate((body) => body.innerText.trim().length)).toBeGreaterThan(80)
  await expect(page.locator('.vite-error-overlay')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}

test.describe('site-wide light mode', () => {
  test.beforeEach(async ({ page }) => {
    await useTheme(page, 'light')
    await installE2eAuth(page)
    await mockSupabaseQueue(page, [])
  })

  test('uses the semantic palette across representative routes', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const routes = [
      { path: '/map', root: '.solar-map' },
      { path: '/leaderboard', root: '.obs-page' },
      { path: '/reviews', root: '.rv-page' },
      { path: '/submit', root: '.sa-submit-page' },
      { path: '/deploy', root: '.sa-deploy-page' },
    ]

    for (const route of routes) {
      await page.goto(hashUrl(route.path))
      await expect(page.locator(route.root)).toBeVisible({ timeout: 15_000 })
      await page.waitForTimeout(1_200)
      await expectHealthyPage(page)
      const tokens = await page.locator('html').evaluate((root) => {
        const styles = getComputedStyle(root)
        return {
          background: styles.getPropertyValue('--sa-bg').trim(),
          text: styles.getPropertyValue('--sa-text').trim(),
          primary: styles.getPropertyValue('--sa-btn-solid-bg').trim(),
          primaryText: styles.getPropertyValue('--sa-btn-solid-text').trim(),
          border: styles.getPropertyValue('--sa-border-default').trim(),
          focus: styles.getPropertyValue('--sa-focus').trim(),
        }
      })
      expect(tokens).toEqual({
        background: '#f1f4f6',
        text: '#17212b',
        primary: '#9a4f0e',
        primaryText: '#ffffff',
        border: '#c7d1d8',
        focus: '#087591',
      })
      await page.screenshot({ path: testInfo.outputPath(`light-${route.path.slice(1)}.png`), fullPage: true })
    }

    await page.goto(hashUrl('/reviews'))
    const primary = page.locator('.rv-btn--primary').first()
    await expect(primary).toBeVisible()
    await expect.poll(() => primary.evaluate((element) => {
      const styles = getComputedStyle(element)
      return `${styles.backgroundColor}|${styles.color}`
    })).toBe('rgb(154, 79, 14)|rgb(255, 255, 255)')
  })

  test('renders L7 and L8 as full-cell prose without cards', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    await page.goto(hashUrl('/archive/uranus'))
    await page.getByRole('button', { name: /enter archive/i }).click()
    await page.getByRole('tab', { name: 'L2' }).click()
    await page.getByRole('button', { name: /Atomic Structure & the Periodic Table/i }).click()
    await page.getByRole('button', { name: "The Periodic Table's History & Organization" }).click()
    const table = page.locator('.periodic-table')
    await table.getByRole('button', { name: /Gold.*atomic number 79/i }).click()

    await page.getByRole('tab', { name: 'L7' }).click()
    const goldDocument = () => page.locator('.deep-archive-document').filter({ has: page.getByRole('heading', { name: 'Gold (Au)', exact: true }) })
    const l7 = goldDocument()
    await expect(l7).toBeVisible()
    await expect(l7.locator('.deep-archive-document__sheet')).toHaveCount(0)
    await expect(l7.locator('.deep-archive-document__chapter')).toHaveCount(3)
    await expect(l7.locator('.deep-archive-document__chapter p')).not.toHaveCount(0)
    await page.getByText(/ENTERING ARCHIVE/i).waitFor({ state: 'detached', timeout: 4000 })
    await page.screenshot({ path: testInfo.outputPath('light-archive-l7.png'), fullPage: true })

    await l7.getByRole('button', { name: /continue to deepest record/i }).click()
    const l8 = goldDocument()
    await expect(l8).toBeVisible()
    await expect(l8.locator('.deep-archive-document__sheet')).toHaveCount(0)
    await expect(l8.locator('.deep-archive-document__chapter')).toHaveCount(3)
    await expect(l8.getByText(/Evidence and advanced notes/i)).toBeVisible()
    await page.getByText(/ENTERING ARCHIVE/i).waitFor({ state: 'detached', timeout: 4000 })
    await page.screenshot({ path: testInfo.outputPath('light-archive-l8.png'), fullPage: true })
  })
})

test('dark mode tokens remain unchanged', async ({ page }) => {
  await useTheme(page, 'dark')
  await installE2eAuth(page)
  await mockSupabaseQueue(page, [])
  await page.goto(hashUrl('/reviews'))
  await expect(page.locator('html')).toHaveClass(/dark/)
  const tokens = await page.locator('html').evaluate((root) => {
    const styles = getComputedStyle(root)
    return {
      background: styles.getPropertyValue('--sa-bg').trim(),
      text: styles.getPropertyValue('--sa-text').trim(),
      primary: styles.getPropertyValue('--sa-btn-solid-bg').trim(),
    }
  })
  expect(tokens).toEqual({ background: '#020408', text: '#f1f5f9', primary: '#f5a623' })
  await expect(page.locator('.vite-error-overlay')).toHaveCount(0)
})
