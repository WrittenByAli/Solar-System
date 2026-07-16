import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Bell, CheckCheck, Inbox, RefreshCw } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { resolveNotificationVisual } from '../utils/notificationTypes.js'
import { groupByRecency, relativeTime } from '../utils/notificationGrouping.js'
import '../styles/solar-notifications.css'

const HOVER_PREVIEW_DELAY_MS = 250
const SUCCESS_FLASH_MS = 1800

/**
 * Rendered 3x simultaneously by Navbar (desktop / tablet / mobile responsive
 * variants — all three are mounted at once, CSS `hidden`/`flex` breakpoint
 * classes just toggle which is visible, they don't unmount the other two).
 * That's why Navbar owns a single `useNotifications()` instance and passes
 * its output down as the `notifications` prop -- three independent hook
 * instances would mean three separate Realtime WebSocket subscriptions, not
 * just three redundant polls.
 */
export default function NotificationBell({ userId, notifications, iconSize = 15, className = 'snav-icon-btn' }) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const navigate = useNavigate()

    const {
        unseenCount = 0,
        items = [],
        itemsLoaded = false,
        itemsError = null,
        hasMoreItems = false,
        loadingMore = false,
        connectionState = 'connecting',
        refreshItems,
        loadMoreItems,
        markRead,
        markAllRead,
        markAllSeen,
    } = notifications || {}

    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [previewId, setPreviewId] = useState(null)
    const [showClearedFlash, setShowClearedFlash] = useState(false)

    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const itemRefs = useRef([])
    const hoverTimerRef = useRef(null)
    const flashTimerRef = useRef(null)

    const grouped = useMemo(() => groupByRecency(items), [items])
    const flatItems = useMemo(() => grouped.flatMap(([, rows]) => rows), [grouped])
    // "Mark all read" keys off actual unread ITEMS (dots), not the badge --
    // the badge (unseen) is already zeroed the moment the dropdown opens.
    const hasUnreadItems = useMemo(() => items.some((x) => !x.is_read), [items])

    const closeDropdown = useCallback(() => {
        setOpen(false)
        setActiveIndex(-1)
    }, [])

    const toggleDropdown = useCallback(() => {
        setOpen((o) => !o)
    }, [])

    // On every open: refresh (cheap bounded query, covers the rare gap
    // between a dropped Realtime event and the next poll, up to 60s away)
    // and mark everything SEEN -- the badge count acknowledges the moment
    // the panel is opened, while per-item unread dots stay until clicked.
    useEffect(() => {
        if (!open || !userId) return
        refreshItems?.({ preserveLimit: true })
        markAllSeen?.()
    }, [open, userId, refreshItems, markAllSeen])

    // Standard menu pattern: focus the panel itself on open so arrow keys
    // work immediately regardless of whether items have finished loading.
    useEffect(() => {
        if (open) {
            const raf = requestAnimationFrame(() => menuRef.current?.focus())
            return () => cancelAnimationFrame(raf)
        }
        return undefined
    }, [open])

    useEffect(() => () => {
        clearTimeout(hoverTimerRef.current)
        clearTimeout(flashTimerRef.current)
    }, [])

    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, flatItems.length)
    }, [flatItems.length])

    const focusItem = useCallback((index) => {
        setActiveIndex(index)
        itemRefs.current[index]?.focus()
    }, [])

    const handleMenuKeyDown = useCallback((e) => {
        if (!flatItems.length) {
            if (e.key === 'Escape') {
                e.preventDefault()
                closeDropdown()
                triggerRef.current?.focus()
            }
            return
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                focusItem(activeIndex >= flatItems.length - 1 ? 0 : activeIndex + 1)
                break
            case 'ArrowUp':
                e.preventDefault()
                focusItem(activeIndex <= 0 ? flatItems.length - 1 : activeIndex - 1)
                break
            case 'Home':
                e.preventDefault()
                focusItem(0)
                break
            case 'End':
                e.preventDefault()
                focusItem(flatItems.length - 1)
                break
            case 'Escape':
                e.preventDefault()
                closeDropdown()
                triggerRef.current?.focus()
                break
            default:
                break
        }
    }, [flatItems.length, activeIndex, focusItem, closeDropdown])

    const handleItemClick = useCallback((n) => {
        closeDropdown()
        if (!n.is_read) markRead?.(n.id)
        navigate(resolveNotificationVisual(n).route)
    }, [navigate, markRead, closeDropdown])

    const handleMarkAllRead = useCallback(async (e) => {
        e.stopPropagation()
        // Set the flash flag BEFORE awaiting -- markAllRead's own optimistic
        // state reset runs synchronously up to its first await, so
        // this lands in the same React batch and the header transitions
        // "Mark all read" -> "All caught up" in one render with no
        // in-between frame where neither renders (which, with
        // AnimatePresence mode="wait", stalled the flash behind a phantom
        // exit transition).
        setShowClearedFlash(true)
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setShowClearedFlash(false), SUCCESS_FLASH_MS)
        const ok = await markAllRead?.()
        if (ok === false) {
            clearTimeout(flashTimerRef.current)
            setShowClearedFlash(false)
        }
    }, [markAllRead])

    const startPreview = useCallback((id, immediate = false) => {
        clearTimeout(hoverTimerRef.current)
        if (immediate) {
            setPreviewId(id)
            return
        }
        hoverTimerRef.current = setTimeout(() => setPreviewId(id), HOVER_PREVIEW_DELAY_MS)
    }, [])

    const endPreview = useCallback(() => {
        clearTimeout(hoverTimerRef.current)
        setPreviewId(null)
    }, [])

    if (!userId) return null

    const unreadCount = items.reduce((acc, x) => acc + (x.is_read ? 0 : 1), 0)
    const badgeCount = unseenCount > 9 ? '9+' : String(unseenCount)
    // role="menu" is only valid ARIA when its content actually matches the
    // required children (menuitem / group) -- during skeleton/error/empty
    // states there are none, so the role is added only once real items
    // exist (verified against axe's aria-required-children rule).
    const hasMenuItems = itemsLoaded && !itemsError && items.length > 0

    return (
        <div className="relative shrink-0">
            <button
                type="button"
                ref={triggerRef}
                onClick={toggleDropdown}
                className={`${className} relative`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={unseenCount > 0 ? `Notifications — ${unseenCount} new` : 'Notifications'}
            >
                <Bell size={iconSize} />
                <AnimatePresence>
                    {unseenCount > 0 && (
                        <motion.span
                            key={badgeCount}
                            className="sn-badge"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                            style={{ boxShadow: `0 0 0 2px ${isDark ? '#0b1424' : '#ffffff'}` }}
                            aria-hidden="true"
                        >
                            {badgeCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={closeDropdown} aria-hidden="true" />
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
                            transition={{ type: 'spring', stiffness: 480, damping: 34, mass: 0.7 }}
                            style={{ transformOrigin: 'top right' }}
                            className="sn-panel absolute right-0 top-[calc(100%+10px)] z-50"
                        >
                            <div className="sn-header">
                                <div className="sn-header__title-row">
                                    <p className="sn-header__title">
                                        Notifications
                                    </p>
                                    {unreadCount > 0 && (
                                        <span className="sn-count-pill" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                    )}
                                    {connectionState === 'disconnected' && (
                                        <span className="sn-reconnect" title="Reconnecting — updates may be delayed">
                                            <span className="sn-reconnect__dot" aria-hidden="true" />
                                            Reconnecting
                                        </span>
                                    )}
                                </div>

                                {/* No mode="wait" here on purpose -- this swap is a snappy
                                    micro-interaction (button -> success flash right after a
                                    click), not a sequential page-style transition. mode="wait"
                                    was verified to delay the flash by ~450-550ms behind the
                                    outgoing button's exit animation, which read as unresponsive. */}
                                <AnimatePresence>
                                    {showClearedFlash ? (
                                        <motion.span
                                            key="flash"
                                            className="sn-success-flash"
                                            initial={{ opacity: 0, x: 6 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <CheckCheck size={12} aria-hidden="true" />
                                            All caught up
                                        </motion.span>
                                    ) : hasUnreadItems ? (
                                        <motion.button
                                            key="mark-all"
                                            type="button"
                                            onClick={handleMarkAllRead}
                                            className="sn-mark-all"
                                            whileTap={{ scale: 0.94 }}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            Mark all read
                                        </motion.button>
                                    ) : null}
                                </AnimatePresence>
                            </div>

                            <div
                                className="sn-body"
                                ref={menuRef}
                                tabIndex={0}
                                role={hasMenuItems ? 'menu' : undefined}
                                aria-label={hasMenuItems ? 'Notifications' : undefined}
                                onKeyDown={handleMenuKeyDown}
                            >
                                {!itemsLoaded && !itemsError && (
                                    <div className="sn-skeleton-list" aria-hidden="true">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div className="sn-skeleton-row" key={i}>
                                                <span className="sn-skeleton sn-skeleton--icon" />
                                                <span className="sn-skeleton-lines">
                                                    <span className="sn-skeleton sn-skeleton--line" style={{ width: '85%' }} />
                                                    <span className="sn-skeleton sn-skeleton--line" style={{ width: '45%' }} />
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {itemsLoaded && itemsError && (
                                    <div className="sn-state sn-state--error">
                                        <AlertCircle size={22} aria-hidden="true" />
                                        <p>Couldn't load notifications.</p>
                                        <button type="button" className="sn-retry" onClick={() => refreshItems?.({ preserveLimit: true })}>
                                            <RefreshCw size={12} aria-hidden="true" />
                                            Try again
                                        </button>
                                    </div>
                                )}

                                {itemsLoaded && !itemsError && items.length === 0 && (
                                    <div className="sn-state sn-state--empty">
                                        <span className="sn-state__halo" aria-hidden="true">
                                            <Inbox size={20} />
                                        </span>
                                        <p>You're all caught up</p>
                                        <span className="sn-state__hint">New activity will show up here.</span>
                                    </div>
                                )}

                                {itemsLoaded && !itemsError && items.length > 0 && (
                                    <>
                                        {grouped.map(([label, rows]) => {
                                            const groupLabelId = `sn-group-label-${label.replace(/\s+/g, '-').toLowerCase()}`
                                            return (
                                            <div className="sn-group" role="group" aria-labelledby={groupLabelId} key={label}>
                                                <p className="sn-group__label" id={groupLabelId}>{label}</p>
                                                {rows.map((n) => {
                                                    const flatIndex = flatItems.indexOf(n)
                                                    const visual = resolveNotificationVisual(n)
                                                    const { Icon } = visual
                                                    const isPreviewing = previewId === n.id
                                                    return (
                                                        <motion.button
                                                            key={n.id}
                                                            ref={(el) => { itemRefs.current[flatIndex] = el }}
                                                            type="button"
                                                            role="menuitem"
                                                            tabIndex={-1}
                                                            whileTap={{ scale: 0.985 }}
                                                            onFocus={() => { setActiveIndex(flatIndex); startPreview(n.id, true) }}
                                                            onMouseEnter={() => startPreview(n.id)}
                                                            onMouseLeave={endPreview}
                                                            onBlur={endPreview}
                                                            onClick={() => handleItemClick(n)}
                                                            className={`sn-item${n.is_read ? ' sn-item--read' : ''}`}
                                                            style={{ '--sn-accent': visual.accent, '--sn-glow': visual.glow }}
                                                        >
                                                            <span className={`sn-item__icon${visual.pulse && !n.is_read ? ' sn-item__icon--pulse' : ''}`}>
                                                                <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                                                            </span>
                                                            <span className="sn-item__body">
                                                                <span className="sn-item__top">
                                                                    <span className="sn-item__kicker">{visual.label}</span>
                                                                    <time
                                                                        className="sn-item__time"
                                                                        dateTime={n.created_at}
                                                                        title={new Date(n.created_at).toLocaleString()}
                                                                    >
                                                                        {relativeTime(n.created_at)}
                                                                    </time>
                                                                </span>
                                                                <span className={`sn-item__message${isPreviewing ? ' sn-item__message--expanded' : ''}`}>
                                                                    {n.message}
                                                                </span>
                                                            </span>
                                                            {!n.is_read && <span className="sn-item__dot" aria-hidden="true" />}
                                                        </motion.button>
                                                    )
                                                })}
                                            </div>
                                            )
                                        })}

                                        {hasMoreItems && (
                                            <button
                                                type="button"
                                                className="sn-load-more"
                                                onClick={() => loadMoreItems?.()}
                                                disabled={loadingMore}
                                            >
                                                {loadingMore ? 'Loading…' : 'Load more'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
