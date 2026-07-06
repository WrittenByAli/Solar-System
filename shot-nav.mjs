import { chromium } from 'playwright'
const OUT = process.argv[2] || '.'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 500 } })

// Logged-out navbar on the join page (dark)
await page.goto('http://localhost:5173/#/join', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/nav-loggedout-dark.png` })

// toggle light
await page.locator('button[aria-label="Switch to light mode"]').first().click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/nav-loggedout-light.png` })

await browser.close()
console.log('done')
