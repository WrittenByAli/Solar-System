import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe, ExternalLink, Plus } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { ARCHIVE_HUB_LOCATIONS, REGISTRY_CATEGORIES, loadArchiveRegistry } from '../utils/archiveInstanceStorage.js'

function categoryLabel(id) {
    return REGISTRY_CATEGORIES.find((c) => c.id === id)?.label || id
}

function hubLabel(id) {
    if (!id) return null
    return ARCHIVE_HUB_LOCATIONS.find((h) => h.id === String(id).toLowerCase())?.label || id
}

function hubPrefix(id) {
    const l = hubLabel(id)
    return l ? `${l} hub · ` : ''
}

export default function ArchiveDirectory() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [tick, setTick] = useState(0)

    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-registry-updated', bump)
        return () => window.removeEventListener('solar-archive-registry-updated', bump)
    }, [])

    const rows = useMemo(() => loadArchiveRegistry(), [tick])

    const muted = isDark ? '#94a3b8' : '#64748b'
    const cardBg = isDark ? 'rgba(7,20,40,0.88)' : 'rgba(255,255,255,0.92)'
    const border = isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'

    return (
        <div className="solar-page">
            <div className="solar-page__inner solar-page__inner--md">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="solar-page__hero">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Globe size={28} color="#4fc3f7" />
                        <h1 className="text-3xl md:text-4xl font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                            Archive directory
                        </h1>
                    </div>
                    <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: muted }}>
                        <strong className="block mb-2" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                            Prototype (frontend-only)
                        </strong>
                        Listings below exist only in this browser&apos;s local registry — they are <strong>not</strong> synced to{' '}
                        <a href="https://archive.solar" target="_blank" rel="noopener noreferrer" className="font-semibold underline inline-flex items-center gap-1" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                            archive.solar <ExternalLink size={12} />
                        </a>
                        . A future backend would power a public federation directory; for now this page is an offline demo of that idea.
                    </p>
                </motion.div>

                <div className="flex justify-center mb-8">
                    <Link
                        to="/create-archive"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                    >
                        <Plus size={18} /> Start an archive (upload grid image)
                    </Link>
                </div>

                {rows.length === 0 ? (
                    <div
                        className="rounded-2xl p-10 text-center text-sm"
                        style={{ background: cardBg, border: `1px solid ${border}`, color: muted }}
                    >
                        No listings yet. Create your archive and opt in to “list on directory”.
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {rows.map((row, i) => (
                            <motion.li
                                key={`${row.slug}-${row.publishedAt}`}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.04, 0.35) }}
                                className="rounded-2xl p-4 flex gap-4 items-start"
                                style={{
                                    background: cardBg,
                                    border: `1px solid ${border}`,
                                }}
                            >
                                <div
                                    className="w-20 h-20 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-2xl"
                                    style={{
                                        background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(241,245,249,1)',
                                        border: `1px solid ${border}`,
                                    }}
                                >
                                    {row.coverThumb?.startsWith('data:')
                                        ? <img src={row.coverThumb} alt="" className="w-full h-full object-cover" />
                                        : <span aria-hidden>📚</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-sm truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                                        {row.title}
                                    </div>
                                    <div className="text-xs mt-1 font-mono" style={{ color: isDark ? '#67e8f9' : '#0369a1' }}>
                                        /{row.slug}
                                    </div>
                                    <div className="text-xs mt-2" style={{ color: muted }}>
                                        {hubPrefix(row.hubPlanetId)}
                                        {categoryLabel(row.category)} · Grid {row.gridWidth}×{row.gridHeight}
                                        {row.owner ? ` · ${row.owner}` : ''}
                                    </div>
                                    {row.demoNote && (
                                        <div className="text-[10px] mt-2 opacity-80 leading-snug" style={{ color: muted }}>
                                            {row.demoNote}
                                        </div>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {row.hubPlanetId && (
                                            <Link
                                                to={`/archive/${String(row.hubPlanetId).toLowerCase()}`}
                                                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                                                style={{
                                                    background: isDark ? 'rgba(167,139,250,0.2)' : 'rgba(124,58,237,0.12)',
                                                    color: isDark ? '#c4b5fd' : '#6d28d9',
                                                }}
                                            >
                                                Open archive hub
                                            </Link>
                                        )}
                                        <Link
                                            to="/map"
                                            className="text-xs font-bold px-3 py-1.5 rounded-lg"
                                            style={{
                                                background: isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.1)',
                                                color: isDark ? '#4fc3f7' : '#0284c7',
                                            }}
                                        >
                                            Open SOLAR map (demo)
                                        </Link>
                                    </div>
                                </div>
                            </motion.li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
