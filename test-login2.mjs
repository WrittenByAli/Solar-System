import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console:error]', m.text()) })
page.on('response', async (res) => {
    if (res.url().includes('/v1/client/sign_ins') && res.request().method() === 'POST') {
        try {
            const json = await res.json()
            console.log('  [sign_in response]', JSON.stringify(json.response || json, null, 2).slice(0, 2000))
        } catch { /* not json */ }
    }
})

await page.goto('http://localhost:5173/#/join', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.getByLabel(/email address/i).fill('navshot@solararchive.dev')
await page.getByLabel(/^password$/i).fill('TestPass!2026Solar')
await page.locator('form .sj-submit').click()
await page.waitForTimeout(3000)
console.log('After password:', page.url())
const bodyText = await page.textContent('body')
console.log('Shows 2FA prompt:', /two-factor/i.test(bodyText))

if (/two-factor/i.test(bodyText)) {
    // Try the Clerk dev "magic" test code for phone_code verification
    const boxes = page.locator('.sj-otp__box')
    const code = '424242'
    for (let i = 0; i < code.length; i++) {
        await boxes.nth(i).fill(code[i])
    }
    await page.waitForTimeout(500)
    await page.locator('form .sj-submit').click()
    await page.waitForTimeout(3000)
    console.log('After 2FA attempt:', page.url())
    const bodyText2 = await page.textContent('body')
    console.log('Still shows error:', /invalid|failed/i.test(bodyText2))
}

await page.screenshot({ path: process.argv[2] || 'login2.png' })
await browser.close()
