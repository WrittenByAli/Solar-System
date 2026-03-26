import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Star, Zap } from 'lucide-react'
import { useTheme } from '../App.jsx'

const MOCK_ENTRIES = [
    { rank: 1, username: 'aurora_field', planet: 'Sun', domain: 'Energy Research', entries: 47, points: 9840, avatar: '🌟', badge: 'Platinum' },
    { rank: 2, username: 'marine_depth', planet: 'Neptune', domain: 'Marine', entries: 38, points: 8120, avatar: '🌊', badge: 'Gold' },
    { rank: 3, username: 'terra_nova', planet: 'Earth', domain: 'Ecology', entries: 35, points: 7340, avatar: '🌿', badge: 'Gold' },
    { rank: 4, username: 'red_horizon', planet: 'Mars', domain: 'Resilience', entries: 29, points: 6050, avatar: '🔴', badge: 'Silver' },
    { rank: 5, username: 'gas_phantom', planet: 'Jupiter', domain: 'Systems', entries: 27, points: 5670, avatar: '⚡', badge: 'Silver' },
    { rank: 6, username: 'ring_weaver', planet: 'Saturn', domain: 'Materials', entries: 24, points: 4990, avatar: '💍', badge: 'Silver' },
    { rank: 7, username: 'storm_herald', planet: 'Venus', domain: 'Atmosphere', entries: 21, points: 4320, avatar: '🌪️', badge: 'Bronze' },
    { rank: 8, username: 'signal_lost', planet: 'Mercury', domain: 'Communication', entries: 19, points: 3870, avatar: '📡', badge: 'Bronze' },
    { rank: 9, username: 'ice_arc', planet: 'Uranus', domain: 'Geophysics', entries: 16, points: 3210, avatar: '🧊', badge: 'Bronze' },
    { rank: 10, username: 'void_mapper', planet: 'Neptune', domain: 'Marine', entries: 14, points: 2890, avatar: '🗺️', badge: 'Bronze' },
    { rank: 11, username: 'light_seeker', planet: 'Sun', domain: 'Energy', entries: 13, points: 2640, avatar: '☀️', badge: 'Contributor' },
    { rank: 12, username: 'deep_current', planet: 'Earth', domain: 'Ecology', entries: 11, points: 2100, avatar: '🌱', badge: 'Contributor' },
]

const BADGE_STYLES = {
    Platinum: { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', color: '#0f172a', glow: 'rgba(148,163,184,0.4)' },
    Gold: { bg: 'linear-gradient(135deg, #f5a623, #fb923c)', color: '#7c2d12', glow: 'rgba(245,166,35,0.4)' },
    Silver: { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#f1f5f9', glow: 'rgba(148,163,184,0.3)' },
    Bronze: { bg: 'linear-gradient(135deg, #92400e, #b45309)', color: '#fef3c7', glow: 'rgba(180,83,9,0.3)' },
    Contributor: { bg: 'linear-gradient(135deg, #4fc3f7, #7c3aed)', color: '#ffffff', glow: 'rgba(79,195,247,0.25)' },
}

const RANK_ICONS = {
    1: <Trophy size={18} color="#f5a623" />,
    2: <Medal size={18} color="#94a3b8" />,
    3: <Medal size={18} color="#b45309" />,
}

export default function Leaderboard() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
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
                    <p className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        Top contributors expanding the SOLAR Archive
                    </p>
                </motion.div>

                {/* Stats bar */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-3 mb-8"
                >
                    {[
                        { label: 'Total Entries', value: '1,247', icon: '📚' },
                        { label: 'Contributors', value: '89', icon: '👥' },
                        { label: 'Planets Active', value: '9', icon: '🪐' },
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
                            <div className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Leaderboard rows */}
                <div className="flex flex-col gap-2">
                    {MOCK_ENTRIES.map((entry, i) => {
                        const badge = BADGE_STYLES[entry.badge]
                        const isTopThree = entry.rank <= 3
                        return (
                            <motion.div
                                key={entry.rank}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl card-hover"
                                style={{
                                    background: isTopThree
                                        ? isDark ? 'rgba(7,20,40,0.95)' : 'rgba(255,255,255,0.98)'
                                        : isDark ? 'rgba(4,12,24,0.7)' : 'rgba(255,255,255,0.7)',
                                    border: isTopThree
                                        ? `1px solid ${badge.glow}`
                                        : `1px solid ${isDark ? 'rgba(79,195,247,0.08)' : 'rgba(15,23,42,0.08)'}`,
                                    boxShadow: isTopThree ? `0 0 20px ${badge.glow}` : 'none',
                                }}
                            >
                                {/* Rank */}
                                <div className="w-8 flex items-center justify-center flex-shrink-0">
                                    {RANK_ICONS[entry.rank] || (
                                        <span className="font-bold text-sm" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                                            {entry.rank}
                                        </span>
                                    )}
                                </div>

                                {/* Avatar */}
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                                    style={{
                                        background: isDark ? 'rgba(7,20,40,0.8)' : 'rgba(240,244,248,0.8)',
                                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.1)'}`,
                                    }}
                                >
                                    {entry.avatar}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                                            {entry.username}
                                        </span>
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                                            style={{ background: badge.bg, color: badge.color }}
                                        >
                                            {entry.badge}
                                        </span>
                                    </div>
                                    <div className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                                        {entry.planet} · {entry.domain}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="text-right flex-shrink-0">
                                    <div className="font-black text-sm" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                                        {entry.points.toLocaleString()}
                                    </div>
                                    <div className="text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                                        {entry.entries} entries
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center text-xs mt-8"
                    style={{ color: isDark ? '#1e3a5f' : '#cbd5e1' }}
                >
                    Submit entries to climb the ranks · Updated in real-time
                </motion.p>
            </div>
        </div>
    )
}
