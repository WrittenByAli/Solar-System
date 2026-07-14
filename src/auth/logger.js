/**
 * Dev-only auth diagnostics. In production this is a no-op so no
 * account details ever reach the console; in `npm run dev` it prints
 * the exact Clerk/Supabase failure so auth bugs are diagnosable.
 */
export function reportAuthError(scope, err) {
    if (!import.meta.env.DEV) return
    const e = err?.errors?.[0]
    console.error(`[auth:${scope}]`, {
        code: e?.code || err?.code || 'unknown',
        message: e?.longMessage || e?.message || err?.message || String(err),
        status: err?.status,
        clerkTraceId: err?.clerkTraceId,
    })
}
