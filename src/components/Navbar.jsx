import React, { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sun,
    Home,
    Map,
    Trophy,
    Star,
    Upload,
    UserPlus,
    Menu,
    X,
    Moon,
    ClipboardCheck,
    LogOut,
    Package,
    Library,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import FoundationLogo from './FoundationLogo.jsx'
import { SolarWordCore } from './SolarBrandA.jsx'

const baseNavLinks = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Map', path: '/map', icon: Map },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Reviews', path: '/reviews', icon: Star },
    { label: 'Submit', path: '/submit', icon: Upload },
    { label: 'Directory', path: '/directory', icon: Library },
    { label: 'Host', path: '/host-archive', icon: Package },
]

export default function Navbar() {
    const location = useLocation()
    const { theme, toggleTheme } = useTheme()
    const { isLoggedIn, username, canAccessReviewerQueue, logout } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)

    const navLinks = useMemo(() => {
        if (!canAccessReviewerQueue) return baseNavLinks
        const reviewItem = { label: 'Review queue', path: '/review-queue', icon: ClipboardCheck }
        const i = baseNavLinks.findIndex((l) => l.path === '/leaderboard')
        const next = [...baseNavLinks]
        next.splice(i + 1, 0, reviewItem)
        return next
    }, [canAccessReviewerQueue])

    const isDark = theme === 'dark'
    const isArchive = location.pathname.startsWith('/archive/')

    if (isArchive) return null

    return (
        <nav
            className="solar-navbar fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 min-h-[3.25rem] px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] pb-2 sm:px-4 md:px-6 md:py-3"
            style={{
                background: isDark
                    ? 'rgba(2,4,8,0.85)'
                    : 'rgba(240,244,248,0.92)',
                backdropFilter: 'blur(16px)',
                borderBottom: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.12)'}`,
            }}
        >
            {/* Logo */}
            <Link
                to="/"
                aria-label="THE SOLAR ARCHIVE — Home"
                className="flex items-center gap-1.5 sm:gap-2 group select-none shrink-0 min-w-0 max-w-[calc(100vw-5.5rem)] md:max-w-none"
            >
                <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f5a623, #ff6b35)' }}
                >
                    <FoundationLogo fillCircle alt="" />
                </motion.div>
                <span
                    className="font-solar font-black text-[clamp(0.62rem,2.5vw,1rem)] xs:text-sm md:text-base tracking-tight uppercase inline-flex items-center flex-wrap min-w-0 leading-tight gap-x-[0.3em] gap-y-0.5"
                    style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                >
                    <span className="shrink-0">THE</span>
                    <SolarWordCore className="shrink-0" />
                    <span className="shrink-0">ARCHIVE</span>
                </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-wrap justify-end flex-1 min-w-0">
                {navLinks.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path || (path === '/map' && location.pathname === '/map')
                    return (
                        <Link key={path} to={path} className="shrink-0">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1.5 rounded-full text-xs xl:text-sm font-medium transition-all duration-200 relative"
                                style={{
                                    background: isActive
                                        ? isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.12)'
                                        : 'transparent',
                                    color: isActive
                                        ? isDark ? '#4fc3f7' : '#0284c7'
                                        : isDark ? '#94a3b8' : '#64748b',
                                }}
                            >
                                <Icon size={14} className="shrink-0" aria-hidden />
                                <span className="whitespace-nowrap">{label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.35)' : 'rgba(2,132,199,0.35)'}`,
                                        }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                    />
                                )}
                            </motion.div>
                        </Link>
                    )
                })}

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTheme}
                    className="ml-1 p-2 rounded-full shrink-0"
                    style={{
                        background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.1)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.3)' : 'rgba(2,132,199,0.3)'}`,
                        color: isDark ? '#4fc3f7' : '#0284c7',
                    }}
                    title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                    type="button"
                >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.button>

                {isLoggedIn ? (
                    <div className="ml-1 flex items-center gap-1.5 xl:gap-2 shrink-0">
                        <span
                            className="hidden 2xl:inline text-xs max-w-[100px] xl:max-w-[120px] truncate font-medium"
                            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                            title={username || ''}
                        >
                            @{username}
                        </span>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => logout()}
                            className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1.5 rounded-full text-xs xl:text-sm font-semibold"
                            style={{
                                background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.1)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}`,
                                color: isDark ? '#4fc3f7' : '#0284c7',
                            }}
                        >
                            <LogOut size={14} className="shrink-0" aria-hidden />
                            <span className="hidden xl:inline">Log out</span>
                            <span className="xl:hidden">Out</span>
                        </motion.button>
                    </div>
                ) : (
                    <Link to="/join" className="ml-1 shrink-0">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1.5 px-3 xl:px-4 py-1.5 rounded-full text-xs xl:text-sm font-semibold"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                                color: 'white',
                                boxShadow: '0 0 16px rgba(124,58,237,0.4)',
                            }}
                            type="button"
                        >
                            <UserPlus size={14} className="shrink-0" aria-hidden />
                            Join
                        </motion.button>
                    </Link>
                )}
            </div>

            {/* Tablet: icon strip — horizontal scroll so every route stays reachable */}
            <div className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 min-w-0 justify-end overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:thin]">
                {navLinks.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path
                    return (
                        <Link key={path} to={path} title={label} className="shrink-0">
                            <span
                                className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold"
                                style={{
                                    background: isActive
                                        ? isDark ? 'rgba(79,195,247,0.2)' : 'rgba(2,132,199,0.15)'
                                        : 'transparent',
                                    color: isActive
                                        ? isDark ? '#4fc3f7' : '#0284c7'
                                        : isDark ? '#94a3b8' : '#64748b',
                                    border: `1px solid ${isActive ? (isDark ? 'rgba(79,195,247,0.35)' : 'rgba(2,132,199,0.3)') : 'transparent'}`,
                                }}
                            >
                                <Icon size={16} aria-hidden />
                            </span>
                        </Link>
                    )
                })}
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleTheme}
                    className="p-2 rounded-full shrink-0"
                    style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                    aria-label={isDark ? 'Light mode' : 'Dark mode'}
                >
                    {isDark ? <Sun size={17} /> : <Moon size={17} />}
                </motion.button>
                {isLoggedIn ? (
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => logout()}
                        className="px-2 py-1.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{
                            background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.1)',
                            color: isDark ? '#4fc3f7' : '#0284c7',
                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}`,
                        }}
                    >
                        Out
                    </motion.button>
                ) : (
                    <Link to="/join" className="shrink-0">
                        <span
                            className="inline-flex items-center px-2 py-1.5 rounded-full text-[10px] font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                        >
                            Join
                        </span>
                    </Link>
                )}
            </div>

            {/* Mobile menu toggle */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleTheme}
                    className="p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
                    style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                    aria-label={isDark ? 'Light mode' : 'Dark mode'}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </motion.button>
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen((o) => !o)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
                    style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
                    aria-expanded={mobileOpen}
                    aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </motion.button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 md:hidden py-3 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] flex flex-col gap-0.5 max-h-[min(75dvh,32rem)] overflow-y-auto overscroll-contain shadow-lg"
                        style={{
                            background: isDark ? 'rgba(4,12,24,0.97)' : 'rgba(240,244,248,0.97)',
                            backdropFilter: 'blur(16px)',
                            borderBottom: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.12)'}`,
                        }}
                    >
                        {navLinks.map(({ label, path, icon: Icon }) => {
                            const isActive = location.pathname === path
                            return (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium min-h-[48px]"
                                    style={{
                                        background: isActive
                                            ? isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.10)'
                                            : 'transparent',
                                        color: isActive
                                            ? isDark ? '#4fc3f7' : '#0284c7'
                                            : isDark ? '#94a3b8' : '#64748b',
                                    }}
                                >
                                    <Icon size={18} className="shrink-0" aria-hidden />
                                    {label}
                                </Link>
                            )
                        })}
                        {isLoggedIn ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileOpen(false)
                                    logout()
                                }}
                                className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
                                style={{
                                    background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.1)',
                                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}`,
                                    color: isDark ? '#4fc3f7' : '#0284c7',
                                }}
                            >
                                <LogOut size={18} aria-hidden />
                                Log out @{username}
                            </button>
                        ) : (
                            <Link
                                to="/join"
                                onClick={() => setMobileOpen(false)}
                                className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                                    color: 'white',
                                }}
                            >
                                <UserPlus size={18} aria-hidden />
                                Join
                            </Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
