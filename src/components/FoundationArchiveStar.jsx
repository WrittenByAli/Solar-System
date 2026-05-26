import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import FoundationLogo from './FoundationLogo.jsx'

/**
 * Small foundation star — bottom-right home shortcut (star only, no orange circle).
 */
export default function FoundationArchiveStar() {
    const location = useLocation()

    if (location.pathname.startsWith('/archive/')) return null

    return (
        <motion.div
            className="home-star-mark fixed z-40"
            style={{
                bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
                right: 'max(20px, env(safe-area-inset-right, 0px))',
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.35 }}
        >
            <Link
                to="/"
                className="home-star-mark__link"
                aria-label="Return to The Solar Archive home"
                title="Home — The Solar Archive"
            >
                <FoundationLogo size={26} alt="" />
            </Link>
        </motion.div>
    )
}
