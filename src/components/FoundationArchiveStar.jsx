import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../App.jsx'
import { foundationLogoPath } from './FoundationLogo.jsx'

/**
 * Small clickable foundation mark in the page chrome (not on archive grid —
 * that view uses its own navigation).
 */
export default function FoundationArchiveStar() {
    const { theme } = useTheme()
    const location = useLocation()
    const isDark = theme === 'dark'
    const src = foundationLogoPath(theme)

    if (location.pathname.startsWith('/archive/')) return null

    return (
        <motion.div
            className="fixed z-40 pointer-events-none"
            style={{
                bottom: 'max(22px, env(safe-area-inset-bottom, 0px))',
                right: 'max(22px, env(safe-area-inset-right, 0px))',
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.35 }}
        >
            <Link
                to="/archive/star"
                className={`pointer-events-auto flex items-center justify-center rounded-full p-2 shadow-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-cyan-400 focus-visible:ring-offset-[#020408]' : 'focus-visible:ring-sky-600 focus-visible:ring-offset-white'}`}
                style={{
                    background: isDark ? 'rgba(2,4,8,0.72)' : 'rgba(255,255,255,0.92)',
                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.4)' : 'rgba(2,132,199,0.35)'}`,
                    backdropFilter: 'blur(12px)',
                    boxShadow: isDark
                        ? '0 4px 24px rgba(0,0,0,0.45), 0 0 20px rgba(79,195,247,0.12)'
                        : '0 4px 20px rgba(15,23,42,0.12)',
                }}
                aria-label="Open the North Star archive — Foundation memoranda and projects"
                title="North Star archive — Foundation memoranda and curated projects"
            >
                <img
                    src={src}
                    alt=""
                    width={26}
                    height={26}
                    draggable={false}
                    style={{ width: 26, height: 26, objectFit: 'contain', display: 'block' }}
                />
            </Link>
        </motion.div>
    )
}
