import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, mockSupabaseQueue } from './helpers.js'

test.describe('Uranus periodic-table archive branch', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
    await mockSupabaseQueue(page, [])
  })

  test('renders 118 real positions and drills an element through the shared depth stack', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(hashUrl('/archive/uranus'))
    await page.getByRole('button', { name: /enter archive/i }).click()
    await page.getByRole('tab', { name: 'L2' }).click()
    await page.getByRole('button', { name: /Atomic Structure & the Periodic Table/i }).click()
    await page.getByRole('button', { name: "The Periodic Table's History & Organization" }).click()

    const table = page.locator('.periodic-table')
    await expect(table).toBeVisible()
    await page.getByText(/ENTERING ARCHIVE/i).waitFor({ state: 'detached', timeout: 3000 })
    await expect(table.locator('.periodic-table__element')).toHaveCount(118)
    await expect(table.getByRole('button', { name: /Hydrogen.*atomic number 1/i })).toBeVisible()
    await expect(table.getByRole('button', { name: /Helium.*atomic number 2/i })).toBeVisible()
    await expect(table.getByRole('button', { name: /Oganesson.*atomic number 118/i })).toBeVisible()
    await expect(page.locator('.archive-nav-overlay')).toBeHidden()
    await expect(page.locator('.archive-controls-overlay')).toBeHidden()
    await expect(table.locator('.periodic-table__inspector-shell')).toBeHidden()
    await expect(page.locator('.archive-grid-lines')).toHaveCount(0)

    const hydrogenBox = await table.getByRole('button', { name: /Hydrogen.*atomic number 1/i }).boundingBox()
    expect(hydrogenBox?.width).toBe(64)
    expect(hydrogenBox?.height).toBe(64)
    await expect.poll(() => table.locator('.periodic-table__grid').evaluate((element) => getComputedStyle(element).gap)).toBe('0px')

    const scroller = table.locator('.periodic-table__scroll')
    const maxScrollLeft = await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)
    if (maxScrollLeft > 120) {
      await scroller.evaluate((element) => { element.scrollLeft = 120 })
      const scrollBox = await scroller.boundingBox()
      const dragX = scrollBox.x + scrollBox.width / 2
      const dragY = scrollBox.y + scrollBox.height / 2
      await page.mouse.move(dragX, dragY)
      await page.mouse.down()
      await page.mouse.move(dragX + Math.min(80, scrollBox.width / 4), dragY, { steps: 5 })
      await page.mouse.up()
      const draggedScrollLeft = await scroller.evaluate((element) => element.scrollLeft)
      expect(draggedScrollLeft).toBeLessThan(80)
      await expect(table).toBeVisible()
    }

    const hydrogenTile = table.getByRole('button', { name: /Hydrogen.*atomic number 1/i })
    await hydrogenTile.hover()
    await expect(table.locator('.periodic-table__inspector--active .periodic-table__electron')).toHaveCount(1)
    await expect(table.getByRole('img', { name: /Hydrogen atom model with 1 electron across 1 shell/i })).toBeVisible()
    await table.locator('.periodic-table__header').hover()

    const goldTile = table.getByRole('button', { name: /Gold.*atomic number 79/i })
    const goldBackground = await goldTile.evaluate((element) => getComputedStyle(element).backgroundColor)
    await goldTile.hover()
    await expect.poll(() => goldTile.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(goldBackground)
    await expect.poll(() => goldTile.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgb(255, 255, 255)')
    const inspector = table.locator('.periodic-table__inspector--active')
    await expect(inspector.getByRole('heading', { name: 'Gold' })).toBeVisible()
    await expect(inspector).toContainText('196.97 u')
    await expect(inspector.locator('.periodic-table__electron')).toHaveCount(79)

    await table.locator('.periodic-table__header').hover()
    await expect(table.locator('.periodic-table__inspector-shell')).toBeHidden()

    const initialScale = await table.locator('.periodic-table__zoom-stage').evaluate((element) => element.getBoundingClientRect().width)
    await scroller.hover({ position: { x: 200, y: 160 } })
    await page.mouse.wheel(0, -240)
    await expect.poll(() => table.locator('.periodic-table__zoom-stage').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(initialScale)

    await goldTile.hover()
    await goldTile.click()
    await expect(page.getByRole('tab', { name: 'L5' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.archive-grid-lines')).toBeVisible()
    await expect(page.getByText('Gold (Au)', { exact: true })).toBeVisible()
    await expect(page.getByText(/Gold \(Au\) is element 79/i)).toBeVisible()

    await page.getByRole('tab', { name: 'L6' }).click()
    const goldPager = () => page.locator('.deep-archive-pager').filter({ has: page.getByRole('heading', { name: 'Gold (Au)' }) })
    const l6Pager = goldPager()
    await expect(l6Pager).toBeVisible()
    await expect(l6Pager.locator('.deep-archive-pager__fact')).toContainText(/Gold has atomic number 79/i)
    const l6LayoutIssues = await l6Pager.evaluate((root) => {
      const context = root.querySelector('.deep-archive-pager__context')
      const primary = root.querySelector('.deep-archive-pager__primary')
      const content = root.querySelector('.deep-archive-pager__content')
      const footer = root.querySelector('.deep-archive-pager__footer')
      const controls = [...root.querySelectorAll('.deep-archive-pager__control')]
      const report = context?.querySelector('a[title="Report this segment for moderator review"]')
      const outside = (parent, child) => {
        const p = parent.getBoundingClientRect()
        const c = child.getBoundingClientRect()
        return c.left < p.left - 1 || c.right > p.right + 1 || c.top < p.top - 1 || c.bottom > p.bottom + 1
      }
      const intersects = (a, b) => {
        const x = a.getBoundingClientRect()
        const y = b.getBoundingClientRect()
        return x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top
      }
      return {
        contextOverflow: [...context.children].some((child) => outside(context, child)),
        primaryOverflow: [...primary.children].some((child) => outside(primary, child)),
        contentTouchesFooter: content.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 1,
        reportTouchesControl: report ? controls.some((control) => intersects(report, control)) : false,
      }
    })
    expect(l6LayoutIssues).toEqual({
      contextOverflow: false,
      primaryOverflow: false,
      contentTouchesFooter: false,
      reportTouchesControl: false,
    })
    await page.getByText(/ENTERING ARCHIVE/i).waitFor({ state: 'detached', timeout: 4_000 })
    await page.screenshot({ path: testInfo.outputPath('l6-bounded-layout.png'), fullPage: true })
    await l6Pager.locator('.deep-archive-pager__primary').click()
    await expect(l6Pager.locator('.deep-archive-pager__fact')).toContainText(/Au occupies period 6/i)
    await expect(l6Pager).toHaveAttribute('aria-label', /page 2 of/i)

    const pageLabel = await l6Pager.getAttribute('aria-label')
    const totalPages = Number(pageLabel.match(/page 2 of (\d+)/i)?.[1])
    expect(totalPages).toBeGreaterThan(2)
    for (let nextPage = 3; nextPage <= totalPages; nextPage += 1) {
      await l6Pager.press('ArrowRight')
      await expect(l6Pager).toHaveAttribute('aria-label', new RegExp(`page ${nextPage} of`, 'i'))
    }
    await l6Pager.getByRole('button', { name: 'Continue to L7' }).click()
    await expect(page.getByRole('tab', { name: 'L7' })).toHaveAttribute('aria-selected', 'true')

    const goldDocument = () => page.locator('.deep-archive-document').filter({ has: page.getByRole('heading', { name: 'Gold (Au)', exact: true }) })
    const l7Document = goldDocument()
    await expect(l7Document).toBeVisible()
    await expect(l7Document.locator('.deep-archive-document__narrative p')).not.toHaveCount(0)
    await expect(l7Document.locator('.deep-archive-document__lede')).toContainText(/Gold/i)
    await expect(page.locator('.deep-archive-pager')).toHaveCount(0)
    await expect(page.getByText(/Narrative tiles/i)).toHaveCount(0)

    await l7Document.getByRole('button', { name: /continue to deepest record/i }).click()
    await expect(page.getByRole('tab', { name: 'L8' })).toHaveAttribute('aria-selected', 'true')
    const l8Document = goldDocument()
    await expect(l8Document).toBeVisible()
    await expect(l8Document.getByText('DEEP EVIDENCE DOSSIER')).toBeVisible()
    await expect(l8Document.locator('.deep-archive-document__narrative p')).not.toHaveCount(0)
    await expect(l8Document.getByRole('heading', { name: /Evidence and advanced notes/i })).toBeVisible()
    await expect(l8Document.getByRole('heading', { name: /Source index/i })).toBeVisible()
    await expect(page.locator('.deep-archive-pager')).toHaveCount(0)
    await expect(page.getByText(/CITED FACTS & SOURCES/i)).toHaveCount(0)

    await page.getByRole('tab', { name: 'L4' }).click()
    await expect(table).toBeVisible()
    await expect(table.locator('.periodic-table__inspector-shell')).toBeHidden()

    expect(pageErrors).toEqual([])
  })

  test('keeps another Uranus topic on the standard L4 grid', async ({ page }) => {
    await page.goto(hashUrl('/archive/uranus'))
    await page.getByRole('button', { name: /enter archive/i }).click()
    await page.getByRole('tab', { name: 'L2' }).click()
    await page.getByRole('button', { name: /Atomic Structure & the Periodic Table/i }).click()
    await page.getByRole('button', { name: /Protons, Neutrons, Electrons & Atomic Number/i }).click()

    await expect(page.locator('.periodic-table')).toHaveCount(0)
    await expect(page.locator('.archive-crosshair')).toBeVisible()
    await expect(page.locator('.archive-grid-lines')).toBeVisible()
    await expect.poll(() => page.locator('.archive-grid-lines').evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('linear-gradient')
    await expect(page.getByRole('tab', { name: 'L4' })).toHaveAttribute('aria-selected', 'true')
  })
})
