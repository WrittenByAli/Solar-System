import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ImagePlus,
    CheckCircle,
    AlertCircle,
    Grid3x3,
    Loader2,
    ArrowRight,
    Layers,
    MapPin,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/solar-create.css'
import {
    ARCHIVE_HUB_LOCATIONS,
    REGISTRY_CATEGORIES,
    addArchiveToLibrary,
    clampGridSide,
    defaultArchiveInstance,
    imageFileToCoverDataUrl,
    loadArchiveLibrary,
    loadHubArchiveConfig,
    saveHubArchiveConfig,
    slugifyArchiveSlug,
    upsertArchiveRegistryEntry,
    GRID_SIDE_MAX,
    normalizeHubId,
} from '../utils/archiveInstanceStorage.js'

export default function CreateArchive() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { isLoggedIn, username, profile } = useAuth()
    const userId = profile?.id || null

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [])

    const lastFileRef = useRef(null)
    const [phase, setPhase] = useState('idle')
    const [err, setErr] = useState('')
    const [hubPlanetId, setHubPlanetId] = useState('earth')
    const [rawDims, setRawDims] = useState(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [coverDataUrl, setCoverDataUrl] = useState('')
    const [dragActive, setDragActive] = useState(false)
    const [libraryTick, setLibraryTick] = useState(0)

    const hubMeta = useMemo(
        () => ARCHIVE_HUB_LOCATIONS.find((h) => h.id === hubPlanetId) || ARCHIVE_HUB_LOCATIONS.find((h) => h.id === 'earth'),
        [hubPlanetId],
    )

    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [category, setCategory] = useState('general')
    const [contactUrl, setContactUrl] = useState('')
    const [listPublicly, setListPublicly] = useState(false)

    useEffect(() => {
        const cfg = loadHubArchiveConfig(hubPlanetId)
        setTitle(cfg.instanceTitle || '')
        setSlug(cfg.slug || '')
        setCategory(cfg.category || 'general')
        setContactUrl(cfg.contactUrl || '')
        setListPublicly(!!cfg.listedOnRegistry)
    }, [hubPlanetId])

    const [savedLibrary, setSavedLibrary] = useState(() => loadArchiveLibrary(userId))

    useEffect(() => {
        const bump = () => {
            setLibraryTick((t) => t + 1)
            setSavedLibrary(loadArchiveLibrary(userId))
        }
        window.addEventListener('solar-archive-library-updated', bump)
        return () => window.removeEventListener('solar-archive-library-updated', bump)
    }, [userId])

    useEffect(() => {
        setSavedLibrary(loadArchiveLibrary(userId))
    }, [libraryTick, userId])

    const applyImageFile = useCallback(async (file) => {
        setErr('')
        if (!file || !file.type?.startsWith('image/')) {
            setErr('Please drop an image file (PNG, JPEG, WebP, GIF…).')
            return
        }
        lastFileRef.current = file
        setPhase('loading')
        try {
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl((prev) => {
                if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
                return objectUrl
            })

            const img = new Image()
            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = objectUrl
            })

            const w = img.naturalWidth
            const h = img.naturalHeight
            if (!w || !h) throw new Error('Could not read image dimensions.')
            setRawDims({ w, h })

            const cover = await imageFileToCoverDataUrl(file, 960, 0.78)
            setCoverDataUrl(cover)
            setPhase('ready')
        } catch (e) {
            setErr(e?.message || 'Could not process image.')
            setPhase('idle')
            lastFileRef.current = null
        }
    }, [])

    useEffect(() => () => {
        if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }, [previewUrl])

    const effectiveW = rawDims ? clampGridSide(rawDims.w) : null
    const effectiveH = rawDims ? clampGridSide(rawDims.h) : null
    const wasClamped =
        rawDims &&
        (effectiveW !== rawDims.w || effectiveH !== rawDims.h)

    const handleSave = async () => {
        if (!rawDims || effectiveW == null || effectiveH == null) {
            setErr('Upload an image first.')
            return
        }
        const sl = slugifyArchiveSlug(slug || title || username || 'my-archive')
        if (!sl) {
            setErr('Add a title or slug so this archive has a name.')
            return
        }
        setErr('')
        setPhase('saving')
        try {
            let coverStored = coverDataUrl
            if (lastFileRef.current) {
                try {
                    coverStored = await imageFileToCoverDataUrl(lastFileRef.current, 960, 0.76)
                } catch {
                    /* keep prior */
                }
            }

            let thumbSm = ''
            if (lastFileRef.current) {
                try {
                    thumbSm = await imageFileToCoverDataUrl(lastFileRef.current, 280, 0.7)
                } catch {
                    /* optional */
                }
            }

            const hid = normalizeHubId(hubPlanetId)

            await saveHubArchiveConfig(hid, {
                gridWidth: effectiveW,
                gridHeight: effectiveH,
                coverImageDataUrl: coverStored,
                instanceTitle: title.trim() || 'My archive',
                slug: sl,
                category,
                contactUrl: contactUrl.trim(),
                listedOnRegistry: listPublicly,
            })

            await addArchiveToLibrary({
                slug: sl,
                title: title.trim() || 'My archive',
                category,
                gridWidth: effectiveW,
                gridHeight: effectiveH,
                contactUrl: contactUrl.trim(),
                thumb: thumbSm,
                owner: username || 'guest',
                listedOnRegistry: listPublicly,
                hubPlanetId: hid,
            }, userId)

            if (listPublicly) {
                try {
                    await upsertArchiveRegistryEntry({
                        slug: sl,
                        title: title.trim() || 'Untitled archive',
                        category,
                        gridWidth: effectiveW,
                        gridHeight: effectiveH,
                        owner: username || 'anonymous',
                        coverThumb: thumbSm,
                        hubPlanetId: hid,
                        demoNote: 'Listed on the SOLAR directory',
                    })
                } catch {
                    /* registry optional */
                }
            }

            setPhase('done')
        } catch (e) {
            setErr(typeof e?.message === 'string' ? e.message : 'Save failed.')
            setPhase('ready')
        }
    }

    const muted = isDark ? '#ffffff' : '#000000'
    const ink = isDark ? '#ffffff' : '#000000'

    const ambient = isDark
        ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,195,247,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(124,58,237,0.12), transparent), radial-gradient(ellipse 50% 35% at 0% 80%, rgba(245,166,35,0.08), transparent)'
        : 'radial-gradient(ellipse 80% 50% at 50% -15%, rgba(2,132,199,0.12), transparent), radial-gradient(ellipse 55% 40% at 95% 40%, rgba(124,58,237,0.08), transparent), radial-gradient(ellipse 45% 30% at 5% 85%, rgba(245,166,35,0.06), transparent)'

    if (phase === 'done') {
        return (
            <div className="solar-page solar-page--center sa-create-page relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ background: ambient }} />
                <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 solar-page__inner max-w-lg mx-auto text-center"
                >
                    <div
                        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(79,195,247,0.2))',
                            border: '1px solid rgba(52,211,153,0.35)',
                            boxShadow: '0 0 48px rgba(52,211,153,0.25)',
                        }}
                    >
                        <CheckCircle size={44} color="#34d399" strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight" style={{ color: ink }}>
                        Archive added
                    </h1>
                    <p className="text-sm mb-2 leading-relaxed" style={{ color: muted }}>
                        Grid <strong style={{ color: ink }}>{effectiveW} × {effectiveH}</strong> is live for{' '}
                        <strong style={{ color: ink }}>{hubMeta?.label || hubPlanetId}</strong> — open it below or return to the Solar map to pick another hub. Layer 1 is the front page; zoom deeper for detail.
                    </p>
                    <p className="text-xs mb-10" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        Saved to this browser and appended to your archive library when you return.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                        <Link
                            to={`/archive/${normalizeHubId(hubPlanetId)}`}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                                boxShadow: '0 12px 40px rgba(124,58,237,0.35)',
                            }}
                        >
                            Open archive <ArrowRight size={16} />
                        </Link>
                        <Link
                            to="/map"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold border transition-colors"
                            style={{
                                borderColor: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(15,23,42,0.15)',
                                color: ink,
                                background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.9)',
                            }}
                        >
                            Solar map
                        </Link>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold border transition-colors"
                            style={{
                                borderColor: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(15,23,42,0.15)',
                                color: ink,
                                background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.9)',
                            }}
                        >
                            Home
                        </Link>
                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold border transition-colors"
                            style={{
                                borderColor: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(15,23,42,0.15)',
                                color: ink,
                                background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.9)',
                            }}
                            onClick={() => setPhase('idle')}
                        >
                            Add another
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    const saveDisabled = phase !== 'ready' || phase === 'saving'

    return (
        <div className="solar-page sa-create-page relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: ambient }} />

            <div className="relative z-10 solar-page__inner solar-page__inner--md">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="solar-page__hero"
                >
                    <h1
                        className="sa-create-title mb-4"
                        style={{ color: ink }}
                    >
                        Create Archive
                    </h1>
                    <p className="text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-4" style={{ color: muted }}>
                        Upload an image to generate a coordinate grid, capped at <strong style={{ color: ink }}>{GRID_SIDE_MAX}px</strong> per side.
                    </p>
                </motion.div>

                {!isLoggedIn && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-8 p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        style={{
                            background: isDark ? 'rgba(245,166,35,0.08)' : 'rgba(251,191,36,0.08)',
                            border: `1px solid ${isDark ? 'rgba(251,191,36,0.28)' : 'rgba(217,119,6,0.22)'}`,
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <span className="text-sm" style={{ color: ink }}>Sign in so saved archives show your username.</span>
                        <Link
                            to="/join"
                            className="font-bold px-5 py-2.5 rounded-xl text-center text-white text-sm shrink-0 shadow-md"
                            style={{ background: 'linear-gradient(135deg, #f5a623, #ea580c)' }}
                        >
                            Join / Login
                        </Link>
                    </motion.div>
                )}

                {/* Drop zone */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-3xl p-1 mb-8"
                    style={{
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(79,195,247,0.35), rgba(124,58,237,0.25), rgba(245,166,35,0.2))'
                            : 'linear-gradient(135deg, rgba(2,132,199,0.35), rgba(124,58,237,0.22), rgba(245,166,35,0.18))',
                    }}
                >
                    <div
                        className="rounded-[22px] p-6 md:p-10"
                        style={{
                            background: isDark ? 'rgba(4,8,20,0.92)' : 'rgba(255,255,255,0.96)',
                            backdropFilter: 'blur(16px)',
                        }}
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                        onDrop={(e) => {
                            e.preventDefault()
                            setDragActive(false)
                            const f = e.dataTransfer?.files?.[0]
                            if (f) applyImageFile(f)
                        }}
                    >
                        <label className="block cursor-pointer group">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) applyImageFile(f)
                                    e.target.value = ''
                                }}
                            />
                            <div
                                className="rounded-2xl border-2 border-dashed py-14 md:py-20 px-6 text-center transition-all duration-300"
                                style={{
                                    borderColor: dragActive
                                        ? (isDark ? '#4fc3f7' : '#0284c7')
                                        : isDark ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.45)',
                                    background: dragActive
                                        ? (isDark ? 'rgba(79,195,247,0.08)' : 'rgba(2,132,199,0.06)')
                                        : isDark ? 'rgba(15,23,42,0.35)' : 'rgba(248,250,252,0.9)',
                                    boxShadow: dragActive ? '0 0 0 4px rgba(79,195,247,0.15)' : 'none',
                                }}
                            >
                                <div
                                    className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                                    style={{
                                        background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.1)',
                                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}`,
                                    }}
                                >
                                    {phase === 'loading' ? (
                                        <Loader2 size={32} className="animate-spin" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }} />
                                    ) : (
                                        <ImagePlus size={32} style={{ color: isDark ? '#4fc3f7' : '#0284c7' }} />
                                    )}
                                </div>
                                <p className="font-black text-lg mb-2" style={{ color: ink }}>
                                    {dragActive ? 'Release to set grid size' : 'Drag & drop your canvas image'}
                                </p>
                                <p className="text-sm mb-4" style={{ color: muted }}>
                                    or click anywhere in this frame — PNG, JPEG, WebP, GIF
                                </p>
                                <span
                                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full"
                                    style={{
                                        background: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)',
                                        color: isDark ? '#c4b5fd' : '#6d28d9',
                                    }}
                                >
                                    <Grid3x3 size={14} /> Pixels → cells
                                </span>
                            </div>
                        </label>

                        <AnimatePresence>
                            {previewUrl && rawDims && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0 }}
                                    className="mt-8 grid md:grid-cols-[minmax(0,220px)_1fr] gap-6 items-start"
                                >
                                    <div className="rounded-xl overflow-hidden border shadow-lg" style={{ borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.08)' }}>
                                        <img src={previewUrl} alt="" className="w-full h-auto max-h-52 object-cover object-center" />
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <div
                                            className="px-4 py-3 rounded-xl min-w-[140px]"
                                            style={{
                                                background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.08)',
                                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.22)' : 'rgba(2,132,199,0.18)'}`,
                                            }}
                                        >
                                            <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: muted }}>Source</div>
                                            <div className="text-lg font-black tabular-nums font-mono" style={{ color: ink }}>
                                                {rawDims.w} × {rawDims.h}
                                            </div>
                                        </div>
                                        <div
                                            className="px-4 py-3 rounded-xl min-w-[140px]"
                                            style={{
                                                background: isDark ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.1)',
                                                border: `1px solid ${isDark ? 'rgba(251,191,36,0.28)' : 'rgba(217,119,6,0.2)'}`,
                                            }}
                                        >
                                            <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: muted }}>Grid</div>
                                            <div className="text-lg font-black tabular-nums font-mono" style={{ color: ink }}>
                                                {effectiveW} × {effectiveH}
                                            </div>
                                        </div>
                                        {wasClamped && (
                                            <div className="w-full text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(251,191,36,0.12)', color: isDark ? '#fcd34d' : '#b45309' }}>
                                                Clamped to max {GRID_SIDE_MAX}px per side for performance.
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {err && (
                            <div className="flex items-center gap-2 mt-5 text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                                <AlertCircle size={18} className="shrink-0" /> {err}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Details */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="rounded-3xl p-6 md:p-8 mb-10 space-y-5"
                    style={{
                        background: isDark ? 'rgba(7,16,36,0.75)' : 'rgba(255,255,255,0.85)',
                        border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)'}`,
                        backdropFilter: 'blur(20px)',
                        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.35)' : '0 24px 60px rgba(15,23,42,0.08)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Layers size={18} style={{ color: isDark ? '#94a3b8' : '#475569' }} />
                        <h2 className="text-sm font-black uppercase tracking-[0.15em]" style={{ color: muted }}>
                            Archive details
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold block mb-1.5 flex items-center gap-2" style={{ color: muted }}>
                                <MapPin size={14} aria-hidden /> Map hub (archive route)
                            </label>
                            <select
                                value={hubPlanetId}
                                onChange={(e) => setHubPlanetId(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            >
                                {ARCHIVE_HUB_LOCATIONS.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.label} — {h.subtitle}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] mt-1.5 leading-snug" style={{ color: muted }}>
                                Grid image and metadata save per hub under <span className="font-mono">/archive/{'{hub}'}</span>.
                            </p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold block mb-1.5" style={{ color: muted }}>Display title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Noir film index — 1950s"
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-sky-500/40"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1.5" style={{ color: muted }}>Slug</label>
                            <input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="auto from title if empty"
                                className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-sky-500/40"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1.5" style={{ color: muted }}>Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            >
                                {REGISTRY_CATEGORIES.map((c) => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold block mb-1.5" style={{ color: muted }}>Site / contact (optional)</label>
                            <input
                                value={contactUrl}
                                onChange={(e) => setContactUrl(e.target.value)}
                                placeholder="https://…"
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/40"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            />
                        </div>
                    </div>

                    <label className="flex items-start gap-3 text-sm cursor-pointer rounded-xl p-3 -mx-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                        <input type="checkbox" checked={listPublicly} onChange={(e) => setListPublicly(e.target.checked)} className="mt-1 rounded border-gray-400" />
                        <span style={{ color: muted }}>
                            Publish to the <strong style={{ color: ink }}>local directory</strong>.
                        </span>
                    </label>

                    <motion.button
                        type="button"
                        whileHover={{ scale: saveDisabled ? 1 : 1.01 }}
                        whileTap={{ scale: saveDisabled ? 1 : 0.98 }}
                        disabled={saveDisabled}
                        onClick={handleSave}
                        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.12em] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl"
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed 0%, #4fc3f7 50%, #34d399 100%)',
                            boxShadow: '0 16px 48px rgba(124,58,237,0.35)',
                        }}
                    >
                        {phase === 'saving' ? (
                            <>
                                <Loader2 size={20} className="animate-spin" /> Saving…
                            </>
                        ) : (
                            <>Add archive</>
                        )}
                    </motion.button>

                    <button
                        type="button"
                        className="w-full text-xs py-2 opacity-70 hover:opacity-100 transition-opacity"
                        style={{ color: muted }}
                        onClick={() => {
                            const blank = defaultArchiveInstance()
                            saveHubArchiveConfig(normalizeHubId(hubPlanetId), blank).catch(() => {})
                            window.dispatchEvent(new Event('solar-archive-instance-updated'))
                            if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
                            lastFileRef.current = null
                            setRawDims(null)
                            setPreviewUrl('')
                            setCoverDataUrl('')
                            setPhase('idle')
                            setErr('')
                            setTitle('')
                            setSlug('')
                            setCategory('general')
                            setContactUrl('')
                            setListPublicly(false)
                        }}
                    >
                        Reset this hub&apos;s grid to default SOLAR canvas (3840×2160)
                    </button>
                </motion.div>

                {/* Library */}
                {savedLibrary.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-3xl p-6 md:p-8"
                        style={{
                            background: isDark ? 'rgba(4,10,24,0.55)' : 'rgba(248,250,252,0.9)',
                            border: `1px solid ${isDark ? 'rgba(148,163,184,0.1)' : 'rgba(15,23,42,0.06)'}`,
                        }}
                    >
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-5" style={{ color: muted }}>
                            Your archives ({savedLibrary.length})
                        </h3>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {savedLibrary.slice(0, 12).map((a) => (
                                <div
                                    key={a.id}
                                    className="flex-shrink-0 w-44 rounded-2xl overflow-hidden border"
                                    style={{
                                        borderColor: isDark ? 'rgba(71,85,105,0.35)' : 'rgba(226,232,240,1)',
                                        background: isDark ? 'rgba(15,23,42,0.8)' : '#fff',
                                    }}
                                >
                                    <div className="aspect-video bg-slate-800/10 flex items-center justify-center overflow-hidden">
                                        {a.thumb?.startsWith('data:') ? (
                                            <img src={a.thumb} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Grid3x3 size={28} style={{ color: muted, opacity: 0.5 }} />
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="font-bold text-xs truncate" style={{ color: ink }}>{a.title}</div>
                                        <div className="text-[10px] font-mono mt-1 truncate" style={{ color: muted }}>
                                            {(ARCHIVE_HUB_LOCATIONS.find((h) => h.id === a.hubPlanetId)?.label || a.hubPlanetId)}
                                            {' · '}{a.gridWidth}×{a.gridHeight}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

