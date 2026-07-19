import { useEffect, useRef } from 'react'

/**
 * Re-runs `refetch` when the tab returns to the foreground or the browser
 * comes back online — the two moments where previously-fetched data is most
 * likely stale or a previous fetch silently failed (offline navigation,
 * backgrounded tab, dropped socket). Rate-limited so rapid focus flapping
 * doesn't spam the network. The callback is read through a ref, so callers
 * don't need to memoize it.
 */
export function useAutoRefetch(refetch, { minIntervalMs = 5_000 } = {}) {
    const refetchRef = useRef(refetch)
    refetchRef.current = refetch
    const lastRunRef = useRef(0)

    useEffect(() => {
        const run = () => {
            const now = Date.now()
            if (now - lastRunRef.current < minIntervalMs) return
            lastRunRef.current = now
            refetchRef.current?.()
        }
        const onVisible = () => {
            if (document.visibilityState === 'visible') run()
        }
        window.addEventListener('online', run)
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            window.removeEventListener('online', run)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [minIntervalMs])
}
