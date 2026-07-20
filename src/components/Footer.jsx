import React from 'react'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../App.jsx'
import { SolarWordCore } from './SolarBrandA.jsx'
import LazyVantaFogBackground from './solar-archive/LazyVantaFogBackground.jsx'

const NAV_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Map', path: '/map' },
    { label: 'Leaderboard', path: '/leaderboard' },
    { label: 'Submit', path: '/submit' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'Deploy', path: '/deploy' },
]

const LEGAL_LINKS = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
]

const TAGS = ['SOLAR', 'Peer Review', 'Open Data', 'Public Knowledge']

/** Routes that already render a full-viewport fixed Vanta layer behind the footer. */
const PAGE_FOG_PATHS = new Set([
    '/map',
    '/leaderboard',
    '/deploy',
    '/submit',
    '/reviews',
    '/review-queue',
    '/profile',
    '/my-submissions',
    '/privacy',
    '/terms',
])

export default function Footer() {
    const location = useLocation()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    if (
        location.pathname === '/' ||
        location.pathname === '/join' ||
        location.pathname.startsWith('/archive/')
    ) return null

    const needsFooterVanta = !PAGE_FOG_PATHS.has(location.pathname)

    return (
        <footer className="sa-footer">
            <div className="sa-footer__fx" aria-hidden="true">
                {needsFooterVanta && (
                    <LazyVantaFogBackground
                        isDark={isDark}
                        entryReveal={1}
                        className="sa-footer__vanta"
                    />
                )}
                <div className="sa-footer__veil" />
                <div className="sa-footer__vignette" />
            </div>
            <div className="sa-footer__inner">
                <div className="sa-footer__grid">
                    <div className="sa-footer__brand-col">
                        <div className="sa-footer__brand">
                            <span className="sa-footer__brand-text">
                                THE <SolarWordCore /> ARCHIVE
                            </span>
                        </div>
                        <p className="sa-footer__tagline">
                            A coordinate-based knowledge archive for off-grid autonomy,
                            sustainable living, and open public research. Built by the
                            community, validated by peers.
                        </p>
                    </div>

                    <div className="sa-footer__links-col">
                        <div className="sa-footer__col-label">Navigation</div>
                        <nav className="sa-footer__links" aria-label="Footer">
                            {NAV_LINKS.map(({ label, path }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className="sa-footer__link"
                                >
                                    <span className="sa-footer__link-arrow">›</span>
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="sa-footer__links-col">
                        <div className="sa-footer__col-label">Legal</div>
                        <nav className="sa-footer__links" aria-label="Legal">
                            {LEGAL_LINKS.map(({ label, path }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className="sa-footer__link"
                                >
                                    <span className="sa-footer__link-arrow">›</span>
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="sa-footer__bottom">
                    <div className="sa-footer__copy">
                        © 2026 The Solar Archive · Open Knowledge Platform
                    </div>
                    <div className="sa-footer__tags">
                        {TAGS.map(tag => (
                            <span key={tag} className="sa-footer__tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}
