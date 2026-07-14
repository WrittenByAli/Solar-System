import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle, XCircle } from 'lucide-react'
import { useTheme } from '../App.jsx'
import {
    fetchRecentNotifications,
    fetchUnreadCount,
    markAllNotificationsRead,
    markNotificationRead,
} from '../utils/notifications.js'

const POLL_MS = 60_000

function relativeTime(iso) {
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return ''
    const diffMs = Date.now() - then
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}

export default function NotificationBell({ userId, iconSize = 15, className = 'snav-icon-btn' }) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [items, setItems] = useState([])
    const [loaded, setLoaded] = useState(false)

    const refreshCount = useCallback(async () => {
        if (!userId) return
        setUnreadCount(await fetchUnreadCount(userId))
    }, [userId])

    useEffect(() => {
        if (!userId) return
        refreshCount()
        const id = setInterval(refreshCount, POLL_MS)
        const onFocus = () => refreshCount()
        window.addEventListener('focus', onFocus)
        return () => {
            clearInterval(id)
            window.removeEventListener('focus', onFocus)
        }
    }, [userId, refreshCount])

    const openDropdown = useCallback(() => {
        setOpen((o) => !o)
    }, [])

    useEffect(() => {
        if (!open || !userId) return
        let active = true
        fetchRecentNotifications(userId, 10).then((rows) => {
            if (active) {
                setItems(rows)
                setLoaded(true)
            }
        })
        return () => { active = false }
    }, [open, userId])

    const handleItemClick = useCallback(async (n) => {
        setOpen(false)
        if (!n.is_read) {
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
            setUnreadCount((c) => Math.max(0, c - 1))
            await markNotificationRead(n.id)
        }
        navigate('/my-submissions')
    }, [navigate])

    const handleMarkAllRead = useCallback(async (e) => {
        e.stopPropagation()
        setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
        setUnreadCount(0)
        await markAllNotificationsRead(userId)
    }, [userId])

    if (!userId) return null

    const muted = isDark ? '#64748b' : '#475569'

    return (
        <div className="relative shrink-0">
            <button
                type="button"
                onClick={openDropdown}
                className={`${className} relative`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
            >
                <Bell size={iconSize} />
                {unreadCount > 0 && (
                    <span
                        className="absolute top-0.5 right-0.5 rounded-full"
                        style={{
                            width: 8,
                            height: 8,
                            background: '#f87171',
                            boxShadow: `0 0 0 2px ${isDark ? '#0b1424' : '#ffffff'}`,
                        }}
                        aria-hidden="true"
                    />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpen(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                            className="snav-menu absolute right-0 top-[calc(100%+10px)] z-50 w-80 max-w-[92vw]"
                            role="menu"
                        >
                            <div className="flex items-center justify-between px-1 pb-2">
                                <p className="text-xs font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                    Notifications
                                </p>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        className="text-[11px] font-semibold"
                                        style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto flex flex-col gap-1">
                                {!loaded && (
                                    <p className="text-xs px-1 py-3" style={{ color: muted }}>Loading…</p>
                                )}
                                {loaded && items.length === 0 && (
                                    <p className="text-xs px-1 py-3" style={{ color: muted }}>No notifications yet.</p>
                                )}
                                {items.map((n) => {
                                    const isRejection = /rejected/i.test(n.message)
                                    const Icon = isRejection ? XCircle : CheckCircle
                                    return (
                                        <button
                                            key={n.id}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => handleItemClick(n)}
                                            className="snav-menu__item items-start text-left"
                                            style={{ opacity: n.is_read ? 0.62 : 1 }}
                                        >
                                            <Icon size={15} className="shrink-0 mt-0.5" style={{ color: isRejection ? '#f87171' : '#34d399' }} aria-hidden />
                                            <span className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-xs leading-snug whitespace-normal" style={{ color: isDark ? '#e2e8f0' : '#1f2937' }}>
                                                    {n.message}
                                                </span>
                                                <span className="text-[10px]" style={{ color: muted }}>{relativeTime(n.created_at)}</span>
                                            </span>
                                            {!n.is_read && (
                                                <span
                                                    className="shrink-0 rounded-full mt-1.5"
                                                    style={{ width: 6, height: 6, background: '#4fc3f7' }}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
