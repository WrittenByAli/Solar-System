import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Award, ChevronDown, ClipboardCheck, Medal, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
    MIN_POINTS_REVIEWER_ACCESS,
    POINTS_PER_REVIEW_COMPLETED,
} from '../constants/reviewWorkflow.js'
import { getApprovedSubmissions } from '../utils/submissionStorage.js'
import { listAllProfiles } from '../utils/userProfileStorage.js'
import { topThreeOnPlanet } from '../utils/fieldLeaderboards.js'
import FieldHonorTokens from '../components/FieldHonorTokens.jsx'
import fallbackData from '../data/researchData.json'
import '../styles/solar-leaderboard.css'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData

const RANK_ICONS = {
    1: <Trophy size={18} color="#c4a45a" />,
    2: <Medal size={18} color="#94a3b8" />,
    3: <Medal size={18} color="#b45309" />,
}

const PODIUM = ['🥇', '🥈', '🥉']

const DEMO_PROFILES = [
    {
        username: 'aurora_reviewer',
        points: 2840,
        reviewsCompleted: 21,
        contributionsByPlanet: { sun: 7, earth: 5, jupiter: 3 },
        reviewsByPlanet: { sun: 9, earth: 5, mars: 4, jupiter: 3 },
    },
    {
        username: 'orbit_cartographer',
        points: 2360,
        reviewsCompleted: 14,
        contributionsByPlanet: { earth: 8, venus: 4, saturn: 3 },
        reviewsByPlanet: { earth: 6, venus: 4, saturn: 4 },
    },
    {
        username: 'solar_factcheck',
        points: 1980,
        reviewsCompleted: 18,
        contributionsByPlanet: { jupiter: 5, mercury: 2 },
        reviewsByPlanet: { jupiter: 10, mercury: 5, neptune: 3 },
    },
    {
        username: 'bio_dome_archivist',
        points: 1540,
        reviewsCompleted: 9,
        contributionsByPlanet: { earth: 6, venus: 3 },
        reviewsByPlanet: { earth: 5, venus: 4 },
    },
    {
        username: 'mars_systems',
        points: 1210,
        reviewsCompleted: 7,
        contributionsByPlanet: { mars: 5, mercury: 2 },
        reviewsByPlanet: { mars: 6, sun: 1 },
    },
    {
        username: 'neptune_waterlab',
        points: 930,
        reviewsCompleted: 5,
        contributionsByPlanet: { neptune: 4, saturn: 1 },
        reviewsByPlanet: { neptune: 5 },
    },
]

function rankDemoUsersOnPlanet(profiles, planetId, metric) {
    const pid = String(planetId || '').toLowerCase()
    return profiles
        .map((p) => ({
            username: p.username,
            score:
                metric === 'contributions'
                    ? p.contributionsByPlanet?.[pid] || 0
                    : p.reviewsByPlanet?.[pid] || 0,
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
        .slice(0, 3)
}

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
    },
}

const viewportReveal = { once: true, amount: 0.24, margin: '0px 0px -8% 0px' }
const rowViewportReveal = { once: true, amount: 0.38, margin: '0px 0px -6% 0px' }

/* ─── Signal Constellation Hero ─── */

function SignalConstellationHero({ topPerformer, rankedProfiles, isDark }) {
    const sectionRef = useRef(null)
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end start'],
    })

    const systemY = useTransform(scrollYProgress, [0, 0.85], [0, 18])
    const systemScale = useTransform(scrollYProgress, [0, 0.55, 0.85], [0.98, 1.03, 1])
    const ringRotate = useTransform(scrollYProgress, [0, 1], ['0deg', '84deg'])
    const nudgeOpacity = useTransform(scrollYProgress, [0, 0.1], [0.38, 0])
    const topNodes = (rankedProfiles || []).slice(0, 6)
    const threadColor = isDark ? 'rgba(255,255,255,0.94)' : 'rgba(2,6,23,0.86)'
    const threadWidth = isDark ? 1.65 : 1.8
    const threadStyle = {
        opacity: isDark ? 0.92 : 0.82,
        filter: isDark
            ? 'drop-shadow(0 0 18px rgba(255,255,255,0.62)) drop-shadow(0 0 30px rgba(255,255,255,0.28))'
            : 'drop-shadow(0 0 10px rgba(15,23,42,0.16))',
    }
    const threadPathStyle = {
        stroke: threadColor,
        strokeWidth: threadWidth,
    }

    return (
        <div ref={sectionRef} className="lb-signal-section">
            <div className="lb-signal-sticky">
                <div className="lb-signal-dust" aria-hidden="true">
                    {[...Array(18)].map((_, i) => (
                        <span
                            key={i}
                            style={{
                                left: `${6 + i * 5.2}%`,
                                top: `${12 + ((i * 17) % 70)}%`,
                                animationDelay: `${-i * 0.35}s`,
                                animationDuration: `${5 + (i % 5) * 0.8}s`,
                            }}
                        />
                    ))}
                </div>

                <motion.div className="lb-hero-content">
                    <h1 className="lb-title">
                        The <span className="lb-title--accent">Leaderboard</span>
                    </h1>
                    <div className="lb-signal-stage" aria-label="Top leaderboard members">
                        <motion.div className="lb-signal-system" style={{ y: systemY, scale: systemScale }}>
                            <motion.div className="lb-signal-ring lb-signal-ring--outer" style={{ rotate: ringRotate }} />
                            <motion.div className="lb-signal-ring lb-signal-ring--mid" style={{ rotate: ringRotate }} />
                            <motion.div className="lb-signal-ring lb-signal-ring--inner" style={{ rotate: ringRotate }} />

                            <motion.svg
                                className="lb-signal-lines"
                                viewBox="0 0 520 260"
                                preserveAspectRatio="none"
                                style={threadStyle}
                                aria-hidden="true"
                            >
                                <path style={threadPathStyle} d="M260 130 L260 18 M260 130 L260 242 M260 130 L86 58 L72 196 L260 130 L436 56 L448 198 L260 130" />
                                <path style={threadPathStyle} d="M86 58 L436 56 M72 196 L448 198" />
                            </motion.svg>

                            <div className="lb-signal-core">
                                <Trophy size={30} />
                                <span>Top Members</span>
                            </div>

                            {topNodes.map((entry, i) => (
                                <motion.div
                                    key={entry.username}
                                    className={`lb-signal-node lb-signal-node--${i + 1}`}
                                    initial={{ opacity: 0, scale: 0.88 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.08 + i * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <span>#{i + 1}</span>
                                    <strong>{entry.fullName || entry.name || entry.displayName || entry.username}</strong>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                    <p className="lb-subtitle">
                        Points from approved submissions and peer grades - per-hub experts and fact-checkers ranked.
                    </p>
                    {topPerformer && (
                        <div className="lb-champion-badge">
                            <Trophy size={13} color={isDark ? '#c4a45a' : '#b45309'} />
                            <span className="lb-champion-label">Orbit Leader</span>
                            <span className="lb-champion-name">@{topPerformer.username}</span>
                            <span className="lb-champion-pts">{topPerformer.points.toLocaleString()} pts</span>
                        </div>
                    )}
                </motion.div>

                <motion.div className="lb-scroll-nudge" style={{ opacity: nudgeOpacity }}>
                    <span>Scroll to rank</span>
                    <ChevronDown size={14} color={isDark ? '#4b5563' : '#0369a1'} />
                </motion.div>
            </div>
        </div>
    )
}

function RankBadge({ rank }) {
    const icon = RANK_ICONS[rank]
    if (icon) {
        return <div className={`leaderboard-rank leaderboard-rank--top leaderboard-rank--${rank}`}>{icon}</div>
    }
    return <div className="leaderboard-rank">{rank}</div>
}

function EmptyLine({ children }) {
    return <li className="leaderboard-empty-line">{children}</li>
}

export default function Leaderboard() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { isLoggedIn, username, points, profile, canAccessReviewerQueue } = useAuth()
    const [tick, setTick]             = useState(0)
    const [honorPlanetId, setHonorPlanetId] = useState(() => researchData.planets[0]?.id || 'sun')

    // Fix: always start at top when this page mounts
    useEffect(() => { window.scrollTo(0, 0) }, [])

    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-profile-updated', bump)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => {
            window.removeEventListener('solar-archive-profile-updated', bump)
            window.removeEventListener('solar-archive-submissions-updated', bump)
        }
    }, [])

    const realProfiles = useMemo(() => {
        return [...listAllProfiles()].sort(
            (a, b) => b.points - a.points || a.username.localeCompare(b.username),
        )
    }, [tick])

    const rankedProfiles = realProfiles.length > 0 ? realProfiles : DEMO_PROFILES

    const approvedEntryCount = useMemo(() => {
        const realCount = getApprovedSubmissions().length
        if (realCount > 0) return realCount
        return DEMO_PROFILES.reduce(
            (sum, p) => sum + Object.values(p.contributionsByPlanet || {}).reduce((a, n) => a + n, 0),
            0,
        )
    }, [tick])

    const honorPlanet   = researchData.planets.find((p) => p.id === honorPlanetId) || researchData.planets[0]
    const realExpertsTop  = topThreeOnPlanet(honorPlanet?.id, 'contributions')
    const realCheckersTop = topThreeOnPlanet(honorPlanet?.id, 'reviews')
    const expertsTop  = realExpertsTop.length  > 0 ? realExpertsTop  : rankDemoUsersOnPlanet(DEMO_PROFILES, honorPlanet?.id, 'contributions')
    const checkersTop = realCheckersTop.length > 0 ? realCheckersTop : rankDemoUsersOnPlanet(DEMO_PROFILES, honorPlanet?.id, 'reviews')

    const totalContributors = rankedProfiles.length
    const topPerformer      = rankedProfiles[0]
    const podiumProfiles    = [rankedProfiles[1], rankedProfiles[0], rankedProfiles[2]]
        .filter(Boolean)
        .map((entry) => ({
            entry,
            rank: rankedProfiles.findIndex((p) => p.username === entry.username) + 1,
        }))
    const maxPoints  = Math.max(1, topPerformer?.points || 1)
    const totalPoints = rankedProfiles.reduce((sum, p) => sum + (p.points || 0), 0)

    const stats = [
        { label: 'Approved entries',  value: approvedEntryCount.toLocaleString(),  icon: Award,    tone: 'gold' },
        { label: 'Profiles tracked',  value: totalContributors.toLocaleString(),   icon: Users,    tone: 'blue' },
        { label: 'Research hubs',     value: String(researchData.planets.length),  icon: Sparkles, tone: 'violet' },
        { label: 'Total points',      value: totalPoints.toLocaleString(),         icon: Trophy,   tone: 'green' },
    ]

    return (
        <div className="solar-page leaderboard-page">
            {/* Background — stars + grid, no colored auroras */}
            <div className="leaderboard-bg" aria-hidden="true">
                <div className="leaderboard-bg__grid" />
                <div className="leaderboard-bg__stars" />
                <div className="leaderboard-bg__vignette" />
            </div>

            {/* Signal constellation hero */}
            <SignalConstellationHero topPerformer={topPerformer} rankedProfiles={rankedProfiles} isDark={isDark} />

            <div className="leaderboard-shell">

                {/* Podium */}
                {podiumProfiles.length > 0 && (
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={viewportReveal}
                        className="leaderboard-podium"
                    >
                        <div className="leaderboard-podium__energy" aria-hidden="true">
                            <span /><span /><span />
                        </div>
                        <div className="leaderboard-podium__header">
                            <span className="leaderboard-section-label"><Sparkles size={13} /> Orbit Podium</span>
                            <p>Top contributors currently powering the archive.</p>
                        </div>
                        <div className="leaderboard-podium__grid">
                            {podiumProfiles.map(({ entry, rank }) => (
                                <motion.div
                                    key={entry.username}
                                    className={`leaderboard-podium-card leaderboard-podium-card--rank-${rank}`}
                                    whileHover={{ y: -8, rotateX: 4, scale: 1.02 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                >
                                    <div className="leaderboard-podium-card__halo" />
                                    <div className="leaderboard-podium-card__rank">
                                        {RANK_ICONS[rank] || `#${rank}`}
                                    </div>
                                    <div className="leaderboard-podium-card__avatar">
                                        {String(entry.username || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="leaderboard-podium-card__name">@{entry.username}</div>
                                    <div className="leaderboard-podium-card__points">{entry.points.toLocaleString()} pts</div>
                                    <div className="leaderboard-podium-card__beam" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Stats */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportReveal}
                    className="leaderboard-stats"
                >
                    {stats.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <motion.div
                                key={i}
                                className={`leaderboard-stat leaderboard-stat--${stat.tone}`}
                                whileHover={{ y: -4, scale: 1.01 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                            >
                                <div className="leaderboard-stat__icon"><Icon size={18} /></div>
                                <div className="leaderboard-stat__value">{stat.value}</div>
                                <div className="leaderboard-stat__label">{stat.label}</div>
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Logged-in user card */}
                {isLoggedIn && profile && (
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={viewportReveal}
                        className="leaderboard-user-card"
                    >
                        <div className="leaderboard-user-card__glow" />
                        <div className="leaderboard-user-card__identity">
                            <div className="leaderboard-user-card__avatar">
                                {String(username || '?')[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="leaderboard-user-card__name">
                                    <FieldHonorTokens username={username} planetId={honorPlanet?.id} planetLabel={honorPlanet?.planet} />
                                    <span>@{username}</span>
                                </div>
                                <div className="leaderboard-user-card__meta">
                                    {points.toLocaleString()} pts · {(profile.reviewsCompleted || 0).toLocaleString()} grades filed ·{' '}
                                    {POINTS_PER_REVIEW_COMPLETED} pts per grade
                                </div>
                            </div>
                        </div>
                        <div className="leaderboard-user-card__status">
                            {canAccessReviewerQueue ? (
                                <span className="leaderboard-pill leaderboard-pill--success">
                                    <ClipboardCheck size={14} /> Review queue unlocked
                                </span>
                            ) : (
                                <span className="leaderboard-pill">
                                    {Math.max(0, MIN_POINTS_REVIEWER_ACCESS - points).toLocaleString()} pts until reviewer access ({MIN_POINTS_REVIEWER_ACCESS.toLocaleString()} required)
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Hub honors */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportReveal}
                    className="leaderboard-panel leaderboard-honors"
                >
                    <div className="leaderboard-section-head">
                        <div>
                            <span className="leaderboard-section-label"><ShieldCheck size={13} /> Hub Honors</span>
                            <h2 className="leaderboard-section-title">Field honors</h2>
                            <p className="leaderboard-section-copy">
                                Top three <strong>contributors</strong> (approved entries) and <strong>fact-checkers</strong> (hub fact-check passes) — medals appear beside names in the review queue.
                            </p>
                        </div>
                        <select
                            value={honorPlanetId}
                            onChange={(e) => setHonorPlanetId(e.target.value)}
                            className="leaderboard-select"
                        >
                            {researchData.planets.map((p) => (
                                <option key={p.id} value={p.id}>{p.planet}</option>
                            ))}
                        </select>
                    </div>
                    <div className="leaderboard-honor-grid">
                        <div className="leaderboard-honor-card">
                            <p className="leaderboard-honor-card__title" style={{ color: honorPlanet?.color || '#c4a45a' }}>
                                Experts · contributors
                            </p>
                            <ul className="leaderboard-honor-list">
                                {expertsTop.length === 0 && (
                                    <EmptyLine>No approved hub entries recorded yet for this browser.</EmptyLine>
                                )}
                                {expertsTop.map((row, i) => (
                                    <li key={row.username} className="leaderboard-honor-row">
                                        <span className="leaderboard-honor-row__podium">{PODIUM[i]}</span>
                                        <span className="leaderboard-honor-row__name">{row.username}</span>
                                        <span className="leaderboard-honor-row__score">{row.score} approved</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="leaderboard-honor-card">
                            <p className="leaderboard-honor-card__title" style={{ color: '#9ca3af' }}>
                                Fact-checkers · passing grades
                            </p>
                            <ul className="leaderboard-honor-list">
                                {checkersTop.length === 0 && (
                                    <EmptyLine>No grades on this hub yet.</EmptyLine>
                                )}
                                {checkersTop.map((row, i) => (
                                    <li key={row.username} className="leaderboard-honor-row">
                                        <span className="leaderboard-honor-row__podium">{PODIUM[i]}</span>
                                        <span className="leaderboard-honor-row__name">{row.username}</span>
                                        <span className="leaderboard-honor-row__score">{row.score} passes</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Global list header */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportReveal}
                    className="leaderboard-section-head leaderboard-section-head--compact"
                >
                    <div>
                        <span className="leaderboard-section-label"><Trophy size={13} /> Global Points</span>
                        <h2 className="leaderboard-section-title">Top Contributors</h2>
                    </div>
                    <span className="leaderboard-section-micro">{rankedProfiles.length.toLocaleString()} profiles ranked</span>
                </motion.div>

                {/* Global rankings */}
                <div className="leaderboard-global-list">
                    {rankedProfiles.length === 0 ? (
                        <div className="leaderboard-empty-state">
                            No profiles yet — join and submit or grade entries to appear here.
                        </div>
                    ) : (
                        rankedProfiles.map((entry, i) => {
                            const rank      = i + 1
                            const isTopThree = rank <= 3
                            const approvals = Object.values(entry.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
                            const progress  = Math.max(4, Math.min(100, Math.round((entry.points / maxPoints) * 100)))
                            return (
                                <motion.div
                                    key={entry.username}
                                    initial={{ opacity: 0, x: -10, y: 12, scale: 0.99 }}
                                    whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                                    viewport={rowViewportReveal}
                                    transition={{
                                        delay: Math.min((i % 8) * 0.035, 0.24),
                                        duration: 0.42,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    whileHover={{ y: -3, scale: 1.005 }}
                                    className={`leaderboard-row ${isTopThree ? `leaderboard-row--rank-${rank}` : ''}`}
                                >
                                    <RankBadge rank={rank} isDark={isDark} />
                                    <div className="leaderboard-row__avatar">
                                        {String(entry.username || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="leaderboard-row__body">
                                        <div className="leaderboard-row__name-line">
                                            <span className="leaderboard-row__name">{entry.username}</span>
                                        </div>
                                        <div className="leaderboard-row__meta">
                                            {approvals} approved hub entr{approvals === 1 ? 'y' : 'ies'} · {(entry.reviewsCompleted || 0)} grades
                                        </div>
                                        <div className="leaderboard-row__meter" aria-hidden="true">
                                            <span style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                    <div className="leaderboard-row__points">
                                        <div className="leaderboard-row__points-value">{entry.points.toLocaleString()}</div>
                                        <div className="leaderboard-row__points-label">pts</div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={viewportReveal}
                    transition={{ duration: 0.45 }}
                    className="leaderboard-ledger-note"
                >
                    Local demo ledger (localStorage): honors compare accounts on this device only. Segment text is sorted easiest → hardest after approval.
                </motion.p>
            </div>
        </div>
    )
}
