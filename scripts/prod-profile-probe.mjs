/* One-off production probe: signs into the DEPLOYED Vercel site with a
 * Clerk sign-in token (no password needed) and verifies the Profile page
 * renders real data instead of empty states / eternal skeletons.
 *
 * Usage: CLERK_SECRET_KEY=... node scripts/prod-profile-probe.mjs [runs]
 */
import { chromium } from '@playwright/test'

const SITE = 'https://solar-system-sandy-ten.vercel.app'
const USER_ID = 'user_3GMkaocsWmnnlqN3jiWuDtFY9D6' // QA Lattice (role: student)
const SECRET = process.env.CLERK_SECRET_KEY
if (!SECRET) throw new Error('Set CLERK_SECRET_KEY')

const runs = parseInt(process.argv[2] || '3', 10)

async function mintTicket() {
    const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, expires_in_seconds: 300 }),
    })
    if (!res.ok) throw new Error(`sign_in_tokens ${res.status}: ${await res.text()}`)
    return (await res.json()).token
}

async function probeOnce(i) {
    const ticket = await mintTicket()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    const consoleErrors = []
    const failedRequests = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('response', (res) => {
        if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`)
    })
    page.on('requestfailed', (req) => {
        // ERR_ABORTED = request cancelled by a navigation/reload — routine
        // during hard refreshes, not a network failure.
        const err = req.failure()?.errorText || ''
        if (err.includes('ERR_ABORTED')) return
        failedRequests.push(`FAILED ${req.method()} ${req.url()} (${err})`)
    })

    await page.goto(`${SITE}/#/join`, { waitUntil: 'domcontentloaded' })
    // Wait for clerk-js, then consume the sign-in ticket directly.
    await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30000 })
    await page.evaluate(async (t) => {
        const res = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: t })
        if (res.status !== 'complete') throw new Error(`sign-in status: ${res.status}`)
        await window.Clerk.setActive({ session: res.createdSessionId })
    }, ticket)

    // Hard-load the profile page fresh (this is the failure scenario:
    // cold page load where queries race clerk-js). Clerk dev instances may
    // bounce through a __clerk_db_jwt redirect that drops the hash route,
    // so after the session settles, force the route back to /profile.
    await page.goto(`${SITE}/#/profile`, { waitUntil: 'domcontentloaded' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30000 })
    if (!page.url().includes('#/profile')) {
        console.log(`(redirect bounced to ${page.url()} — renavigating)`)
        await page.evaluate(() => { window.location.hash = '#/profile' })
    }

    // The data sections render only after the Supabase queries resolve.
    let sectionsOk = true
    try {
        await page.waitForSelector('text=Field record', { timeout: 25000 })
        await page.waitForSelector('text=Activity Log', { timeout: 10000 })
    } catch {
        sectionsOk = false
    }
    const skeletons = await page.locator('.sp-skel').count()
    const errorCard = await page.locator('role=alert').count()
    const heroStats = await page.locator('.sp-hero-stat__num').count()
    const username = await page.locator('h1, h2').first().textContent().catch(() => '(none)')

    console.log(`--- run ${i} ---`)
    console.log(`sections rendered: ${sectionsOk}, skeletons left: ${skeletons}, error card: ${errorCard}, hero stats: ${heroStats}`)
    console.log(`first heading: ${username?.trim()}`)
    console.log(`console errors: ${consoleErrors.length ? consoleErrors.join(' | ') : 'none'}`)
    const relevantFailures = failedRequests.filter((f) => !f.includes('clerk-telemetry'))
    console.log(`failed requests: ${relevantFailures.length ? relevantFailures.join('\n  ') : 'none'}`)

    await browser.close()
    return sectionsOk && skeletons === 0 && relevantFailures.length === 0
}

let allOk = true
for (let i = 1; i <= runs; i++) {
    const ok = await probeOnce(i)
    if (!ok) allOk = false
}
console.log(allOk ? '\nALL RUNS PASSED' : '\nSOME RUNS FAILED')
process.exit(allOk ? 0 : 1)
