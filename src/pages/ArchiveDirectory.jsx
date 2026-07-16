import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import { ExternalLink, Plus, LayoutGrid, AlertCircle, Database, Search, Radio, BookOpen } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { REGISTRY_CATEGORIES, loadArchiveRegistry } from '../utils/archiveInstanceStorage.js'
import { getHub } from '../utils/hubRegistry.js'
import { LAYER_SHORT_NAMES } from '../utils/archiveLayerSpecs.js'
import { supabase } from '../utils/supabaseClient.js'
import '../styles/solar-directory.css'

function categoryLabel(id) {
    return REGISTRY_CATEGORIES.find((c) => c.id === id)?.label || id
}

function hubLabel(id) {
    if (!id) return null
    return getHub(id)?.name || id
}

const LAYER_NAMES = LAYER_SHORT_NAMES

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
    const [sceneReveal, setSceneReveal] = useState(0)
    const [tick, setTick] = useState(0)
    const [, setHubsTick] = useState(0)
    const ink = isDark ? '#f8fafc' : '#0f172a'
    const linkColor = isDark ? '#f5a623' : '#0369a1'

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [])

    useEffect(() => {
        const bump = () => setHubsTick((t) => t + 1)
        window.addEventListener('solar-hubs-updated', bump)
        return () => window.removeEventListener('solar-hubs-updated', bump)
    }, [])

    useEffect(() => {
        let frame
        const start = performance.now()
        const duration = 900
        const tickReveal = (now) => {
            const p = Math.min(1, (now - start) / duration)
            setSceneReveal(1 - Math.pow(1 - p, 3))
            if (p < 1) frame = requestAnimationFrame(tickReveal)
        }
        frame = requestAnimationFrame(tickReveal)
        return () => cancelAnimationFrame(frame)
    }, [])

    useEffect(() => {
        const bump = () => setTick((t) => t + 1)
        window.addEventListener('solar-archive-registry-updated', bump)
        return () => window.removeEventListener('solar-archive-registry-updated', bump)
    }, [])

    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick invalidates localStorage-backed data the inputs can't see
    const rows = useMemo(() => loadArchiveRegistry(), [tick])

    // Live archive entries from Supabase, now served by the Postgres
    // full-text search RPC (GIN index over title/content/tags) with
    // planet + layer filters applied server-side.
    const [filteredEntries, setFilteredEntries] = useState(null) // null = loading
    const [entryHubs, setEntryHubs] = useState([])
    const [totalApproved, setTotalApproved] = useState(0)
    const [entryHub, setEntryHub] = useState('all')
    const [entryLayer, setEntryLayer] = useState('all')
    const [entryQuery, setEntryQuery] = useState('')

    // One-time: total approved count + the set of hubs that actually have
    // approved entries (drives the hub dropdown options).
    useEffect(() => {
        let active = true
        supabase
            .from('archive_entries')
            .select('planet_id', { count: 'exact' })
            .eq('status', 'approved')
            .is('deleted_at', null)
            .then(({ data, count, error }) => {
                if (!active || error) return
                setTotalApproved(count || 0)
                setEntryHubs([...new Set((data || []).map((e) => e.planet_id))].sort())
            })
        return () => { active = false }
    }, [])

    // Debounced search — re-runs on query/hub/layer change.
    useEffect(() => {
        let active = true
        const run = () => {
            supabase
                .rpc('search_archive_entries', {
                    p_query: entryQuery.trim(),
                    p_planet: entryHub === 'all' ? null : entryHub,
                    p_layer: entryLayer === 'all' ? null : Number(entryLayer),
                    p_limit: 200,
                    p_offset: 0,
                })
                .then(({ data, error }) => {
                    if (!active) return
                    if (error) {
                        console.error('Directory search failed:', error.message)
                        setFilteredEntries([])
                        return
                    }
                    setFilteredEntries(data || [])
                })
        }
        const t = setTimeout(run, entryQuery ? 250 : 0)
        return () => { active = false; clearTimeout(t) }
    }, [entryQuery, entryHub, entryLayer])

    return (
        <div className={`solar-page sa-dir-page${isDark ? ' sa-dir-page--dark' : ' sa-dir-page--light'}`}>
            <LazyVantaFogBackground
                isDark={isDark}
                entryReveal={sceneReveal}
                className="sa-dir-page__vanta"
            />
            <div
                className="sa-dir-page__veil"
                style={{ opacity: Math.max(0, (isDark ? 0.14 : 0.1) - sceneReveal * (isDark ? 0.22 : 0.16)) }}
                aria-hidden="true"
            />
            <div
                className="sa-dir-page__vignette"
                style={{ opacity: isDark ? 0.2 + sceneReveal * 0.06 : 0.14 + sceneReveal * 0.04 }}
                aria-hidden="true"
            />

            <div className="sa-dir-page__inner" style={{ opacity: sceneReveal }}>
            <div className="sa-dir-shell">
                {/* ── Hero ── */}
                <motion.div
                    className="sa-dir-hero"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="sa-dir-hero__title">Archive Directory</h1>
                    <p className="sa-dir-hero__sub">
                        Browse hosted archives and approved research entries.
                    </p>
                    <div className="sa-dir-hero__prototype">
                        <AlertCircle size={14} style={{ flexShrink: 0, color: ink }} />
                        <span>
                            <strong style={{ color: ink }}>Local registry.</strong>{' '}
                            Hosted archive listings are stored in this browser and are not synced to{' '}
                            <a href="https://archive.solar" target="_blank" rel="noopener noreferrer" style={{ color: linkColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                archive.solar <ExternalLink size={10} />
                            </a>.
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
                        <Plus size={16} /> Create Archive
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
                        <Radio className="sa-dir-empty__icon" size={28} aria-hidden="true" />
                        <p className="sa-dir-empty__title">No Archives</p>
                        <p className="sa-dir-empty__sub">
                            Create an archive and enable directory listing to publish it here.
                        </p>
                        <Link to="/create-archive" className="sa-dir-btn-primary" style={{ display: 'inline-flex', marginTop: 22 }}>
                            <Plus size={15} /> Create Archive
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
                                whileHover={{ y: -1 }}
                            >
                                {/* Cover thumbnail */}
                                <div className="sa-dir-thumb">
                                    {row.coverThumb?.startsWith('data:')
                                        ? <img src={row.coverThumb} alt="" />
                                        : <BookOpen size={22} aria-hidden="true" />
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
                        <div className="sa-dir-entries__head-top">
                            <h2 className="sa-dir-entries__title">
                                <Database size={15} style={{ flexShrink: 0 }} />
                                Archive Entries
                            </h2>
                            <span className="sa-dir-count">
                                {filteredEntries === null
                                    ? 'Loading…'
                                    : `${filteredEntries.length} of ${totalApproved} entr${totalApproved !== 1 ? 'ies' : 'y'}`}
                            </span>
                        </div>
                        <p className="sa-dir-entries__sub">Approved research from the shared archive database.</p>
                    </div>

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
                        <select
                            className="sa-dir-entries__select"
                            value={entryLayer}
                            onChange={(e) => setEntryLayer(e.target.value)}
                            aria-label="Filter by layer"
                        >
                            <option value="all">All layers</option>
                            {Object.entries(LAYER_NAMES).map(([l, name]) => (
                                <option key={l} value={l}>L{l} · {name}</option>
                            ))}
                        </select>
                    </div>

                    {filteredEntries !== null && filteredEntries.length === 0 && (
                        <p className="sa-dir-entries__none">No entries match this filter.</p>
                    )}

                    <div className="sa-dir-entries__grid">
                        {(filteredEntries || []).map((e, i) => (
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
        </div>
    )
}
