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
    Eye,
    Package,
    Library,
    Award,
    ShieldCheck,
    Shield,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import FoundationLogo from './FoundationLogo.jsx'
import { SolarWordCore } from './SolarBrandA.jsx'

const baseNavLinks = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Map', path: '/map', icon: Map },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Host', path: '/host-archive', icon: Package },
    { label: 'Submit', path: '/submit', icon: Upload },
    { label: 'Directory', path: '/directory', icon: Library },
    { label: 'Reviews', path: '/reviews', icon: Star },
]

// Guests browse; they don't contribute. Contribution routes stay out of
// their nav entirely — deep links to them land on the GuestGate prompt.
const GUEST_PATHS = new Set(['/', '/map', '/leaderboard', '/directory'])
const guestNavLinks = baseNavLinks.filter((l) => GUEST_PATHS.has(l.path))

/** Circular account avatar; falls back to the username initial. */
function AvatarCircle({ avatarUrl, username, size = 34 }) {
    const initial = (username || '?').charAt(0).toUpperCase()
    return (
        <span className="snav-avatar" style={{ width: size, height: size }}>
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={username ? `@${username}` : 'Account'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <span className="text-white font-semibold" style={{ fontSize: size * 0.4 }}>
                    {initial}
                </span>
            )}
        </span>
    )
}

export default function Navbar() {
    const location = useLocation()
    const { theme, toggleTheme } = useTheme()
    const { isLoggedIn, isGuest, username, email, avatarUrl, points, canAccessReviewerQueue, canAccessAdmin, logout } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [accountOpen, setAccountOpen] = useState(false)

    const navLinks = useMemo(() => {
        let next = baseNavLinks
        if (canAccessReviewerQueue) {
            const reviewItem = { label: 'Review queue', path: '/review-queue', icon: ClipboardCheck }
            const i = next.findIndex((l) => l.path === '/leaderboard')
            next = [...next.slice(0, i + 1), reviewItem, ...next.slice(i + 1)]
        }
        if (canAccessAdmin) {
            next = [...next, { label: 'Admin', path: '/admin', icon: Shield }]
        }
        return next
    }, [canAccessReviewerQueue, canAccessAdmin])

    // Members see everything; guests see browse-only routes; signed-out
    // visitors only ever see /join — no nav links to gated pages.
    const visibleLinks = isLoggedIn ? navLinks : isGuest ? guestNavLinks : []

    const isArchive = location.pathname.startsWith('/archive/')
    if (isArchive) return null

    const isNavActive = (path) => {
        if (path === '/') return location.pathname === '/'
        return location.pathname === path || location.pathname.startsWith(`${path}/`)
    }

    const handleLogout = () => {
        setAccountOpen(false)
        setMobileOpen(false)
        logout()
    }

    const accountMenu = (
        <AnimatePresence>
            {accountOpen && (
                <>
                    {/* click-away backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setAccountOpen(false)}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                        className="snav-menu absolute right-0 top-[calc(100%+10px)] z-50 w-64"
                        role="menu"
                    >
                        <div className="snav-menu__profile">
                            <AvatarCircle avatarUrl={avatarUrl} username={username} size={38} />
                            <div className="min-w-0">
                                <p className="snav-menu__name truncate">@{username || 'user'}</p>
                                {email && <p className="snav-menu__email truncate">{email}</p>}
                            </div>
                        </div>

                        <div className="snav-menu__points">
                            <Award size={14} style={{ color: '#f5a623' }} aria-hidden />
                            {points} contribution point{points === 1 ? '' : 's'}
                        </div>

                        <Link to="/account" role="menuitem" onClick={() => setAccountOpen(false)} className="snav-menu__item">
                            <ShieldCheck size={15} aria-hidden />
                            Account &amp; security
                        </Link>

                        <button type="button" role="menuitem" onClick={handleLogout} className="snav-menu__item snav-menu__item--danger">
                            <LogOut size={15} aria-hidden />
                            Log out
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )

    return (
        <nav
            className="solar-navbar fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-5 md:px-7"
        >
            {/* Logo */}
            <Link
                to={isLoggedIn || isGuest ? '/' : '/join'}
                aria-label="THE SOLAR ARCHIVE — Home"
                className="solar-navbar__logo-link flex items-center gap-2 sm:gap-2.5 group select-none shrink-0 min-w-0 max-w-[calc(100vw-5.5rem)] md:max-w-none"
            >
                <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                        boxShadow: '0 4px 14px rgba(245,166,35,0.28)',
                    }}
                >
                    <FoundationLogo fillCircle alt="" />
                </motion.div>
                <span className="solar-navbar__brand">
                    <span className="solar-navbar__brand-the">THE</span>
                    <SolarWordCore className="solar-navbar__brand-solar" />
                    <span className="solar-navbar__brand-archive">ARCHIVE</span>
                </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center flex-1 min-w-0 justify-end">
                <div className="snav-links">
                    {visibleLinks.map(({ label, path, icon: Icon }) => {
                        const isActive = isNavActive(path)
                        return (
                            <Link key={path} to={path} className="snav-link" data-active={isActive}>
                                <Icon size={13.5} className="shrink-0" aria-hidden />
                                <span>{label}</span>
                                {isActive && (
                                    <motion.span
                                        layoutId="snav-underline"
                                        className="snav-link__underline"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </div>

                <div className="snav-divider" />

                <button
                    type="button"
                    onClick={toggleTheme}
                    className="snav-icon-btn"
                    title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                {isLoggedIn ? (
                    <div className="relative ml-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setAccountOpen((o) => !o)}
                            className="snav-avatar-btn flex items-center rounded-full"
                            aria-haspopup="menu"
                            aria-expanded={accountOpen}
                            aria-label={`Account menu — @${username || 'user'}`}
                        >
                            <AvatarCircle avatarUrl={avatarUrl} username={username} size={34} />
                        </button>
                        {accountMenu}
                    </div>
                ) : isGuest ? (
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="snav-guest-chip" title="Browsing as guest — view only">
                            <Eye size={12} aria-hidden />
                            Guest
                        </span>
                        <Link to="/join?mode=signup">
                            <button type="button" className="snav-cta">
                                <UserPlus size={14} className="shrink-0" aria-hidden />
                                Create account
                            </button>
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="snav-icon-btn"
                            title="Exit guest mode"
                            aria-label="Exit guest mode"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                ) : (
                    <Link to="/join" className="ml-2 shrink-0">
                        <button type="button" className="snav-cta">
                            <UserPlus size={14} className="shrink-0" aria-hidden />
                            Sign In
                        </button>
                    </Link>
                )}
            </div>

            {/* Tablet: icon strip — horizontal scroll so every route stays reachable */}
            <div className="hidden md:flex lg:hidden items-center gap-1 flex-1 min-w-0 justify-end overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:thin]">
                {visibleLinks.map(({ label, path, icon: Icon }) => {
                    const isActive = isNavActive(path)
                    return (
                        <Link key={path} to={path} title={label} className="snav-icon-strip shrink-0" data-active={isActive}>
                            <Icon size={16} aria-hidden />
                        </Link>
                    )
                })}
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="snav-icon-btn shrink-0"
                    aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                {isLoggedIn ? (
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setAccountOpen((o) => !o)}
                            className="snav-avatar-btn flex items-center rounded-full"
                            aria-haspopup="menu"
                            aria-expanded={accountOpen}
                            aria-label={`Account menu — @${username || 'user'}`}
                        >
                            <AvatarCircle avatarUrl={avatarUrl} username={username} size={32} />
                        </button>
                        {accountMenu}
                    </div>
                ) : isGuest ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="snav-guest-chip" title="Browsing as guest — view only">
                            <Eye size={11} aria-hidden />
                            Guest
                        </span>
                        <Link to="/join?mode=signup" className="shrink-0">
                            <span className="snav-cta snav-cta--compact">Create account</span>
                        </Link>
                    </div>
                ) : (
                    <Link to="/join" className="shrink-0">
                        <span className="snav-cta snav-cta--compact">Sign In</span>
                    </Link>
                )}
            </div>

            {/* Mobile menu toggle */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="snav-icon-btn min-w-[40px] min-h-[40px]"
                    aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                    type="button"
                    onClick={() => setMobileOpen((o) => !o)}
                    className="snav-icon-btn min-w-[40px] min-h-[40px] rounded-lg"
                    aria-expanded={mobileOpen}
                    aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.18 }}
                        className="snav-sheet absolute top-full left-0 right-0 md:hidden py-3 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] flex flex-col gap-0.5 max-h-[min(75dvh,32rem)] overflow-y-auto overscroll-contain"
                    >
                        {/* Profile row — signed in */}
                        {isLoggedIn && (
                            <div className="snav-sheet__profile flex items-center gap-3 px-4 py-3 mb-1 rounded-xl">
                                <AvatarCircle avatarUrl={avatarUrl} username={username} size={38} />
                                <div className="min-w-0">
                                    <p className="snav-menu__name truncate">@{username || 'user'}</p>
                                    <p className="snav-menu__email">{points} contribution point{points === 1 ? '' : 's'}</p>
                                </div>
                            </div>
                        )}

                        {/* Profile row — guest session */}
                        {isGuest && (
                            <div className="snav-sheet__profile flex items-center gap-3 px-4 py-3 mb-1 rounded-xl">
                                <AvatarCircle avatarUrl={null} username="Guest" size={38} />
                                <div className="min-w-0 flex-1">
                                    <p className="snav-menu__name truncate">Browsing as guest</p>
                                    <p className="snav-menu__email">View only — create an account to contribute</p>
                                </div>
                                <span className="snav-guest-chip">
                                    <Eye size={11} aria-hidden />
                                    Guest
                                </span>
                            </div>
                        )}

                        {visibleLinks.map(({ label, path, icon: Icon }) => {
                            const isActive = isNavActive(path)
                            return (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setMobileOpen(false)}
                                    className="snav-sheet__link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium min-h-[48px]"
                                    data-active={isActive}
                                >
                                    <Icon size={18} className="shrink-0" aria-hidden />
                                    {label}
                                </Link>
                            )
                        })}

                        {isLoggedIn && (
                            <Link
                                to="/account"
                                onClick={() => setMobileOpen(false)}
                                className="snav-sheet__link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium min-h-[48px]"
                            >
                                <ShieldCheck size={18} className="shrink-0" aria-hidden />
                                Account &amp; security
                            </Link>
                        )}

                        {isLoggedIn ? (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="snav-menu__item snav-menu__item--danger mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
                            >
                                <LogOut size={18} aria-hidden />
                                Log out
                            </button>
                        ) : isGuest ? (
                            <>
                                <Link
                                    to="/join?mode=signup"
                                    onClick={() => setMobileOpen(false)}
                                    className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
                                >
                                    <span className="snav-cta w-full justify-center">
                                        <UserPlus size={18} aria-hidden />
                                        Create free account
                                    </span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="snav-menu__item snav-menu__item--danger mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
                                >
                                    <LogOut size={18} aria-hidden />
                                    Exit guest mode
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/join"
                                onClick={() => setMobileOpen(false)}
                                className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
                            >
                                <span className="snav-cta w-full justify-center">
                                    <UserPlus size={18} aria-hidden />
                                    Sign In
                                </span>
                            </Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
