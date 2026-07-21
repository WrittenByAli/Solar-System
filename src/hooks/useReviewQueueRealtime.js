import { useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'

/**
 * Keeps the review queue (GradeSubmissions.jsx) live: Realtime is the
 * primary signal, a slow poll is the fallback safety net, matching the
 * hybrid pattern useNotifications.js already uses for the bell.
 *
 * Two tables matter, for different reasons:
 *  - archive_entries INSERT/UPDATE -- new submissions arriving, and drafts
 *    finalizing into review-eligible rows. RLS
 *    (entries_read_pending_as_reviewer) scopes what a given reviewer's
 *    session actually receives -- another user's in-progress draft never
 *    reaches this subscription at all.
 *  - reviews INSERT -- the reliable signal that an entry's status may have
 *    just changed (a 3rd review flips pending -> approved/rejected). A row
 *    LEAVING RLS visibility (e.g. status flips away from 'pending') is not
 *    guaranteed to be delivered as an UPDATE event to a reviewer who can no
 *    longer SELECT it -- reviews_read_authenticated has no such restriction
 *    (`using (true)`), so every review insertion is a trustworthy trigger
 *    to reload rather than waiting on the entry's own UPDATE event.
 *
 * onChange is debounced (multiple events arriving in a burst, e.g. 3
 * reviewers grading in quick succession, collapse into one reload) and
 * always calls the latest callback via a ref, so callers don't need to
 * memoize it.
 */
const POLL_MS_CONNECTED = 45_000
const POLL_MS_DISCONNECTED = 15_000
const BACKOFF_BASE_MS = 1_000
const BACKOFF_MAX_MS = 30_000
const DEBOUNCE_MS = 400

// Playwright's page.route() intercepts HTTP only, not WebSocket transport --
// a real subscribe() here would open a live channel against production
// Supabase on every e2e run with no way to mock it. Treat e2e like disabled.
const isE2eMode = import.meta.env.VITE_E2E === 'true'

export function useReviewQueueRealtime(enabled, onChange) {
    const [connectionState, setConnectionState] = useState('connecting')

    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const channelRef = useRef(null)
    const pollTimerRef = useRef(null)
    const reconnectTimerRef = useRef(null)
    const reconnectAttemptRef = useRef(0)
    const debounceTimerRef = useRef(null)

    useEffect(() => {
        if (!enabled || isE2eMode) {
            setConnectionState('disconnected')
            return undefined
        }

        let cancelled = false

        const triggerChange = () => {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = setTimeout(() => onChangeRef.current?.(), DEBOUNCE_MS)
        }

        const subscribe = () => {
            if (cancelled) return
            setConnectionState('connecting')

            const channel = supabase
                .channel(`review-queue-${Math.random().toString(36).slice(2)}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_entries' }, triggerChange)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'archive_entries' }, triggerChange)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, triggerChange)
                .subscribe((status) => {
                    if (cancelled) return
                    if (status === 'SUBSCRIBED') {
                        reconnectAttemptRef.current = 0
                        setConnectionState('connected')
                        // A gap may have opened while (re)connecting -- catch up.
                        triggerChange()
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        setConnectionState('disconnected')
                        scheduleReconnect()
                    }
                })

            channelRef.current = channel
        }

        const scheduleReconnect = () => {
            if (cancelled) return
            clearTimeout(reconnectTimerRef.current)
            const attempt = reconnectAttemptRef.current
            const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS)
            reconnectAttemptRef.current = attempt + 1
            reconnectTimerRef.current = setTimeout(() => {
                if (channelRef.current) supabase.removeChannel(channelRef.current)
                subscribe()
            }, delay)
        }

        subscribe()

        // Backgrounded tabs can silently drop the socket without ever firing
        // CLOSED -- re-verify (and implicitly resubscribe if needed) on
        // return to foreground rather than trusting a stale 'connected'
        // state for an indefinite background period.
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return
            triggerChange()
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVisible)
            clearTimeout(reconnectTimerRef.current)
            clearTimeout(debounceTimerRef.current)
            if (channelRef.current) supabase.removeChannel(channelRef.current)
        }
    }, [enabled])

    // ---- Polling fallback ------------------------------------------------
    useEffect(() => {
        if (!enabled) return undefined
        clearInterval(pollTimerRef.current)
        const ms = connectionState === 'connected' ? POLL_MS_CONNECTED : POLL_MS_DISCONNECTED
        pollTimerRef.current = setInterval(() => onChangeRef.current?.(), ms)
        return () => clearInterval(pollTimerRef.current)
    }, [enabled, connectionState])

    return connectionState
}
