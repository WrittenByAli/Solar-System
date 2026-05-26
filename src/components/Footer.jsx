import React from 'react'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../App.jsx'
import { SolarWordCore } from './SolarBrandA.jsx'
import FoundationLogo from './FoundationLogo.jsx'

const NAV_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Map', path: '/map' },
    { label: 'Leaderboard', path: '/leaderboard' },
    { label: 'Submit', path: '/submit' },
    { label: 'Directory', path: '/directory' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'Host Archive', path: '/host-archive' },
    { label: 'Join', path: '/join' },
]

const TAGS = ['SOLAR', 'Peer Review', 'Open Data', 'Public Knowledge']

export default function Footer() {
    const location = useLocation()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    if (
        location.pathname === '/' ||
        location.pathname.startsWith('/archive/')
    ) return null

    return (
        <footer className="sa-footer">
            <div className="sa-footer__inner">
                <div className="sa-footer__grid">
                    {/* Brand */}
                    <div className="sa-footer__brand-col">
                        <div className="sa-footer__brand">
                            <div
                                className="sa-footer__logo"
                                style={{
                                    background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                                    boxShadow: isDark
                                        ? '0 0 20px rgba(245,166,35,0.25)'
                                        : '0 8px 20px rgba(245,166,35,0.18)',
                                }}
                            >
                                <FoundationLogo fillCircle alt="" />
                            </div>
                            <span
                                className="sa-footer__brand-text"
                                style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                            >
                                THE <SolarWordCore /> ARCHIVE
                            </span>
                        </div>
                        <p
                            className="sa-footer__tagline"
                            style={{ color: isDark ? '#475569' : '#4b5563' }}
                        >
                            A coordinate-based knowledge archive for off-grid autonomy,
                            sustainable living, and open public research. Built by the
                            community, validated by peers.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="sa-footer__links-col">
                        <div className="sa-footer__col-label">Navigation</div>
                        <nav className="sa-footer__links">
                            {NAV_LINKS.map(({ label, path }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className="sa-footer__link"
                                    style={{ color: isDark ? '#64748b' : '#4b5563' }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = isDark ? '#4fc3f7' : '#0284c7'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = isDark ? '#64748b' : '#4b5563'
                                    }}
                                >
                                    <span className="sa-footer__link-arrow">›</span>
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Bottom bar */}
                <div
                    className="sa-footer__bottom"
                    style={{
                        borderTop: `1px solid ${isDark ? 'rgba(79,195,247,0.06)' : 'rgba(15,23,42,0.08)'}`,
                    }}
                >
                    <div
                        className="sa-footer__copy"
                        style={{ color: isDark ? '#475569' : '#1e293b' }}
                    >
                        © 2026 The Solar Archive · Open Knowledge Platform
                    </div>
                    <div className="sa-footer__tags">
                        {TAGS.map(tag => (
                            <span
                                key={tag}
                                className="sa-footer__tag"
                                style={{
                                    background: isDark
                                        ? 'rgba(79,195,247,0.05)'
                                        : 'rgba(15,23,42,0.05)',
                                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.1)'}`,
                                    color: isDark ? '#475569' : '#1e293b',
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}
