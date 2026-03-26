import React from 'react'
import { motion } from 'framer-motion'
import { Star, BookOpen, ChevronRight } from 'lucide-react'

function formatCoord(n) {
    return String(Math.abs(n)).padStart(7, '0')
}

function DifficultyStars({ level }) {
    return (
        <div className="flex gap-0.5 items-center">
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ fontSize: 13, color: i <= level ? '#f5a623' : 'rgba(245,166,35,0.2)' }}>★</span>
            ))}
            <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>{level}/5</span>
        </div>
    )
}

export default function HoverDetail({ entry, x, y, planet, theme }) {
    if (!entry) return null
    const isDark = theme === 'dark'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
                position: 'absolute',
                bottom: 90,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                width: 'min(420px, 88vw)',
                borderRadius: 16,
                overflow: 'hidden',
                background: isDark ? 'rgba(4,12,24,0.97)' : 'rgba(255,255,255,0.98)',
                border: `1px solid ${planet.color}55`,
                boxShadow: `0 0 40px ${planet.glowColor}, 0 20px 60px rgba(0,0,0,0.5)`,
                backdropFilter: 'blur(20px)',
                pointerEvents: 'none',
            }}
        >
            {/* Header stripe */}
            <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{
                    background: `linear-gradient(90deg, ${planet.color}22, transparent)`,
                    borderBottom: `1px solid ${planet.color}33`,
                }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: planet.glowColor, color: planet.color }}
                    >
                        {planet.planet[0]}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: planet.color }}>{planet.domain}</span>
                </div>
                <span className="text-xs font-mono" style={{ color: isDark ? '#4fc3f7' : '#0284c7', opacity: 0.7 }}>
                    ({formatCoord(x)}, {formatCoord(y)})
                </span>
            </div>

            <div className="p-4">
                {/* Title */}
                <h3 className="font-black text-base mb-1" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                    {entry.subject}
                </h3>
                <div className="mb-3">
                    <DifficultyStars level={entry.difficulty} />
                </div>

                {/* Summary */}
                <div
                    className="p-3 rounded-xl mb-3"
                    style={{
                        background: isDark ? 'rgba(79,195,247,0.05)' : 'rgba(2,132,199,0.05)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.12)'}`,
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <BookOpen size={11} style={{ color: isDark ? '#4fc3f7' : '#0284c7' }} />
                        <span className="text-xs font-semibold" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>Summary</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                        {entry.summary}
                    </p>
                </div>

                {/* Detail teaser */}
                <div
                    className="p-3 rounded-xl"
                    style={{
                        background: isDark ? 'rgba(245,166,35,0.05)' : 'rgba(217,119,6,0.05)',
                        border: `1px solid ${isDark ? 'rgba(245,166,35,0.12)' : 'rgba(217,119,6,0.12)'}`,
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <ChevronRight size={11} style={{ color: isDark ? '#f5a623' : '#d97706' }} />
                        <span className="text-xs font-semibold" style={{ color: isDark ? '#f5a623' : '#d97706' }}>Technical Detail</span>
                    </div>
                    <p
                        className="text-xs leading-relaxed overflow-hidden"
                        style={{
                            color: isDark ? '#94a3b8' : '#475569',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {entry.detail}
                    </p>
                </div>

                <p className="text-center text-xs mt-2.5" style={{ color: isDark ? '#1e3a5f' : '#cbd5e1' }}>Zoom to ZL7+ for full technical data</p>
            </div>
        </motion.div>
    )
}
