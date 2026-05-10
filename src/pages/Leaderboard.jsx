import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, ClipboardCheck } from 'lucide-react'
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

const researchData = window.SOLAR_CONTENT_DATA || fallbackData

const RANK_ICONS = {
    1: <Trophy size={18} color="#f5a623" />,
    2: <Medal size={18} color="#94a3b8" />,
    3: <Medal size={18} color="#b45309" />,
}

const PODIUM = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { isLoggedIn, username, points, profile, canAccessReviewerQueue } = useAuth()
    const [tick, setTick] = useState(0)
    const [honorPlanetId, setHonorPlanetId] = useState(() => researchData.planets[0]?.id || 'sun')

    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-profile-updated', bump)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => {
            window.removeEventListener('solar-archive-profile-updated', bump)
            window.removeEventListener('solar-archive-submissions-updated', bump)
        }
    }, [])

    const rankedProfiles = useMemo(() => {
        return [...listAllProfiles()].sort(
            (a, b) => b.points - a.points || a.username.localeCompare(b.username),
        )
    }, [tick])

    const approvedEntryCount = useMemo(() => getApprovedSubmissions().length, [tick])

    const honorPlanet = researchData.planets.find((p) => p.id === honorPlanetId) || researchData.planets[0]
    const expertsTop = topThreeOnPlanet(honorPlanet?.id, 'contributions')
    const checkersTop = topThreeOnPlanet(honorPlanet?.id, 'reviews')

    const totalContributors = rankedProfiles.length
    const muted = isDark ? '#64748b' : '#94a3b8'

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Trophy size={30} color="#f5a623" />
                        <h1 className="text-3xl md:text-4xl font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                            Leaderboard
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: muted }}>
                        Points from approved submissions and peer grades · Per-hub experts & fact-checkers (top three each)
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-3 mb-8"
                >
                    {[
                        { label: 'Approved entries', value: approvedEntryCount.toLocaleString(), icon: '📚' },
                        { label: 'Profiles (this browser)', value: totalContributors.toLocaleString(), icon: '👥' },
                        { label: 'Research hubs', value: String(researchData.planets.length), icon: '🪐' },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            className="text-center p-3 rounded-2xl"
                            style={{
                                background: isDark ? 'rgba(7,20,40,0.8)' : 'rgba(255,255,255,0.8)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'}`,
                            }}
                        >
                            <div className="text-xl mb-1">{stat.icon}</div>
                            <div className="font-black text-lg" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>{stat.value}</div>
                            <div className="text-xs" style={{ color: muted }}>{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {isLoggedIn && profile && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-8 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        style={{
                            background: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
                            border: `1px solid ${isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.22)'}`,
                        }}
                    >
                        <div>
                            <div className="flex items-center gap-2 font-black text-sm flex-wrap" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                                <FieldHonorTokens username={username} planetId={honorPlanet?.id} planetLabel={honorPlanet?.planet} />
                                <span>@{username}</span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                {points.toLocaleString()} pts · {(profile.reviewsCompleted || 0).toLocaleString()} grades filed ·{' '}
                                {POINTS_PER_REVIEW_COMPLETED} pts per grade
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            {canAccessReviewerQueue ? (
                                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: 'rgba(52,211,153,0.2)', color: '#34d399' }}>
                                    <ClipboardCheck size={14} /> Review queue unlocked
                                </span>
                            ) : (
                                <span style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                                    {Math.max(0, MIN_POINTS_REVIEWER_ACCESS - points).toLocaleString()} pts until reviewer access ({MIN_POINTS_REVIEWER_ACCESS.toLocaleString()} required)
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="mb-8 p-4 rounded-2xl"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.85)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'}`,
                    }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-sm font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>Field honors</h2>
                            <p className="text-xs mt-1" style={{ color: muted }}>
                                Top three <strong>contributors</strong> (approved entries) and <strong>fact-checkers</strong> (hub fact-check passes) — medals appear beside names in the review queue.
                            </p>
                        </div>
                        <select
                            value={honorPlanetId}
                            onChange={(e) => setHonorPlanetId(e.target.value)}
                            className="text-sm rounded-xl px-3 py-2 font-semibold max-w-full"
                            style={{
                                background: isDark ? 'rgba(2,4,8,0.5)' : 'rgba(255,255,255,0.95)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)'}`,
                                color: isDark ? '#e2e8f0' : '#0f172a',
                            }}
                        >
                            {researchData.planets.map((p) => (
                                <option key={p.id} value={p.id}>{p.planet}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: honorPlanet?.color || '#f5a623' }}>Experts · contributors</p>
                            <ul className="space-y-2">
                                {expertsTop.length === 0 && (
                                    <li className="text-xs" style={{ color: muted }}>No approved hub entries recorded yet for this browser.</li>
                                )}
                                {expertsTop.map((row, i) => (
                                    <li key={row.username} className="flex items-center gap-2 text-sm">
                                        <span>{PODIUM[i]}</span>
                                        <span className="font-bold truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{row.username}</span>
                                        <span className="text-xs ml-auto tabular-nums" style={{ color: muted }}>{row.score} approved</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: isDark ? '#67e8f9' : '#0284c7' }}>Fact-checkers · passing grades</p>
                            <ul className="space-y-2">
                                {checkersTop.length === 0 && (
                                    <li className="text-xs" style={{ color: muted }}>No grades on this hub yet.</li>
                                )}
                                {checkersTop.map((row, i) => (
                                    <li key={row.username} className="flex items-center gap-2 text-sm">
                                        <span>{PODIUM[i]}</span>
                                        <span className="font-bold truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{row.username}</span>
                                        <span className="text-xs ml-auto tabular-nums" style={{ color: muted }}>{row.score} passes</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>

                <h2 className="text-center text-sm font-black mb-3 uppercase tracking-wide" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Global points</h2>

                <div className="flex flex-col gap-2">
                    {rankedProfiles.length === 0 ? (
                        <div
                            className="text-center py-12 rounded-2xl text-sm"
                            style={{
                                background: isDark ? 'rgba(7,20,40,0.8)' : 'rgba(255,255,255,0.8)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.08)'}`,
                                color: muted,
                            }}
                        >
                            No profiles yet — join and submit or grade entries to appear here.
                        </div>
                    ) : (
                        rankedProfiles.map((entry, i) => {
                            const rank = i + 1
                            const isTopThree = rank <= 3
                            const glow = isTopThree
                                ? rank === 1 ? 'rgba(245,166,35,0.35)' : rank === 2 ? 'rgba(148,163,184,0.35)' : 'rgba(180,83,9,0.3)'
                                : null
                            const approvals = Object.values(entry.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
                            return (
                                <motion.div
                                    key={entry.username}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.45) }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-2xl card-hover"
                                    style={{
                                        background: isTopThree
                                            ? isDark ? 'rgba(7,20,40,0.95)' : 'rgba(255,255,255,0.98)'
                                            : isDark ? 'rgba(4,12,24,0.7)' : 'rgba(255,255,255,0.7)',
                                        border: isTopThree
                                            ? `1px solid ${glow}`
                                            : `1px solid ${isDark ? 'rgba(79,195,247,0.08)' : 'rgba(15,23,42,0.08)'}`,
                                        boxShadow: isTopThree ? `0 0 16px ${glow}` : 'none',
                                    }}
                                >
                                    <div className="w-8 flex items-center justify-center flex-shrink-0">
                                        {RANK_ICONS[rank] || (
                                            <span className="font-bold text-sm" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                                                {rank}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                                        style={{
                                            background: isDark ? 'rgba(7,20,40,0.8)' : 'rgba(240,244,248,0.8)',
                                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.1)'}`,
                                            color: isDark ? '#4fc3f7' : '#0284c7',
                                        }}
                                    >
                                        {String(entry.username || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                                                {entry.username}
                                            </span>
                                        </div>
                                        <div className="text-xs" style={{ color: muted }}>
                                            {approvals} approved hub entr{approvals === 1 ? 'y' : 'ies'} · {(entry.reviewsCompleted || 0)} grades
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-black text-sm tabular-nums" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                                            {entry.points.toLocaleString()}
                                        </div>
                                        <div className="text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>pts</div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs mt-8 leading-relaxed"
                    style={{ color: isDark ? '#475569' : '#94a3b8' }}
                >
                    Local demo ledger (localStorage): honors compare accounts on this device only. Segment text is sorted easiest → hardest after approval.
                </motion.p>
            </div>
        </div>
    )
}
