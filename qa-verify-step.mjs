import { chromium } from 'playwright'

const OUT = 'C:/Users/progr/AppData/Local/Temp/claude/c--Users-progr-Downloads-Solar-System-Solar-System/c60da5f0-2529-4165-80a6-23bc61deeb30/scratchpad'
const TESTING_TOKEN = process.argv[2]
if (!TESTING_TOKEN) { console.error('usage: node qa-verify-step.mjs <testing_token>'); process.exit(1) }

const t0 = Date.now()
const ts = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// Append Clerk's testing token to every FAPI request → bypasses bot protection
await page.route('**://simple-bug-30.clerk.accounts.dev/**', (route) => {
  const req = route.request()
  const url = new URL(req.url())
  url.searchParams.set('__clerk_testing_token', TESTING_TOKEN)
  route.continue({ url: url.toString() })
})
// Kill Turnstile outright so clerk-js's captcha init fails fast instead of
// hanging forever in headless — the testing token satisfies the server side.
await page.route('**://challenges.cloudflare.com/**', (route) => route.abort())

// Optional third arg 'block-supabase' reproduces the failure mode where an
// extension/network blocks Supabase mid-signup (fetch rejects).
if (process.argv[3] === 'block-supabase') {
  await page.route('**://*.supabase.co/**', (route) => route.abort())
  console.log('!! supabase.co requests are BLOCKED for this run')
}

const log = []
page.on('pageerror', (e) => log.push(`${ts()} [pageerror] ${e.message}`))
page.on('response', async (res) => {
  const u = res.url()
  if (u.includes('/v1/client/sign_ups')) {
    let info = ''
    try {
      const j = await res.json()
      const r = j?.response
      info = `status=${r?.status} missing=${JSON.stringify(r?.missing_fields)} unverified=${JSON.stringify(r?.unverified_fields)} verif=${r?.verifications?.email_address?.status || ''} err=${JSON.stringify(j?.errors?.map(e => e.code) || null)}`
    } catch { info = '(unreadable)' }
    log.push(`${ts()} [signup-api] ${res.status()} ${res.request().method()} ${u.split('?')[0].replace('https://simple-bug-30.clerk.accounts.dev', '')} ${info}`)
  } else if (u.includes('supabase.co/rest')) {
    log.push(`${ts()} [supabase] ${res.status()} ${res.request().method()} ${u.split('?')[0]}`)
  }
})

await page.goto('http://localhost:5173/#/join', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#sj-email', { timeout: 30000 })
await page.click('button[role="tab"]:has-text("Sign Up")')
await page.waitForTimeout(400)

const email = `qa-verify-${Date.now()}+clerk_test@example.com`
await page.fill('#sj-first', 'QA')
await page.fill('#sj-last', 'VerifyStep')
await page.fill('#sj-email', email)
const pw = 'Xk9$mVqZ7wTn#4Lp'
await page.fill('#sj-password', pw)
await page.fill('#sj-confirm', pw)
await page.check('input[type=checkbox] >> nth=0')
await page.check('input[type=checkbox] >> nth=1')
console.log(ts(), 'submitting signup for', email)
await page.click('button.sj-submit')

// Expect the verify view
try {
  await page.waitForSelector('text=Check your email', { timeout: 30000 })
  console.log(ts(), '>> VERIFY VIEW reached')
} catch {
  console.log(ts(), '>> verify view NOT reached. Visible error:',
    await page.locator('.sj-error').first().textContent({ timeout: 1000 }).catch(() => '(none)'))
  await page.screenshot({ path: `${OUT}/50-no-verify-view.png` })
  console.log('\n=== EVENT LOG ===\n' + log.join('\n'))
  await browser.close()
  process.exit(1)
}
await page.screenshot({ path: `${OUT}/51-verify-view.png` })

// First: WRONG code — the UI must show a clear error and count attempts
await page.locator('input').first().click()
await page.keyboard.type('111111', { delay: 60 })
await page.waitForTimeout(2500)
const wrongErr = await page.locator('.sj-error').first().textContent({ timeout: 3000 }).catch(() => '(no error shown!)')
console.log(ts(), 'wrong-code feedback:', wrongErr)
await page.screenshot({ path: `${OUT}/52-wrong-code.png` })

// Then: correct test code 424242
await page.locator('input').first().click()
await page.keyboard.type('424242', { delay: 60 })
await page.waitForTimeout(500)
// OtpInput auto-submits on complete; also click Verify in case
await page.click('button.sj-submit').catch(() => {})

try {
  await page.waitForURL(/#\/$/, { timeout: 25000 })
  console.log(ts(), '>> ACCOUNT CREATED + SIGNED IN, redirected home')
  await page.waitForTimeout(3000)
} catch {
  console.log(ts(), '>> correct code did NOT complete. URL:', page.url())
  console.log(ts(), 'visible error:', await page.locator('.sj-error').first().textContent({ timeout: 1000 }).catch(() => '(none)'))
}
await page.screenshot({ path: `${OUT}/53-verify-final.png` })

console.log('\n=== EVENT LOG ===\n' + log.join('\n'))
await browser.close()
