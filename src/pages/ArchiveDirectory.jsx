import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, Plus, LayoutGrid, Sparkles, AlertCircle, Database, Search } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { ARCHIVE_HUB_LOCATIONS, REGISTRY_CATEGORIES, loadArchiveRegistry } from '../utils/archiveInstanceStorage.js'
import { supabase } from '../utils/supabaseClient.js'
import '../styles/solar-directory.css'

function categoryLabel(id) {
    return REGISTRY_CATEGORIES.find((c) => c.id === id)?.label || id
}

function hubLabel(id) {
    if (!id) return null
    return ARCHIVE_HUB_LOCATIONS.find((h) => h.id === String(id).toLowerCase())?.label || id
}

const LAYER_NAMES = { 4: 'Entry', 5: 'Detailed', 6: 'Segmented', 7: 'Deep', 8: 'Narrative' }

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: {
        opacity: 1, y: 0,
        transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
    },
}

export default function ArchiveDirectory() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [tick, setTick] = useState(0)
    const ink = isDark ? '#ffffff' : '#000000'

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [])

    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-registry-updated', bump)
        return () => window.removeEventListener('solar-archive-registry-updated', bump)
    }, [])

    const rows = useMemo(() => loadArchiveRegistry(), [tick])

    // Live archive entries from Supabase (Phase 2A — real database reads)
    const [entries, setEntries] = useState(null) // null = loading
    const [entryHub, setEntryHub] = useState('all')
    const [entryQuery, setEntryQuery] = useState('')

    useEffect(() => {
        let active = true
        supabase
            .from('archive_entries')
            .select('id,title,short_summary,layer,planet_id,status,created_at')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(200)
            .then(({ data, error }) => {
                if (!active) return
                if (error) {
                    console.error('Directory entries fetch failed:', error.message)
                    setEntries([])
                    return
                }
                setEntries(data || [])
            })
        return () => { active = false }
    }, [])

    const entryHubs = useMemo(() => {
        if (!entries) return []
        return [...new Set(entries.map((e) => e.planet_id))].sort()
    }, [entries])

    const filteredEntries = useMemo(() => {
        if (!entries) return []
        const q = entryQuery.trim().toLowerCase()
        return entries.filter((e) =>
            (entryHub === 'all' || e.planet_id === entryHub) &&
            (!q || e.title.toLowerCase().includes(q) || (e.short_summary || '').toLowerCase().includes(q)),
        )
    }, [entries, entryHub, entryQuery])

    return (
        <div className="solar-page sa-dir-page">
            {/* Cinematic background */}
            <div className="sa-dir-bg" aria-hidden="true">
                <div className="sa-dir-bg__grid" />
                <div className="sa-dir-bg__stars" />
                <div className="sa-dir-bg__glow" />
            </div>

            <div className="sa-dir-shell">
                {/* ── Hero ── */}
                <motion.div
                    className="sa-dir-hero"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="sa-dir-hero__title">
                        Explore the<br />
                        <span className="sa-dir-hero__title--accent">Archive Network</span>
                    </h1>
                    <p className="sa-dir-hero__sub">
                        A federated knowledge network of Solar Archive deployments. Each listing is a portable archive pack hosted on a research hub in the SOLAR coordinate system.
                    </p>
                    <div className="sa-dir-hero__prototype">
                        <AlertCircle size={14} style={{ flexShrink: 0, color: ink }} />
                        <span>
                            <strong style={{ color: ink }}>Prototype (frontend-only).</strong>{' '}
                            Listings exist only in this browser&apos;s local registry — not synced to{' '}
                            <a href="https://archive.solar" target="_blank" rel="noopener noreferrer" style={{ color: ink, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                archive.solar <ExternalLink size={10} />
                            </a>.
                            A future backend would power a public federation directory.
                        </span>
                    </div>
                </motion.div>

                {/* ── CTA ── */}
                <motion.div
                    className="sa-dir-cta"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.45 }}
                >
                    <Link to="/create-archive" className="sa-dir-btn-primary">
                        <Plus size={16} /> Start an archive
                    </Link>
                    {rows.length > 0 && (
                        <span className="sa-dir-count">
                            <LayoutGrid size={11} style={{ display: 'inline', marginRight: 5 }} />
                            {rows.length} listing{rows.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </motion.div>

                {/* ── Empty state ── */}
                {rows.length === 0 ? (
                    <motion.div
                        className="sa-dir-empty"
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: 0.26 }}
                    >
                        <span className="sa-dir-empty__icon" aria-hidden="true">📡</span>
                        <p className="sa-dir-empty__title">No archives registered yet</p>
                        <p className="sa-dir-empty__sub">
                            Create your first archive via Host Archive, then enable &quot;list on directory&quot; to see it appear here.
                        </p>
                        <Link to="/create-archive" className="sa-dir-btn-primary" style={{ display: 'inline-flex', marginTop: 22 }}>
                            <Sparkles size={15} /> Create your first archive
                        </Link>
                    </motion.div>
                ) : (
                    /* ── Archive listing grid ── */
                    <div className="sa-dir-grid">
                        {rows.map((row, i) => (
                            <motion.div
                                key={`${row.slug}-${row.publishedAt}`}
                                className="sa-dir-card"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                    delay: Math.min(i * 0.055, 0.32),
                                    duration: 0.48,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 280, damping: 22 } }}
                            >
                                <div className="sa-dir-card__scan" />

                                {/* Cover thumbnail */}
                                <div className="sa-dir-thumb">
                                    {row.coverThumb?.startsWith('data:')
                                        ? <img src={row.coverThumb} alt="" />
                                        : <span aria-hidden="true">📚</span>
                                    }
                                </div>

                                {/* Body */}
                                <div className="sa-dir-card__body">
                                    <div className="sa-dir-card__title">{row.title}</div>
                                    <div className="sa-dir-card__slug">/{row.slug}</div>

                                    <div className="sa-dir-card__meta">
                                        {hubLabel(row.hubPlanetId) && (
                                            <span className="sa-dir-meta-chip">{hubLabel(row.hubPlanetId)}</span>
                                        )}
                                        <span className="sa-dir-meta-chip">{categoryLabel(row.category)}</span>
                                        <span className="sa-dir-meta-chip">Grid {row.gridWidth}×{row.gridHeight}</span>
                                        {row.owner && <span className="sa-dir-meta-chip">{row.owner}</span>}
                                    </div>

                                    {row.demoNote && (
                                        <p className="sa-dir-card__note">{row.demoNote}</p>
                                    )}

                                    <div className="sa-dir-card__actions">
                                        {row.hubPlanetId && (
                                            <Link
                                                to={`/archive/${String(row.hubPlanetId).toLowerCase()}`}
                                                className="sa-dir-action-btn sa-dir-action-btn--purple"
                                            >
                                                Open archive hub
                                            </Link>
                                        )}
                                        <Link
                                            to="/map"
                                            className="sa-dir-action-btn sa-dir-action-btn--blue"
                                        >
                                            SOLAR map
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* ── Live archive entries (Supabase) ── */}
                <motion.section
                    className="sa-dir-entries"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    aria-label="Live archive entries"
                >
                    <div className="sa-dir-entries__head">
                        <h2 className="sa-dir-entries__title">
                            <Database size={15} style={{ flexShrink: 0 }} />
                            Live archive entries
                        </h2>
                        <span className="sa-dir-count">
                            {entries === null
                                ? 'Loading…'
                                : `${filteredEntries.length} of ${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`}
                        </span>
                    </div>
                    <p className="sa-dir-entries__sub">
                        Approved research entries, streamed live from the shared SOLAR database.
                    </p>

                    <div className="sa-dir-entries__filters">
                        <div className="sa-dir-entries__search">
                            <Search size={13} aria-hidden />
                            <input
                                type="search"
                                placeholder="Search title or summary…"
                                value={entryQuery}
                                onChange={(e) => setEntryQuery(e.target.value)}
                                aria-label="Search archive entries"
                            />
                        </div>
                        <select
                            className="sa-dir-entries__select"
                            value={entryHub}
                            onChange={(e) => setEntryHub(e.target.value)}
                            aria-label="Filter by hub"
                        >
                            <option value="all">All hubs</option>
                            {entryHubs.map((h) => (
                                <option key={h} value={h}>{hubLabel(h) || h}</option>
                            ))}
                        </select>
                    </div>

                    {entries !== null && filteredEntries.length === 0 && (
                        <p className="sa-dir-entries__none">No entries match this filter.</p>
                    )}

                    <div className="sa-dir-entries__grid">
                        {filteredEntries.map((e, i) => (
                            <motion.div
                                key={e.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.35 }}
                            >
                                <Link to={`/archive/${e.planet_id}`} className="sa-dir-entry">
                                    <div className="sa-dir-entry__title">{e.title}</div>
                                    {e.short_summary && (
                                        <p className="sa-dir-entry__summary">{e.short_summary}</p>
                                    )}
                                    <div className="sa-dir-card__meta" style={{ marginTop: 'auto' }}>
                                        <span className="sa-dir-meta-chip">{hubLabel(e.planet_id) || e.planet_id}</span>
                                        <span className="sa-dir-meta-chip">L{e.layer} · {LAYER_NAMES[e.layer] || 'Entry'}</span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>
            </div>
        </div>
    )
}
