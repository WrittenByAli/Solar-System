import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ImagePlus,
    AlertCircle,
    ExternalLink,
    Package,
    Loader2,
    ArrowRight,
    Layers,
    MapPin,
    Grid3x3,
    Download,
    Upload,
    Server,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
    ARCHIVE_HUB_LOCATIONS,
    REGISTRY_CATEGORIES,
    clampGridSide,
    imageFileToCoverDataUrl,
    normalizeHubId,
    slugifyArchiveSlug,
    GRID_SIDE_MAX,
} from '../utils/archiveInstanceStorage.js'
import {
    applyArchivePackToBrowser,
    buildArchivePack,
    downloadArchivePackFile,
    parseArchivePackJson,
} from '../utils/archivePack.js'

export default function HostArchive() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { username } = useAuth()
    const navigate = useNavigate()

    const lastFileRef = useRef(null)
    const [phase, setPhase] = useState('idle')
    const [err, setErr] = useState('')
    const [hubPlanetId, setHubPlanetId] = useState('earth')
    const [rawDims, setRawDims] = useState(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [coverDataUrl, setCoverDataUrl] = useState('')
    const [dragActive, setDragActive] = useState(false)

    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [category, setCategory] = useState('general')
    const [contactUrl, setContactUrl] = useState('')

    const [importErr, setImportErr] = useState('')
    const [importBusy, setImportBusy] = useState(false)
    const [importDoneHub, setImportDoneHub] = useState(null)

    const hubMeta = useMemo(
        () => ARCHIVE_HUB_LOCATIONS.find((h) => h.id === hubPlanetId) || ARCHIVE_HUB_LOCATIONS.find((h) => h.id === 'earth'),
        [hubPlanetId],
    )

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

    const muted = isDark ? '#94a3b8' : '#64748b'
    const ink = isDark ? '#f1f5f9' : '#0f172a'

    const ambient = isDark
        ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,195,247,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(124,58,237,0.12), transparent), radial-gradient(ellipse 50% 35% at 0% 80%, rgba(245,166,35,0.08), transparent)'
        : 'radial-gradient(ellipse 80% 50% at 50% -15%, rgba(2,132,199,0.12), transparent), radial-gradient(ellipse 55% 40% at 95% 40%, rgba(124,58,237,0.08), transparent), radial-gradient(ellipse 45% 30% at 5% 85%, rgba(245,166,35,0.06), transparent)'

    const refreshCoverThumbFromFile = useCallback(async () => {
        const file = lastFileRef.current
        if (!file) return { cover: coverDataUrl, thumb: '' }
        let cover = coverDataUrl
        let thumb = ''
        try {
            cover = await imageFileToCoverDataUrl(file, 960, 0.76)
        } catch {
            /* keep */
        }
        try {
            thumb = await imageFileToCoverDataUrl(file, 280, 0.7)
        } catch {
            /* optional */
        }
        return { cover, thumb }
    }, [coverDataUrl])

    const packFields = useCallback(async () => {
        if (!rawDims || effectiveW == null || effectiveH == null) {
            throw new Error('Upload an image first.')
        }
        const sl = slugifyArchiveSlug(slug || title || username || 'hosted-archive')
        if (!sl) throw new Error('Add a title or slug for this pack.')
        const { cover, thumb } = await refreshCoverThumbFromFile()
        const hid = normalizeHubId(hubPlanetId)
        return buildArchivePack({
            hubPlanetId: hid,
            gridWidth: effectiveW,
            gridHeight: effectiveH,
            rawWidth: rawDims.w,
            rawHeight: rawDims.h,
            wasClamped,
            instanceTitle: title.trim() || 'Hosted archive',
            slug: sl,
            category,
            contactUrl: contactUrl.trim(),
            coverImageDataUrl: cover,
            thumbDataUrl: thumb,
        })
    }, [
        rawDims,
        effectiveW,
        effectiveH,
        wasClamped,
        slug,
        title,
        username,
        hubPlanetId,
        category,
        contactUrl,
        refreshCoverThumbFromFile,
    ])

    const handleDownloadPack = async () => {
        setErr('')
        try {
            const pack = await packFields()
            const base = slugifyArchiveSlug(pack.slug || pack.instanceTitle || 'solar-archive')
            downloadArchivePackFile(pack, base)
        } catch (e) {
            setErr(typeof e?.message === 'string' ? e.message : 'Could not build pack.')
        }
    }

    const handleApplyPackLocally = async () => {
        setErr('')
        try {
            const pack = await packFields()
            applyArchivePackToBrowser(pack, { username: username || 'guest' })
        } catch (e) {
            setErr(typeof e?.message === 'string' ? e.message : 'Could not apply pack.')
            return
        }
        const hid = normalizeHubId(hubPlanetId)
        navigate(`/archive/${hid}`)
    }

    const onImportFile = async (file) => {
        setImportErr('')
        setImportDoneHub(null)
        if (!file) return
        setImportBusy(true)
        try {
            const text = await file.text()
            const pack = parseArchivePackJson(text)
            applyArchivePackToBrowser(pack, { username: username || 'guest' })
            setImportDoneHub(normalizeHubId(pack.hubPlanetId))
        } catch (e) {
            setImportErr(typeof e?.message === 'string' ? e.message : 'Import failed.')
        } finally {
            setImportBusy(false)
        }
    }

    const buildDisabled = phase !== 'ready'

    return (
        <div className="min-h-screen pt-20 md:pt-24 pb-24 px-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: ambient }} />

            <div className="relative z-10 max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="text-center mb-10 md:mb-14"
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] mb-8 md:mb-10"
                        style={{
                            background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.1)',
                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}`,
                            color: isDark ? '#7dd3fc' : '#0369a1',
                        }}
                    >
                        <Package size={13} /> Portable bundle
                    </motion.div>

                    <h1
                        className="font-solar text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 bg-clip-text text-transparent"
                        style={{
                            backgroundImage: isDark
                                ? 'linear-gradient(135deg, #f8fafc 0%, #7dd3fc 45%, #fbbf24 100%)'
                                : 'linear-gradient(135deg, #0f172a 0%, #0284c7 45%, #d97706 100%)',
                        }}
                    >
                        Host an archive
                    </h1>
                    <p className="text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-4" style={{ color: muted }}>
                        Drop a picture: each pixel becomes one grid cell (capped at <strong style={{ color: ink }}>{GRID_SIDE_MAX}px</strong> per
                        side). Download a single JSON pack you can carry to any static deployment of this app, or import a pack someone sent you.
                    </p>
                    <p className="text-xs max-w-lg mx-auto leading-relaxed mb-4" style={{ color: muted }}>
                        In-setting, this is the{' '}
                        <Link to="/archive/nexus" className="font-bold hover:underline" style={{ color: isDark ? '#d8b4fe' : '#7c3aed' }}>
                            SOLAR Nexus
                        </Link>
                        {' '}archive — <strong style={{ color: ink }}>S</strong>ustainable <strong style={{ color: ink }}>O</strong>ff-grid{' '}
                        <strong style={{ color: ink }}>L</strong>iving-labs for <strong style={{ color: ink }}>A</strong>utonomy and{' '}
                        <strong style={{ color: ink }}>R</strong>esearch — tying every hub to one hostable layout.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold">
                        <Link to="/create-archive" className="inline-flex items-center gap-1 hover:underline" style={{ color: isDark ? '#67e8f9' : '#0284c7' }}>
                            Start an archive (browser save) <ArrowRight size={12} />
                        </Link>
                        <a
                            href="https://archive.solar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 opacity-90 hover:opacity-100"
                            style={{ color: isDark ? '#67e8f9' : '#0284c7' }}
                        >
                            Federation vision <ExternalLink size={12} />
                        </a>
                    </div>
                </motion.div>

                {/* Build / export */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl p-1 mb-10"
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
                        <h2 className="text-sm font-black uppercase tracking-[0.15em] mb-6 flex items-center gap-2" style={{ color: muted }}>
                            <Download size={16} /> Export pack
                        </h2>
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
                                className="rounded-2xl border-2 border-dashed py-12 md:py-16 px-6 text-center transition-all duration-300"
                                style={{
                                    borderColor: dragActive
                                        ? (isDark ? '#4fc3f7' : '#0284c7')
                                        : isDark ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.45)',
                                    background: dragActive
                                        ? (isDark ? 'rgba(79,195,247,0.08)' : 'rgba(2,132,199,0.06)')
                                        : isDark ? 'rgba(15,23,42,0.35)' : 'rgba(248,250,252,0.9)',
                                }}
                            >
                                <div
                                    className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                                    style={{
                                        background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.1)',
                                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}`,
                                    }}
                                >
                                    {phase === 'loading' ? (
                                        <Loader2 size={28} className="animate-spin" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }} />
                                    ) : (
                                        <ImagePlus size={28} style={{ color: isDark ? '#4fc3f7' : '#0284c7' }} />
                                    )}
                                </div>
                                <p className="font-black text-base mb-1" style={{ color: ink }}>
                                    {dragActive ? 'Release to set grid' : 'Drop cover image'}
                                </p>
                                <p className="text-sm" style={{ color: muted }}>or click to choose — dimensions set grid width × height</p>
                                <span
                                    className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mt-4"
                                    style={{
                                        background: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)',
                                        color: isDark ? '#c4b5fd' : '#6d28d9',
                                    }}
                                >
                                    <Grid3x3 size={13} /> {effectiveW && effectiveH ? `${effectiveW} × ${effectiveH}` : 'pixels → cells'}
                                </span>
                            </div>
                        </label>

                        <AnimatePresence>
                            {previewUrl && rawDims && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-6 grid md:grid-cols-[minmax(0,200px)_1fr] gap-5 items-start"
                                >
                                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.08)' }}>
                                        <img src={previewUrl} alt="" className="w-full h-auto max-h-44 object-cover object-center" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        <span className="font-mono font-bold tabular-nums px-3 py-2 rounded-lg" style={{ background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.08)', color: ink }}>
                                            {rawDims.w} × {rawDims.h}
                                        </span>
                                        {wasClamped && (
                                            <span className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)', color: isDark ? '#fcd34d' : '#b45309' }}>
                                                Clamped to {GRID_SIDE_MAX}px per side
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className="rounded-3xl p-6 md:p-8 mb-10 space-y-5"
                    style={{
                        background: isDark ? 'rgba(7,16,36,0.75)' : 'rgba(255,255,255,0.85)',
                        border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)'}`,
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Layers size={18} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                        <h2 className="text-sm font-black uppercase tracking-[0.15em]" style={{ color: muted }}>Metadata in the pack</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold block mb-1.5 flex items-center gap-2" style={{ color: muted }}>
                                <MapPin size={14} aria-hidden /> Hub route
                            </label>
                            <select
                                value={hubPlanetId}
                                onChange={(e) => setHubPlanetId(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            >
                                {ARCHIVE_HUB_LOCATIONS.map((h) => (
                                    <option key={h.id} value={h.id}>{h.label} — {h.subtitle}</option>
                                ))}
                            </select>
                            <p className="text-[11px] mt-1.5" style={{ color: muted }}>Visitors open <span className="font-mono">/#/archive/{hubMeta?.id || 'earth'}</span> after import.</p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold block mb-1.5" style={{ color: muted }}>Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Archive name"
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
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
                                placeholder="file name prefix"
                                className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none"
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
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
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
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                                style={{
                                    background: isDark ? 'rgba(2,6,23,0.6)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.9)'}`,
                                    color: ink,
                                }}
                            />
                        </div>
                    </div>

                    {err && (
                        <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                            <AlertCircle size={18} className="shrink-0" /> {err}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <motion.button
                            type="button"
                            whileHover={{ scale: buildDisabled ? 1 : 1.01 }}
                            whileTap={{ scale: buildDisabled ? 1 : 0.98 }}
                            disabled={buildDisabled}
                            onClick={handleDownloadPack}
                            className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.1em] text-white disabled:opacity-40 flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                                boxShadow: '0 12px 36px rgba(124,58,237,0.3)',
                            }}
                        >
                            <Package size={18} /> Download JSON pack
                        </motion.button>
                        <motion.button
                            type="button"
                            whileHover={{ scale: buildDisabled ? 1 : 1.01 }}
                            whileTap={{ scale: buildDisabled ? 1 : 0.98 }}
                            disabled={buildDisabled}
                            onClick={handleApplyPackLocally}
                            className="flex-1 py-3.5 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2"
                            style={{
                                borderColor: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(15,23,42,0.15)',
                                color: ink,
                                background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.9)',
                            }}
                        >
                            Apply here &amp; open <ArrowRight size={16} />
                        </motion.button>
                    </div>
                </motion.div>

                {/* Import */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-3xl p-6 md:p-8 mb-10"
                    style={{
                        background: isDark ? 'rgba(4,10,24,0.55)' : 'rgba(248,250,252,0.92)',
                        border: `1px solid ${isDark ? 'rgba(148,163,184,0.1)' : 'rgba(15,23,42,0.06)'}`,
                    }}
                >
                    <h2 className="text-sm font-black uppercase tracking-[0.15em] mb-4 flex items-center gap-2" style={{ color: muted }}>
                        <Upload size={16} /> Import pack
                    </h2>
                    <p className="text-sm mb-4" style={{ color: muted }}>
                        Choose a <span className="font-mono">*-pack.json</span> file exported from this page. Grid dimensions and cover are written to this browser&apos;s storage for the hub encoded in the file.
                    </p>
                    <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl cursor-pointer text-sm font-bold text-white"
                        style={{ background: isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.9)' }}>
                        <input
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            disabled={importBusy}
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) onImportFile(f)
                                e.target.value = ''
                            }}
                        />
                        {importBusy ? <><Loader2 size={18} className="animate-spin" /> Reading…</> : <>Select pack file</>}
                    </label>
                    {importErr && (
                        <p className="mt-3 text-sm flex items-center gap-2" style={{ color: '#f87171' }}><AlertCircle size={16} />{importErr}</p>
                    )}
                    {importDoneHub && !importErr && (
                        <p className="mt-4 text-sm" style={{ color: ink }}>
                            Imported.{' '}
                            <Link
                                to={`/archive/${importDoneHub}`}
                                className="font-bold underline"
                                style={{ color: isDark ? '#7dd3fc' : '#0284c7' }}
                            >
                                Open archive for {importDoneHub}
                            </Link>
                        </p>
                    )}
                </motion.div>

                {/* Hosting */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-3xl p-6 md:p-8 flex gap-4"
                    style={{
                        background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.7)',
                        border: `1px solid ${isDark ? 'rgba(71,85,105,0.25)' : 'rgba(226,232,240,1)'}`,
                    }}
                >
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.12)' }}>
                        <Server size={22} style={{ color: isDark ? '#34d399' : '#059669' }} />
                    </div>
                    <div className="text-sm space-y-2" style={{ color: muted }}>
                        <h3 className="font-black uppercase tracking-wider text-xs" style={{ color: ink }}>Self-hosting</h3>
                        <p>Build this site (for example <span className="font-mono">npm run build</span>) and upload the <span className="font-mono">dist</span> folder to any static host. Routes use hash mode, so deep links look like <span className="font-mono">yoursite.com/#/host-archive</span>.</p>
                        <p>On your deployment, open Host archive, import the JSON pack once per browser (data lives in <span className="font-mono">localStorage</span>). For a shared default for all visitors you would need a small server or baked-in config—that&apos;s outside this demo.</p>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
