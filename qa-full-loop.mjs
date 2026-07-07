import { chromium } from 'playwright'

const OUT = 'C:/Users/progr/AppData/Local/Temp/claude/c--Users-progr-Downloads-Solar-System-Solar-System/c60da5f0-2529-4165-80a6-23bc61deeb30/scratchpad'
const t0 = Date.now()
const ts = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const problems = []
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))
page.on('response', (res) => {
  if (res.url().includes('supabase.co/rest') && res.status() >= 400) {
    problems.push(`[supabase ${res.status()}] ${res.request().method()} ${res.url().split('?')[0]}`)
  }
})

// 1. Login (device verification path)
await page.goto('http://localhost:5173/#/join', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#sj-email', { timeout: 30000 })
await page.fill('#sj-email', 'qa-login-check+clerk_test@example.com')
await page.fill('#sj-password', 'QaLogin!Check2026#77')
await page.click('button.sj-submit')
await page.waitForSelector('text=Verify it', { timeout: 20000 })
await page.locator('input').first().click()
await page.keyboard.type('424242', { delay: 60 })
await page.waitForTimeout(300)
await page.click('button.sj-submit')
await page.waitForURL(/#\/$/, { timeout: 20000 })
console.log(ts(), '1. LOGIN OK (device verification completed)')

// 2. Archive grid reads DB entries
await page.goto('http://localhost:5173/#/archive/earth', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const gridText = (await page.textContent('body')) || ''
console.log(ts(), '2. ARCHIVE GRID loaded, page has content:', gridText.length > 500)
await page.screenshot({ path: `${OUT}/30-archive-earth.png` })

// 3. Directory lists entries
await page.goto('http://localhost:5173/#/directory', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const dirText = (await page.textContent('body')) || ''
const dirHasEntries = /L[4-8]/.test(dirText)
console.log(ts(), '3. DIRECTORY loaded, shows layer entries:', dirHasEntries)
await page.screenshot({ path: `${OUT}/31-directory.png` })

// 4. Submit page renders without crash
await page.goto('http://localhost:5173/#/submit', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const submitText = (await page.textContent('body')) || ''
console.log(ts(), '4. SUBMIT page rendered:', submitText.length > 300)
await page.screenshot({ path: `${OUT}/32-submit.png` })

// 5. Leaderboard + reviews render
await page.goto('http://localhost:5173/#/leaderboard', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
console.log(ts(), '5. LEADERBOARD rendered:', ((await page.textContent('body')) || '').length > 300)
await page.screenshot({ path: `${OUT}/33-leaderboard.png` })

console.log('\n=== PROBLEMS ===')
console.log(problems.length ? problems.join('\n') : '(none)')
await browser.close()
