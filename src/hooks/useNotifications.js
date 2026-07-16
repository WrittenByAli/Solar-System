import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import {
    fetchRecentNotifications,
    fetchUnseenCount,
    markAllNotificationsRead,
    markAllNotificationsSeen,
    markNotificationRead,
} from '../utils/notifications.js'

/**
 * Hybrid Realtime + polling notification data layer.
 *
 * Primary channel: Supabase Realtime (postgres_changes on `notifications`,
 * scoped to the caller's own user_id -- RLS's notifications_read_own policy
 * applies to Realtime subscriptions the same way it applies to normal
 * queries, so no separate access-control step is needed here).
 *
 * Polling is a FALLBACK, not the primary mechanism: while Realtime reports
 * `connected`, polling backs off to POLL_MS_CONNECTED (a slow safety net --
 * catches anything a dropped event might have missed, e.g. a Realtime
 * message lost between disconnect detection and reconnect). The moment
 * Realtime reports anything other than SUBSCRIBED, polling switches to
 * POLL_MS_DISCONNECTED so the badge doesn't go stale for up to a minute
 * while the socket is down.
 *
 * Reconnect uses exponential backoff (1s -> 2s -> 4s ... capped at 30s),
 * reset to the base delay on every successful SUBSCRIBED.
 *
 * Cross-tab sync: a BroadcastChannel announces every locally-applied change
 * (new notification arriving, one/all marked read, all marked seen) so sibling tabs update
 * instantly without their own network round-trip or duplicate Realtime
 * event handling. Falls back to `storage` events on browsers without
 * BroadcastChannel (Safari < 15.4, some in-app webviews).
 */

const POLL_MS_CONNECTED = 60_000
const POLL_MS_DISCONNECTED = 15_000
const BACKOFF_BASE_MS = 1_000
const BACKOFF_MAX_MS = 30_000
const BROADCAST_CHANNEL_NAME = 'solar-archive-notifications'
const STORAGE_FALLBACK_KEY = 'sa-notif-broadcast'

function makeCrossTabBus() {
    // BroadcastChannel is unavailable on Safari < 15.4 and some webviews --
    // fall back to a storage-event ping (any write to a shared localStorage
    // key fires 'storage' in OTHER tabs, never the writing tab itself,
    // which is exactly BroadcastChannel's own semantics too).
    if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        return {
            post: (msg) => bc.postMessage(msg),
            subscribe: (handler) => {
                const listener = (e) => handler(e.data)
                bc.addEventListener('message', listener)
                return () => bc.removeEventListener('message', listener)
            },
            close: () => bc.close(),
        }
    }
    return {
        post: (msg) => {
            try { localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify({ ...msg, _t: Date.now() })) } catch { /* storage unavailable */ }
        },
        subscribe: (handler) => {
            const listener = (e) => {
                if (e.key !== STORAGE_FALLBACK_KEY || !e.newValue) return
                try { handler(JSON.parse(e.newValue)) } catch { /* malformed payload, ignore */ }
            }
            window.addEventListener('storage', listener)
            return () => window.removeEventListener('storage', listener)
        },
        close: () => {},
    }
}

const ITEMS_PAGE_SIZE = 10

export function useNotifications(userId) {
    // Badge count = UNSEEN rows (is_seen=false), not unread rows. Opening
    // the dropdown marks everything seen (badge -> 0) while is_read keeps
    // the per-item unread dots alive until items are actually clicked.
    const [unseenCount, setUnseenCount] = useState(0)
    const [items, setItems] = useState([])
    const [itemsLoaded, setItemsLoaded] = useState(false)
    const [itemsError, setItemsError] = useState(null)
    const [hasMoreItems, setHasMoreItems] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [connectionState, setConnectionState] = useState('connecting') // 'connecting' | 'connected' | 'disconnected'

    const busRef = useRef(null)
    const reconnectAttemptRef = useRef(0)
    const reconnectTimerRef = useRef(null)
    const pollTimerRef = useRef(null)
    const channelRef = useRef(null)
    const mountedRef = useRef(true)
    const itemsLimitRef = useRef(ITEMS_PAGE_SIZE)

    const refreshCount = useCallback(async () => {
        if (!userId) return
        const c = await fetchUnseenCount(userId)
        if (mountedRef.current) setUnseenCount(c)
    }, [userId])

    // Re-fetches the full window (limit resets to the current page size
    // unless `{ preserveLimit: true }` is passed) -- used for the initial
    // load and for reconciling after a reconnect/foreground event, where we
    // want the freshest first page rather than whatever "load more" had
    // previously grown the window to.
    const refreshItems = useCallback(async ({ preserveLimit = false } = {}) => {
        if (!userId) return
        if (!preserveLimit) itemsLimitRef.current = ITEMS_PAGE_SIZE
        const { data, error } = await fetchRecentNotifications(userId, itemsLimitRef.current)
        if (!mountedRef.current) return
        setItemsLoaded(true)
        if (error) {
            setItemsError(error)
            return
        }
        setItemsError(null)
        setItems(data)
        setHasMoreItems(data.length >= itemsLimitRef.current)
    }, [userId])

    // Grows the fetch window and re-fetches -- simplest correct way to
    // "load more" against a plain LIMIT query without a separate offset/
    // cursor param, and the dropdown's page sizes are small enough (tens,
    // not thousands) that re-fetching the whole window each time is cheap.
    const loadMoreItems = useCallback(async () => {
        if (!userId || loadingMore || !hasMoreItems) return
        setLoadingMore(true)
        itemsLimitRef.current += ITEMS_PAGE_SIZE
        const { data, error } = await fetchRecentNotifications(userId, itemsLimitRef.current)
        if (mountedRef.current) {
            if (!error) {
                setItems(data)
                setHasMoreItems(data.length >= itemsLimitRef.current)
            }
            setLoadingMore(false)
        }
    }, [userId, loadingMore, hasMoreItems])

    // ---- Cross-tab bus -----------------------------------------------
    useEffect(() => {
        const bus = makeCrossTabBus()
        busRef.current = bus
        const unsubscribe = bus.subscribe((msg) => {
            if (!msg || msg.userId !== userId) return
            if (msg.type === 'read') {
                // Badge untouched: a clicked item was already marked seen
                // when its dropdown opened (mark-read implies mark-seen
                // server-side, so counts stay consistent either way).
                setItems((prev) => prev.map((x) => (x.id === msg.id ? { ...x, is_read: true, is_seen: true } : x)))
            } else if (msg.type === 'read-all') {
                setItems((prev) => prev.map((x) => ({ ...x, is_read: true, is_seen: true })))
                setUnseenCount(0)
            } else if (msg.type === 'seen-all') {
                setItems((prev) => prev.map((x) => ({ ...x, is_seen: true })))
                setUnseenCount(0)
            } else if (msg.type === 'new') {
                setUnseenCount((c) => c + 1)
                setItems((prev) => (prev.some((x) => x.id === msg.row.id) ? prev : [msg.row, ...prev].slice(0, itemsLimitRef.current)))
            }
        })
        return () => { unsubscribe(); bus.close() }
    }, [userId])

    // ---- Polling fallback ----------------------------------------------
    useEffect(() => {
        if (!userId) return undefined
        clearInterval(pollTimerRef.current)
        const ms = connectionState === 'connected' ? POLL_MS_CONNECTED : POLL_MS_DISCONNECTED
        pollTimerRef.current = setInterval(refreshCount, ms)
        return () => clearInterval(pollTimerRef.current)
    }, [userId, connectionState, refreshCount])

    // ---- Realtime subscription + exponential-backoff reconnect ---------
    useEffect(() => {
        mountedRef.current = true
        if (!userId) {
            setConnectionState('disconnected')
            return undefined
        }

        let cancelled = false

        const subscribe = () => {
            if (cancelled) return
            setConnectionState('connecting')

            const channel = supabase
                .channel(`notifications:${userId}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                    (payload) => {
                        const row = payload.new
                        setItems((prev) => (prev.some((x) => x.id === row.id) ? prev : [row, ...prev].slice(0, 10)))
                        if (!row.is_seen) setUnseenCount((c) => c + 1)
                        busRef.current?.post({ type: 'new', userId, row })
                    },
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                    (payload) => {
                        const row = payload.new
                        // Reconciles state changed elsewhere (another device,
                        // or this same account's mark-all-read finishing after
                        // this tab already applied it optimistically) --
                        // idempotent, doesn't double-decrement an already-read row.
                        setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, is_read: row.is_read, is_seen: row.is_seen } : x)))
                    },
                )
                .subscribe((status) => {
                    if (cancelled) return
                    if (status === 'SUBSCRIBED') {
                        reconnectAttemptRef.current = 0
                        setConnectionState('connected')
                        // A gap may have opened while reconnecting -- catch up.
                        refreshCount()
                        if (itemsLoaded) refreshItems({ preserveLimit: true })
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
            refreshCount()
            if (itemsLoaded) refreshItems({ preserveLimit: true })
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            cancelled = true
            mountedRef.current = false
            document.removeEventListener('visibilitychange', onVisible)
            clearTimeout(reconnectTimerRef.current)
            clearInterval(pollTimerRef.current)
            if (channelRef.current) supabase.removeChannel(channelRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshCount/refreshItems/itemsLoaded intentionally excluded: re-subscribing on every items-load would tear down a healthy socket for no reason. userId is the only thing that should re-run this.
    }, [userId])

    // Initial load
    useEffect(() => {
        if (!userId) return
        refreshCount()
    }, [userId, refreshCount])

    // ---- Optimistic mutations with rollback -----------------------------
    const markRead = useCallback(async (id) => {
        const target = items.find((x) => x.id === id)
        if (!target || target.is_read) return
        // Badge untouched: the row was already marked seen when the
        // dropdown opened (markAllSeen), so is_read changes never move it.
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true, is_seen: true } : x)))
        const { ok } = await markNotificationRead(id)
        if (!ok) {
            // Roll back -- the optimistic update didn't actually persist.
            setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: target.is_read, is_seen: target.is_seen } : x)))
            return
        }
        busRef.current?.post({ type: 'read', userId, id })
    }, [items, userId])

    const markAllRead = useCallback(async () => {
        const previousItems = items
        const previousCount = unseenCount
        setItems((prev) => prev.map((x) => ({ ...x, is_read: true, is_seen: true })))
        setUnseenCount(0)
        const { ok } = await markAllNotificationsRead(userId)
        if (!ok) {
            setItems(previousItems)
            setUnseenCount(previousCount)
            return false
        }
        busRef.current?.post({ type: 'read-all', userId })
        return true
    }, [items, unseenCount, userId])

    // Called when the dropdown opens: clears the badge (is_seen) without
    // touching is_read, so unread dots survive until items are clicked.
    //
    // Deliberately identity-STABLE (deps are [userId, refreshCount] only,
    // never items/unseenCount): NotificationBell calls this from its
    // open-effect, and an identity that changed with every setItems would
    // re-fire that effect -> refreshItems -> new items array -> new
    // identity -> infinite fetch loop for as long as the dropdown is open.
    // Rollback therefore refetches the authoritative count instead of
    // restoring a captured snapshot.
    const markAllSeen = useCallback(async () => {
        setItems((prev) => (prev.some((x) => !x.is_seen) ? prev.map((x) => ({ ...x, is_seen: true })) : prev))
        setUnseenCount(0)
        const { ok } = await markAllNotificationsSeen(userId)
        if (!ok) {
            refreshCount()
            return false
        }
        busRef.current?.post({ type: 'seen-all', userId })
        return true
    }, [userId, refreshCount])

    return useMemo(() => ({
        unseenCount,
        items,
        itemsLoaded,
        itemsError,
        hasMoreItems,
        loadingMore,
        connectionState,
        refreshItems,
        loadMoreItems,
        markRead,
        markAllRead,
        markAllSeen,
    }), [unseenCount, items, itemsLoaded, itemsError, hasMoreItems, loadingMore, connectionState, refreshItems, loadMoreItems, markRead, markAllRead, markAllSeen])
}
