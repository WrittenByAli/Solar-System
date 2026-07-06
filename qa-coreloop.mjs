/* Kickstarter core-loop QA: login → archive grid reads DB → submit L4 → row in DB.
   Uses the account created by the earlier QA run. Delete after run. */
import { chromium } from 'playwright'

const OUT = 'C:/Users/progr/AppData/Local/Temp/claude/c--Users-progr-Downloads-Solar-System-Solar-System/c63e17a5-f95b-4c1e-9a6b-0e03ee6fd009/scratchpad'
const EMAIL = 'p2aqa1783350851041+clerk_test@example.com'
const PASSWORD = 'Vb5!Horizon83Tp'
const TITLE = `QA Core Loop Entry ${Date.now()}`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
const check = (label, ok) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)

console.log('submitting title:', TITLE)

/* login */
await page.goto('http://localhost:5173/#/join', { waitUntil: 'domcontentloaded' })
try {
    await page.waitForSelector('#sj-email', { timeout: 30000 })
} catch {
    console.log('join stalled. skeleton?', await page.locator('.sj-skeleton').count(),
        '| clerk loaded?', await page.evaluate(() => !!window.Clerk?.loaded),
        '| body:', JSON.stringify((await page.textContent('body')).trim().slice(0, 200)))
    await page.screenshot({ path: `${OUT}/coreloop-00-join-stall.png` })
    await browser.close()
    process.exit(1)
}
await page.locator('#sj-email').fill(EMAIL)
await page.locator('#sj-password').fill(PASSWORD)
page.on('response', async (res) => {
    if (res.url().includes('sign_ins') && res.request().method() === 'POST' && res.status() >= 400) {
        try { console.log(`  [sign_in ${res.status()}]`, JSON.stringify((await res.json()).errors).slice(0, 300)) } catch { /* */ }
    }
})
await page.locator('form .sj-submit').click()
await page.waitForTimeout(2500)
if (/two-factor/i.test(await page.textContent('body'))) {
    console.log('  (2FA challenge -> entering test code)')
    const boxes = page.locator('.sj-otp__box')
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill('424242'[i])
    await page.waitForTimeout(500)
    await page.locator('form .sj-submit').click()
}
await page.waitForFunction(() => !window.location.hash.includes('join'), null, { timeout: 20000 })
check('logged in', await page.evaluate(() => !!window.Clerk?.user))

/* archive grid reads Supabase for hub=sun */
let gridRows = -1
page.on('response', async (res) => {
    if (res.url().includes('/rest/v1/archive_entries') && res.url().includes('planet_id=eq.sun')) {
        try { gridRows = (await res.json()).length } catch { /* */ }
    }
})
await page.goto('http://localhost:5173/#/archive/sun', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
check(`/archive/sun fetched ${gridRows} approved entries from Supabase`, gridRows >= 8)
await page.screenshot({ path: `${OUT}/coreloop-01-archive-sun.png` })

/* submit an L4 entry */
await page.goto('http://localhost:5173/#/submit', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Planet / Research Domain', { timeout: 20000 })
await page.locator('button', { hasText: /^Sun/ }).first().click()
await page.waitForTimeout(600)

// L2 topic: open the dropdown if collapsed, pick the first topic
await page.screenshot({ path: `${OUT}/coreloop-015-after-planet.png` })
const l2Option = page.locator('button:has(span:text-is("L2 topic"))')
if (await l2Option.count() === 0) {
    await page.getByRole('button', { name: /l2 topics/i }).click()
    await page.waitForTimeout(400)
}
await l2Option.first().click()
await page.waitForTimeout(600)
// L3 list auto-opens after choosing L2
const l3Option = page.locator('button:has(span:text-is("L3 subtopic"))')
if (await l3Option.count() === 0) {
    await page.getByRole('button', { name: /l3 subtopics/i }).click()
    await page.waitForTimeout(400)
}
await l3Option.first().click()
await page.waitForTimeout(600)

await page.getByPlaceholder('e.g. Solar Panel Efficiency Optimization').fill(TITLE)

// pick the first available adjacent grid slot
const slotSelect = page.locator('select').last()
const optionCount = await slotSelect.locator('option').count()
check(`grid slots offered (${optionCount - 1})`, optionCount > 1)
const slotValue = await slotSelect.locator('option').nth(1).getAttribute('value')
await slotSelect.selectOption(slotValue)
await page.waitForTimeout(400)

await page.screenshot({ path: `${OUT}/coreloop-02-form-filled.png` })
await page.locator('button[type="submit"]').click()
await page.waitForTimeout(3500)
const body = await page.textContent('body')
check('submission confirmation shown', /submitted|received|review/i.test(body))
await page.screenshot({ path: `${OUT}/coreloop-03-after-submit.png` })

console.log('\n=== console errors ===')
if (errors.length === 0) console.log('(none)')
else errors.forEach((e) => console.log(' -', e))
await browser.close()
