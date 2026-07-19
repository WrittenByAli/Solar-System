import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast, loudly, at boot — never run with a silently broken config.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

/**
 * When Clerk is registered as a Supabase third-party auth provider
 * (Supabase dashboard → Authentication → Third-party auth → Clerk)
 * set VITE_SUPABASE_THIRD_PARTY_AUTH=true. Every request then carries
 * the Clerk session JWT, so RLS policies can match
 * auth.jwt()->>'sub' against users_profile.clerk_id.
 *
 * Leave the flag unset until that dashboard step is done — sending a
 * token Supabase can't verify would reject every request.
 */
// E2E runs (VITE_E2E=true) have no Clerk at all — Supabase calls are
// route-mocked by Playwright, so a token callback would only add latency.
const isE2eMode = import.meta.env.VITE_E2E === 'true'
const useClerkToken = !isE2eMode && import.meta.env.VITE_SUPABASE_THIRD_PARTY_AUTH === 'true'

/**
 * clerk-js loads asynchronously from Clerk's CDN. On a hard refresh the
 * first Supabase queries can fire before window.Clerk exists or before the
 * session is restored — the old callback returned null in that window, so
 * those requests went out with only the anon key. Under RLS that means
 * empty result sets with NO error: pages render their empty states and
 * never recover until a manual refresh. Waiting (bounded, once per page
 * life) for Clerk to finish loading closes that race; after the timeout we
 * degrade to the anon key exactly as before (signed-out users and
 * blocked-CDN networks must still work, without re-paying the wait on
 * every request).
 */
const CLERK_READY_TIMEOUT_MS = 5_000
const CLERK_POLL_MS = 50

let clerkBootWait = null

function waitForClerkOnce() {
    if (window.Clerk?.loaded) return null // already ready — no wait needed
    if (!clerkBootWait) {
        clerkBootWait = (async () => {
            const deadline = Date.now() + CLERK_READY_TIMEOUT_MS
            while (!(window.Clerk && window.Clerk.loaded) && Date.now() < deadline) {
                await new Promise((resolve) => setTimeout(resolve, CLERK_POLL_MS))
            }
        })()
    }
    return clerkBootWait
}

async function getClerkTokenWhenReady() {
    const wait = waitForClerkOnce()
    if (wait) await wait
    try {
        return (await window.Clerk?.session?.getToken()) ?? null
    } catch {
        return null
    }
}

/**
 * Transient-failure retry for READ requests only. A single dropped fetch
 * (navigation abort recovery, flaky mobile network, 502/503/504 from a
 * cold edge) previously surfaced as a permanently empty page. GET/HEAD are
 * idempotent so retrying is always safe; mutations are never retried —
 * a double-submitted review or entry would be worse than a visible error.
 */
const RETRYABLE_STATUS = new Set([502, 503, 504])
const RETRY_DELAYS_MS = [250, 750]

async function fetchWithReadRetry(input, init) {
    const method = String(
        init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET'),
    ).toUpperCase()
    const retryable = method === 'GET' || method === 'HEAD'

    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetch(input, init)
            if (retryable && RETRYABLE_STATUS.has(res.status) && attempt < RETRY_DELAYS_MS.length) {
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
                continue
            }
            return res
        } catch (err) {
            if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw err
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
        }
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithReadRetry },
    ...(useClerkToken && { accessToken: getClerkTokenWhenReady }),
})
