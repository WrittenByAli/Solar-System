import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import VantaFogBackground from '../components/solar-archive/VantaFogBackground.jsx'
import {
  ImagePlus,
  AlertCircle,
  ExternalLink,
  Package,
  Loader2,
  ArrowRight,
  Download,
  Upload,
  Server,
  Rocket,
  Check,
  Satellite,
  Grid3x3,
  Orbit,
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
  loadArchiveLibrary,
  loadArchiveRegistry,
} from '../utils/archiveInstanceStorage.js'
import {
  applyArchivePackToBrowser,
  buildArchivePack,
  downloadArchivePackFile,
  parseArchivePackJson,
} from '../utils/archivePack.js'
import { HUB_COLORS } from '../components/reviews/hubColors.js'

function formatBytes(n) {
  if (!n || n < 1024) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const mins = Math.floor((Date.now() - then) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function HostArchive() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion()
  const { username, profile } = useAuth()
  const navigate = useNavigate()

  const lastFileRef = useRef(null)
  const builderRef = useRef(null)
  const importRef = useRef(null)
  const fileInputRef = useRef(null)
  const importInputRef = useRef(null)

  const [sceneReveal, setSceneReveal] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [err, setErr] = useState('')
  const [hubPlanetId, setHubPlanetId] = useState('earth')
  const [rawDims, setRawDims] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [coverDataUrl, setCoverDataUrl] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [importDrag, setImportDrag] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('general')
  const [contactUrl, setContactUrl] = useState('')

  const [importErr, setImportErr] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importDoneHub, setImportDoneHub] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [deploying, setDeploying] = useState(false)
  const [library, setLibrary] = useState(() => loadArchiveLibrary(profile?.id || null))
  const [registryCount, setRegistryCount] = useState(() => loadArchiveRegistry().length)

  const hubMeta = useMemo(
    () => ARCHIVE_HUB_LOCATIONS.find((h) => h.id === hubPlanetId) || ARCHIVE_HUB_LOCATIONS.find((h) => h.id === 'earth'),
    [hubPlanetId],
  )

  useEffect(() => {
    const refresh = () => {
      setLibrary(loadArchiveLibrary(profile?.id || null))
      setRegistryCount(loadArchiveRegistry().length)
    }
    refresh()
    window.addEventListener('solar-archive-library-updated', refresh)
    window.addEventListener('solar-archive-registry-updated', refresh)
    return () => {
      window.removeEventListener('solar-archive-library-updated', refresh)
      window.removeEventListener('solar-archive-registry-updated', refresh)
    }
  }, [profile?.id])

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

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 900
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setSceneReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => () => {
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const effectiveW = rawDims ? clampGridSide(rawDims.w) : null
  const effectiveH = rawDims ? clampGridSide(rawDims.h) : null
  const wasClamped = rawDims && (effectiveW !== rawDims.w || effectiveH !== rawDims.h)
  const cellCount = effectiveW && effectiveH ? effectiveW * effectiveH : 0
  const packBytes = coverDataUrl ? Math.round(coverDataUrl.length * 0.75) : 0

  const coverReady = phase === 'ready'
  const metaReady = Boolean(title.trim() || slug.trim())
  const hubReady = Boolean(hubPlanetId)
  const jsonReady = coverReady && metaReady && hubReady
  const buildDisabled = !jsonReady

  const hostedCount = library.length || registryCount
  const hubsCount = ARCHIVE_HUB_LOCATIONS.length
  const deployCount = Math.max(library.length, registryCount)

  const refreshCoverThumbFromFile = useCallback(async () => {
    const file = lastFileRef.current
    if (!file) return { cover: coverDataUrl, thumb: '' }
    let cover = coverDataUrl
    let thumb = ''
    try {
      cover = await imageFileToCoverDataUrl(file, 960, 0.76)
    } catch { /* keep */ }
    try {
      thumb = await imageFileToCoverDataUrl(file, 280, 0.7)
    } catch { /* optional */ }
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
    rawDims, effectiveW, effectiveH, wasClamped, slug, title, username,
    hubPlanetId, category, contactUrl, refreshCoverThumbFromFile,
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
    setDeploying(true)
    try {
      const pack = await packFields()
      await applyArchivePackToBrowser(pack, { username: username || 'guest', userId: profile?.id || null })
      const hid = normalizeHubId(hubPlanetId)
      navigate(`/archive/${hid}`)
    } catch (e) {
      setErr(typeof e?.message === 'string' ? e.message : 'Could not apply pack.')
      setDeploying(false)
    }
  }

  const onImportFile = async (file) => {
    setImportErr('')
    setImportDoneHub(null)
    setImportPreview(null)
    if (!file) return
    setImportBusy(true)
    try {
      const text = await file.text()
      const pack = parseArchivePackJson(text)
      setImportPreview({
        title: pack.instanceTitle || pack.slug || 'Archive pack',
        hub: normalizeHubId(pack.hubPlanetId),
        w: pack.gridWidth,
        h: pack.gridHeight,
        pack,
      })
    } catch (e) {
      setImportErr(typeof e?.message === 'string' ? e.message : 'Import failed.')
    } finally {
      setImportBusy(false)
    }
  }

  const deployImport = async () => {
    if (!importPreview?.pack) return
    setImportBusy(true)
    setImportErr('')
    try {
      await applyArchivePackToBrowser(importPreview.pack, {
        username: username || 'guest',
        userId: profile?.id || null,
      })
      const hid = normalizeHubId(importPreview.hub)
      setImportDoneHub(hid)
      navigate(`/archive/${hid}`)
    } catch (e) {
      setImportErr(typeof e?.message === 'string' ? e.message : 'Deploy failed.')
    } finally {
      setImportBusy(false)
    }
  }

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const checklist = [
    { ok: coverReady, label: 'Cover Ready' },
    { ok: metaReady, label: 'Metadata Ready' },
    { ok: hubReady, label: 'Hub Selected' },
    { ok: jsonReady, label: 'JSON Valid' },
  ]

  return (
    <div className={`solar-page sa-host-page${isDark ? ' sa-host-page--dark' : ' sa-host-page--light'}`}>
      <VantaFogBackground
        isDark={isDark}
        entryReveal={sceneReveal}
        className="sa-host-page__vanta"
      />
      <div
        className="sa-host-page__veil"
        style={{ opacity: Math.max(0, (isDark ? 0.22 : 0.14) - sceneReveal * (isDark ? 0.12 : 0.08)) }}
        aria-hidden
      />
      <div
        className="sa-host-page__vignette"
        style={{ opacity: isDark ? 0.28 + sceneReveal * 0.05 : 0.16 + sceneReveal * 0.04 }}
        aria-hidden
      />

      <div className="sa-host-page__inner" style={{ opacity: sceneReveal }}>
        {/* ── Hero ── */}
        <motion.header
          className="host-hero"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="host-hero__title">Host Archive</h1>
          <p className="host-hero__sub">
            Create, import, and deploy portable archives across the SOLAR network.
          </p>
          <div className="host-hero__ctas">
            <button type="button" className="host-btn host-btn--primary" onClick={() => scrollTo(builderRef)}>
              <Satellite size={16} aria-hidden /> Configure
            </button>
            <button type="button" className="host-btn host-btn--ghost" onClick={() => scrollTo(importRef)}>
              <Upload size={16} aria-hidden /> Import Pack
            </button>
          </div>

          <div className="host-stats" aria-label="Deployment statistics">
            <div className="host-stat">
              <span className="host-stat__value">{hostedCount}</span>
              <span className="host-stat__label">Hosted Archives</span>
            </div>
            <div className="host-stat">
              <span className="host-stat__value">{hubsCount}</span>
              <span className="host-stat__label">Solar Hubs</span>
            </div>
            <div className="host-stat">
              <span className="host-stat__value">{deployCount}</span>
              <span className="host-stat__label">Deployments</span>
            </div>
          </div>
        </motion.header>

        {/* ── Builder + Preview ── */}
        <div className="host-deck" ref={builderRef}>
          <section className="host-panel host-builder">
            <header className="host-panel__head">
              <span className="host-panel__kicker">Deployment Builder</span>
              <h2 className="host-panel__title">Configuration</h2>
            </header>

            {/* Step 1 — Docking upload */}
            <div className="host-step">
              <span className="host-step__num">01</span>
              <div className="host-step__body">
                <h3 className="host-step__label">Cover Image</h3>
                <label
                  className={`host-dock${dragActive ? ' host-dock--active' : ''}${phase === 'idle' ? ' host-dock--pulse' : ''}`}
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) applyImageFile(f)
                      e.target.value = ''
                    }}
                  />
                  <div className="host-dock__icon" aria-hidden>
                    {phase === 'loading' ? (
                      <Loader2 size={28} className="host-spin" />
                    ) : (
                      <Satellite size={28} />
                    )}
                  </div>
                  <p className="host-dock__title">
                    {dragActive ? 'Release to dock' : phase === 'loading' ? 'Processing…' : 'Drop Image Here'}
                  </p>
                  <p className="host-dock__or">or</p>
                  <span className="host-dock__browse">Browse Files</span>
                  <div className="host-dock__specs">
                    <span>PNG</span><span>JPEG</span><span>{GRID_SIDE_MAX} × {GRID_SIDE_MAX} Max</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 2 — Metadata */}
            <div className="host-step">
              <span className="host-step__num">02</span>
              <div className="host-step__body">
                <h3 className="host-step__label">Metadata</h3>
                <div className="host-fields">
                  <div className="host-field">
                    <label htmlFor="host-title" className="host-field__label">Archive Title</label>
                    <input
                      id="host-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="host-field__input"
                    />
                  </div>
                  <div className="host-field">
                    <label htmlFor="host-slug" className="host-field__label">Archive Slug</label>
                    <input
                      id="host-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="host-field__input host-field__input--mono"
                    />
                  </div>
                  <div className="host-field">
                    <label htmlFor="host-category" className="host-field__label">Category</label>
                    <select
                      id="host-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="host-field__input host-field__input--select"
                    >
                      {REGISTRY_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="host-field">
                    <label htmlFor="host-contact" className="host-field__label">Contact URL</label>
                    <input
                      id="host-contact"
                      value={contactUrl}
                      onChange={(e) => setContactUrl(e.target.value)}
                      className="host-field__input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 — Hub cards */}
            <div className="host-step">
              <span className="host-step__num">03</span>
              <div className="host-step__body">
                <h3 className="host-step__label">Choose Hub</h3>
                <div className="host-hubs" role="radiogroup" aria-label="Target hub">
                  {ARCHIVE_HUB_LOCATIONS.map((h) => {
                    const selected = hubPlanetId === h.id
                    const color = HUB_COLORS[h.id] || '#f5a623'
                    return (
                      <button
                        key={h.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`host-hub${selected ? ' host-hub--sel' : ''}`}
                        style={{ '--hub-accent': color }}
                        onClick={() => setHubPlanetId(h.id)}
                      >
                        <span className="host-hub__glyph" aria-hidden><Orbit size={20} /></span>
                        <span className="host-hub__name">{h.label}</span>
                        <span className="host-hub__sub">{h.subtitle}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="host-hubs__hint">
                  Opens at <code>/#/archive/{hubMeta?.id || 'earth'}</code> after deploy
                </p>
              </div>
            </div>

            {err && (
              <div className="host-error" role="alert">
                <AlertCircle size={16} aria-hidden /> {err}
              </div>
            )}
          </section>

          {/* Right — Live console */}
          <aside className="host-panel host-console">
            <header className="host-panel__head">
              <span className="host-panel__kicker">Live Preview</span>
              <h2 className="host-panel__title">Preview</h2>
            </header>

            <div className="host-cover">
              <AnimatePresence mode="wait">
                {previewUrl ? (
                  <motion.img
                    key={previewUrl}
                    src={previewUrl}
                    alt="Cover preview"
                    className="host-cover__img"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                  />
                ) : (
                  <motion.div
                    key="empty"
                    className="host-cover__empty"
                    initial={false}
                    animate={{ opacity: 1 }}
                  >
                    <ImagePlus size={28} aria-hidden />
                    <span>Cover preview</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="host-telemetry">
              <div className="host-telem">
                <span className="host-telem__label">Grid Size</span>
                <span className="host-telem__value">
                  {effectiveW && effectiveH ? `${effectiveW} × ${effectiveH}` : '—'}
                </span>
              </div>
              <div className="host-telem">
                <span className="host-telem__label">Cells</span>
                <span className="host-telem__value">
                  {cellCount ? cellCount.toLocaleString() : '—'}
                </span>
              </div>
              <div className="host-telem">
                <span className="host-telem__label">Target</span>
                <span className="host-telem__value">{hubMeta?.label || '—'}</span>
              </div>
              <div className="host-telem">
                <span className="host-telem__label">Pack Size</span>
                <span className="host-telem__value">{formatBytes(packBytes)}</span>
              </div>
            </div>

            {wasClamped && (
              <p className="host-clamp">
                <Grid3x3 size={12} aria-hidden />
                Source {rawDims.w}×{rawDims.h}px clamped to {GRID_SIDE_MAX}px per side
              </p>
            )}

            <div className="host-checklist">
              <span className="host-checklist__title">Deployment Status</span>
              <ul>
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className={`host-check${item.ok ? ' host-check--ok' : ''}`}
                  >
                    <span className="host-check__icon" aria-hidden>
                      {item.ok ? <Check size={12} strokeWidth={3} /> : <span className="host-check__dot" />}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
              <p className={`host-checklist__verdict${jsonReady ? ' host-checklist__verdict--ready' : ''}`}>
                {jsonReady ? 'Ready to Deploy' : 'Awaiting configuration'}
              </p>
            </div>

            {/* Export action cards */}
            <div className="host-actions">
              <div className="host-action-card">
                <div className="host-action-card__icon" aria-hidden><Package size={22} /></div>
                <div className="host-action-card__body">
                  <h3>Export Pack</h3>
                  <p>Download a portable JSON archive.</p>
                </div>
                <motion.button
                  type="button"
                  className="host-btn host-btn--ghost host-btn--block"
                  disabled={buildDisabled}
                  onClick={handleDownloadPack}
                  whileHover={reduceMotion || buildDisabled ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion || buildDisabled ? undefined : { scale: 0.98 }}
                >
                  <Download size={15} aria-hidden /> Export
                </motion.button>
              </div>

              <div className="host-action-card host-action-card--deploy">
                <div className="host-action-card__icon" aria-hidden><Rocket size={22} /></div>
                <div className="host-action-card__body">
                  <h3>Deploy</h3>
                  <p>Save and open the archive.</p>
                </div>
                <motion.button
                  type="button"
                  className="host-btn host-btn--primary host-btn--block host-btn--launch"
                  disabled={buildDisabled || deploying}
                  onClick={handleApplyPackLocally}
                  whileHover={reduceMotion || buildDisabled ? undefined : { y: -1 }}
                  whileTap={reduceMotion || buildDisabled ? undefined : { scale: 0.98 }}
                >
                  {deploying ? (
                    <><Loader2 size={15} className="host-spin" aria-hidden /> Deploying…</>
                  ) : (
                    <><Rocket size={15} aria-hidden /> Deploy</>
                  )}
                </motion.button>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Import console ── */}
        <section className="host-panel host-import" ref={importRef}>
          <header className="host-panel__head">
            <span className="host-panel__kicker">Import</span>
            <h2 className="host-panel__title">Import Archive Pack</h2>
          </header>

          <div className="host-import__grid">
            <label
              className={`host-dock host-dock--import${importDrag ? ' host-dock--active' : ''}`}
              onDragEnter={(e) => { e.preventDefault(); setImportDrag(true) }}
              onDragLeave={(e) => { e.preventDefault(); setImportDrag(false) }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={(e) => {
                e.preventDefault()
                setImportDrag(false)
                const f = e.dataTransfer?.files?.[0]
                if (f) onImportFile(f)
              }}
            >
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={importBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImportFile(f)
                  e.target.value = ''
                }}
              />
              <div className="host-dock__icon" aria-hidden>
                {importBusy ? <Loader2 size={26} className="host-spin" /> : <Upload size={26} />}
              </div>
              <p className="host-dock__title">Drop archive-pack.json</p>
              <span className="host-dock__browse">Browse Pack</span>
              <div className="host-dock__specs">
                <span>SOLAR Archive</span>
                <span>Version 2</span>
              </div>
            </label>

            <div className="host-import__status">
              {importPreview ? (
                <>
                  <span className="host-import__badge">Archive Detected</span>
                  <h3 className="host-import__name">{importPreview.title}</h3>
                  <p className="host-import__meta">
                    {ARCHIVE_HUB_LOCATIONS.find((h) => h.id === importPreview.hub)?.label || importPreview.hub}
                    {' · '}
                    {importPreview.w}×{importPreview.h}
                  </p>
                  <p className="host-import__ready">Ready</p>
                  <button
                    type="button"
                    className="host-btn host-btn--primary"
                    disabled={importBusy}
                    onClick={deployImport}
                  >
                    {importBusy ? <Loader2 size={15} className="host-spin" /> : <Rocket size={15} />}
                    Deploy
                  </button>
                </>
              ) : (
                <>
                  <Orbit size={22} className="host-import__idle-icon" aria-hidden />
                  <p className="host-import__idle">No pack selected</p>
                  <p className="host-import__idle-sub">Select a compatible JSON archive pack.</p>
                </>
              )}
              {importErr && (
                <p className="host-error" style={{ marginTop: 12 }}>
                  <AlertCircle size={14} /> {importErr}
                </p>
              )}
              {importDoneHub && !importErr && (
                <p className="host-import__done">
                  Imported.{' '}
                  <Link to={`/archive/${importDoneHub}`}>Open {importDoneHub}</Link>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Hosted archives ── */}
        <section className="host-panel host-library">
          <header className="host-panel__head host-panel__head--row">
            <div>
              <span className="host-panel__kicker">Archives</span>
              <h2 className="host-panel__title">Hosted Archives</h2>
            </div>
            <Link to="/create-archive" className="host-library__link">
              Create Archive <ArrowRight size={13} />
            </Link>
          </header>

          {library.length === 0 ? (
            <div className="host-empty">
              <Rocket size={28} aria-hidden />
              <h3>No Hosted Archives</h3>
              <p>Create a deployment to add a research hub.</p>
              <button type="button" className="host-btn host-btn--primary" onClick={() => scrollTo(builderRef)}>
                Configure
              </button>
            </div>
          ) : (
            <ul className="host-fleet">
              {library.map((item) => {
                const hub = ARCHIVE_HUB_LOCATIONS.find((h) => h.id === item.hubPlanetId)
                const color = HUB_COLORS[item.hubPlanetId] || '#f5a623'
                return (
                  <li key={item.id || item.slug} className="host-fleet__card" style={{ '--hub-accent': color }}>
                    <div className="host-fleet__thumb">
                      {item.thumb ? (
                        <img src={item.thumb} alt="" />
                      ) : (
                        <span className="host-fleet__glyph" aria-hidden>
                          <Orbit size={18} aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="host-fleet__body">
                      <h3>{item.title || hub?.label || 'Untitled'}</h3>
                      <p>
                        {item.gridWidth}×{item.gridHeight}
                        {' · '}
                        {hub?.label || item.hubPlanetId}
                        {' · '}
                        {timeAgo(item.savedAt)}
                      </p>
                    </div>
                    <Link
                      to={`/archive/${normalizeHubId(item.hubPlanetId)}`}
                      className="host-btn host-btn--ghost host-btn--sm"
                    >
                      Open
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Self-host note ── */}
        <section className="host-panel host-selfhost">
          <Server size={18} className="host-selfhost__icon" aria-hidden />
          <div>
            <p className="host-selfhost__title">Self-hosting</p>
            <p>
              Build with <code>npm run build</code> and serve <code>dist</code>. Hash routes work on any static host —
              e.g. <code>yoursite.com/#/host-archive</code>. Packs live in browser storage after import.
            </p>
          </div>
          <a href="https://archive.solar" target="_blank" rel="noopener noreferrer" className="host-selfhost__link">
            Federation <ExternalLink size={12} />
          </a>
        </section>
      </div>
    </div>
  )
}
