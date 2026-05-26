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
import '../styles/solar-host.css'
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

    const muted = isDark ? '#ffffff' : '#000000'
    const ink = isDark ? '#ffffff' : '#000000'
    const codeColor = ink
    const accent = ink

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
        <div className="solar-page sa-host-page">
            {/* Background */}
            <div className="sa-host-bg" aria-hidden="true">
                <div className="sa-host-bg__grid" />
                <div className="sa-host-bg__stars" />
                <div className="sa-host-bg__glow" />
            </div>

            <div className="sa-host-shell">
                {/* ── Hero ── */}
                <motion.div
                    className="sa-host-hero"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="sa-host-hero__title">
                        Host a Living <span className="sa-host-hero__title--accent">Archive</span>
                    </h1>
                    <p className="sa-host-hero__sub">
                        Drop a picture: each pixel becomes one grid cell (capped at <strong style={{ color: ink }}>{GRID_SIDE_MAX}px</strong> per
                        side). Download a portable JSON pack or import one to deploy instantly.
                    </p>
                    <div className="sa-host-hero__links">
                        <Link to="/create-archive" className="sa-host-hero__link">
                            Start an archive (browser save) <ArrowRight size={12} />
                        </Link>
                        <a href="https://archive.solar" target="_blank" rel="noopener noreferrer" className="sa-host-hero__link">
                            Federation vision <ExternalLink size={12} />
                        </a>
                    </div>
                </motion.div>

                {/* ── Export / drop zone console ── */}
                <motion.section
                    className="sa-host-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
                    <div className="sa-host-panel__scan" />
                    <div className="sa-host-panel__header">
                        <Download size={14} /> Export pack
                    </div>

                    <label className="sa-host-dropzone">
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
                        <div className={`sa-host-dropzone__inner${dragActive ? ' sa-host-dropzone__inner--active' : ''}`}>
                            <div className="sa-host-dropzone__icon">
                                {phase === 'loading' ? (
                                    <Loader2 size={26} className="animate-spin" style={{ color: '#f5a623' }} />
                                ) : (
                                    <ImagePlus size={26} style={{ color: '#f5a623' }} />
                                )}
                            </div>
                            <p className="sa-host-dropzone__title">
                                {dragActive ? 'Release to set grid' : 'Drop cover image'}
                            </p>
                            <p className="sa-host-dropzone__sub">or click to choose — dimensions set grid width × height</p>
                            <div className="sa-host-dim-badge">
                                <Grid3x3 size={12} />
                                {effectiveW && effectiveH ? `${effectiveW} × ${effectiveH} cells` : 'pixels → cells'}
                            </div>
                        </div>
                    </label>

                    <AnimatePresence>
                        {previewUrl && rawDims && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="sa-host-preview"
                            >
                                <div className="sa-host-preview__img">
                                    <img src={previewUrl} alt="cover preview" />
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                                    <span className="sa-host-dim-tag">{rawDims.w} × {rawDims.h}px</span>
                                    {wasClamped && (
                                        <span className="sa-host-clamp-tag">Clamped to {GRID_SIDE_MAX}px per side</span>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                {/* ── Metadata form ── */}
                <motion.section
                    className="sa-host-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="sa-host-panel__header">
                        <Layers size={14} /> Metadata in the pack
                    </div>

                    <div className="sa-host-fields">
                        <div className="sa-host-fields--span2">
                            <label className="sa-host-label"><MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />Hub route</label>
                            <select
                                value={hubPlanetId}
                                onChange={(e) => setHubPlanetId(e.target.value)}
                                className="sa-host-select"
                            >
                                {ARCHIVE_HUB_LOCATIONS.map((h) => (
                                    <option key={h.id} value={h.id}>{h.label} — {h.subtitle}</option>
                                ))}
                            </select>
                            <p className="sa-host-field-hint">
                                Visitors open <code style={{ color: '#f5a623' }}>/#/archive/{hubMeta?.id || 'earth'}</code> after import.
                            </p>
                        </div>

                        <div className="sa-host-fields--span2">
                            <label className="sa-host-label">Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Archive name"
                                className="sa-host-input"
                            />
                        </div>

                        <div className="sa-host-fields--2col">
                            <div>
                                <label className="sa-host-label">Slug</label>
                                <input
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="file name prefix"
                                    className="sa-host-input sa-host-input--mono"
                                />
                            </div>
                            <div>
                                <label className="sa-host-label">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="sa-host-select"
                                >
                                    {REGISTRY_CATEGORIES.map((c) => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="sa-host-fields--span2">
                            <label className="sa-host-label">Site / contact (optional)</label>
                            <input
                                value={contactUrl}
                                onChange={(e) => setContactUrl(e.target.value)}
                                placeholder="https://…"
                                className="sa-host-input"
                            />
                        </div>
                    </div>

                    {err && (
                        <div className="sa-host-error" style={{ marginTop: 14 }}>
                            <AlertCircle size={17} style={{ flexShrink: 0 }} /> {err}
                        </div>
                    )}

                    <div className="sa-host-cta" style={{ marginTop: 20 }}>
                        <motion.button
                            type="button"
                            whileHover={{ scale: buildDisabled ? 1 : 1.015 }}
                            whileTap={{ scale: buildDisabled ? 1 : 0.975 }}
                            disabled={buildDisabled}
                            onClick={handleDownloadPack}
                            className="sa-host-btn-primary"
                        >
                            <Package size={17} /> Download JSON pack
                        </motion.button>
                        <motion.button
                            type="button"
                            whileHover={{ scale: buildDisabled ? 1 : 1.015 }}
                            whileTap={{ scale: buildDisabled ? 1 : 0.975 }}
                            disabled={buildDisabled}
                            onClick={handleApplyPackLocally}
                            className="sa-host-btn-secondary"
                        >
                            Apply here &amp; open <ArrowRight size={15} />
                        </motion.button>
                    </div>
                </motion.section>

                {/* ── Import pack ── */}
                <motion.section
                    className="sa-host-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="sa-host-panel__header">
                        <Upload size={14} /> Import pack
                    </div>
                    <p style={{ fontSize: 13, color: muted, marginBottom: 14, lineHeight: 1.6 }}>
                        Choose a <code style={{ color: codeColor, fontSize: 11 }}>*-pack.json</code> file exported from this page. Grid dimensions and cover are written to this browser&apos;s storage for the hub encoded in the file.
                    </p>
                    <label className="sa-host-import-btn">
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
                        {importBusy ? <><Loader2 size={16} className="animate-spin" /> Reading…</> : <>Select pack file</>}
                    </label>
                    {importErr && (
                        <p style={{ marginTop: 12, fontSize: 13, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={15} /> {importErr}
                        </p>
                    )}
                    {importDoneHub && !importErr && (
                        <p style={{ marginTop: 14, fontSize: 13, color: ink }}>
                            Imported.{' '}
                            <Link to={`/archive/${importDoneHub}`} style={{ color: accent, fontWeight: 700 }}>
                                Open archive for {importDoneHub}
                            </Link>
                        </p>
                    )}
                </motion.section>

                {/* ── Self-hosting info ── */}
                <motion.section
                    className="sa-host-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.26, duration: 0.5 }}
                    style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
                >
                    <div className="sa-host-info-icon">
                        <Server size={20} style={{ color: '#34d399' }} />
                    </div>
                    <div style={{ fontSize: 13, color: muted, lineHeight: 1.65 }}>
                        <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: codeColor, marginBottom: 8 }}>Self-hosting</p>
                        <p style={{ marginBottom: 8 }}>
                            Build this site (<code style={{ color: codeColor, fontSize: 11 }}>npm run build</code>) and upload the{' '}
                            <code style={{ color: codeColor, fontSize: 11 }}>dist</code> folder to any static host. Routes use hash mode, so deep links look like{' '}
                            <code style={{ color: codeColor, fontSize: 11 }}>yoursite.com/#/host-archive</code>.
                        </p>
                        <p>
                            On your deployment, open Host archive, import the JSON pack once per browser (data lives in{' '}
                            <code style={{ color: codeColor, fontSize: 11 }}>localStorage</code>). A shared default for all visitors would need a small server — outside this demo.
                        </p>
                    </div>
                </motion.section>
            </div>
        </div>
    )
}

