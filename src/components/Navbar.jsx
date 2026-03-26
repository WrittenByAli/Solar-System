import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Sun, Home, Map, Trophy, Star, Upload, UserPlus, Menu, X, Moon } from 'lucide-react'
import { useTheme } from '../App.jsx'

const navLinks = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Map', path: '/map', icon: Map },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Reviews', path: '/reviews', icon: Star },
    { label: 'Submit Archive', path: '/submit', icon: Upload },
]

export default function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()
    const [mobileOpen, setMobileOpen] = useState(false)

    const isDark = theme === 'dark'
    const isArchive = location.pathname.startsWith('/archive/')

    if (isArchive) return null

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3"
            style={{
                background: isDark
                    ? 'rgba(2,4,8,0.85)'
                    : 'rgba(240,244,248,0.92)',
                backdropFilter: 'blur(16px)',
                borderBottom: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.12)'}`,
            }}
        >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group select-none flex-shrink-0">
                <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f5a623, #ff6b35)' }}
                >
                    <Rocket size={15} color="white" />
                </motion.div>
                <span
                    className="font-bold text-base tracking-tight"
                    style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                >
                    The SOLAR Archive
                </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
                {navLinks.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path || (path === '/map' && location.pathname === '/map')
                    return (
                        <Link key={path} to={path}>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 relative"
                                style={{
                                    background: isActive
                                        ? isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.12)'
                                        : 'transparent',
                                    color: isActive
                                        ? isDark ? '#4fc3f7' : '#0284c7'
                                        : isDark ? '#94a3b8' : '#64748b',
                                }}
                            >
                                <Icon size={14} />
                                {label}
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

                {/* Theme toggle */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTheme}
                    className="ml-2 p-2 rounded-full"
                    style={{
                        background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.1)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.3)' : 'rgba(2,132,199,0.3)'}`,
                        color: isDark ? '#4fc3f7' : '#0284c7',
                    }}
                    title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.button>

                {/* Join button */}
                <Link to="/join">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="ml-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                            color: 'white',
                            boxShadow: '0 0 16px rgba(124,58,237,0.4)',
                        }}
                    >
                        <UserPlus size={14} />
                        Join
                    </motion.button>
                </Link>
            </div>

            {/* Mobile menu toggle */}
            <div className="flex md:hidden items-center gap-2">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleTheme}
                    className="p-2 rounded-full"
                    style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen(o => !o)}
                    style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
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
                        className="absolute top-full left-0 right-0 md:hidden p-4 flex flex-col gap-1"
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
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                                    style={{
                                        background: isActive
                                            ? isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.10)'
                                            : 'transparent',
                                        color: isActive
                                            ? isDark ? '#4fc3f7' : '#0284c7'
                                            : isDark ? '#94a3b8' : '#64748b',
                                    }}
                                >
                                    <Icon size={16} />
                                    {label}
                                </Link>
                            )
                        })}
                        <Link
                            to="/join"
                            onClick={() => setMobileOpen(false)}
                            className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                                color: 'white',
                            }}
                        >
                            <UserPlus size={16} />
                            Join
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
