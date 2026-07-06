import { chromium } from 'playwright'
const TOKEN = process.argv[2]
const OUT = process.argv[3] || '.'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 700 } })

await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.Clerk && window.Clerk.client, { timeout: 15000 })
await page.waitForTimeout(500)

// Consume the admin-issued sign-in ticket directly against Clerk's client SDK —
// bypasses password/MFA entirely, purely for this one-off visual QA screenshot.
await page.evaluate(async (ticket) => {
    // eslint-disable-next-line no-undef
    const clerk = window.Clerk
    await clerk.client.signIn.create({ strategy: 'ticket', ticket })
    if (clerk.client.signIn.status === 'complete') {
        await clerk.setActive({ session: clerk.client.signIn.createdSessionId })
    }
}, TOKEN)

await page.waitForTimeout(2500)
console.log('URL after ticket sign-in:', page.url())
await page.screenshot({ path: `${OUT}/nav-loggedin-dark.png` })

await page.locator('button[aria-label="Switch to light mode"]').first().click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/nav-loggedin-light.png` })

// Open the account dropdown
await page.locator('button[aria-haspopup="menu"]').first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/nav-loggedin-menu.png` })

await browser.close()
console.log('done')
