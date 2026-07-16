import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ClipboardCheck, HelpCircle, Inbox, SearchX, FilterX, X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from '../App.jsx'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { useReviewQueueRealtime } from '../hooks/useReviewQueueRealtime.js'
import { POINTS_PER_REVIEW_COMPLETED } from '../constants/reviewWorkflow.js'
import { LAYER_SHORT_NAMES } from '../utils/archiveLayerSpecs.js'
import fallbackData from '../data/researchData.json'
import ReviewKeyboardHelp from '../components/reviews/queue/ReviewKeyboardHelp.jsx'
import { ReviewEntryPanel } from '../components/reviews/queue/ReviewEntryPanel.jsx'
import QueueRail, { QueueRailSkeleton } from '../components/review-queue/QueueRail.jsx'
import '../styles/solar-review-queue.css'

const STALE_MS = 48 * 60 * 60 * 1000
const DESKTOP_MQ = '(min-width: 1024px)'

const INTRO_LINES = [
  { text: 'Every pending entry', accent: false },
  { text: 'needs your grade.', accent: true },
]

const reveal = (reduce, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 44 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.45 },
  transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] },
})

function ScrollIntroSection({
  pendingCount, points, pointsPerReview, showCta, queueDisconnected,
}) {
  const reduce = useReducedMotion()

  return (
    <section className="rq-scroll-intro" data-testid="rq-intro">
      <div className="rq-scroll-intro__inner">
        <motion.p className="rq-scroll-intro__eyebrow" {...reveal(reduce, 0)}>
          Review queue
          {queueDisconnected && (
            <span
              data-testid="rq-live-reconnecting"
              style={{
                marginLeft: '0.6em',
                fontSize: '0.55em',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--rq-muted)',
                opacity: 0.85,
              }}
            >
              · Reconnecting live updates…
            </span>
          )}
        </motion.p>

        <div className="rq-scroll-intro__statement">
          {INTRO_LINES.map((line, i) => (
            <motion.p
              key={line.text}
              className={`rq-scroll-intro__line${line.accent ? ' rq-scroll-intro__line--accent' : ''}`}
              {...reveal(reduce, 0.08 + i * 0.12)}
            >
              {line.text}
            </motion.p>
          ))}
        </div>

        <motion.p className="rq-scroll-intro__lede" {...reveal(reduce, 0.34)}>
          Fact-check citations, rate difficulty, and confirm coordinate placement — three reviews before research joins the live archive.
        </motion.p>

        <motion.div
          className="rq-scroll-intro__stats"
          aria-label="Queue statistics"
          {...reveal(reduce, 0.48)}
        >
          <div className="rq-scroll-intro__stat">
            <span className="rq-scroll-intro__stat-value">
              {pendingCount == null ? '—' : pendingCount}
            </span>
            <span className="rq-scroll-intro__stat-label">Pending</span>
          </div>
          <div className="rq-scroll-intro__stat">
            <span className="rq-scroll-intro__stat-value">{points.toLocaleString()}</span>
            <span className="rq-scroll-intro__stat-label">Your points</span>
          </div>
          <div className="rq-scroll-intro__stat">
            <span className="rq-scroll-intro__stat-value">+{pointsPerReview}</span>
            <span className="rq-scroll-intro__stat-label">Per review</span>
          </div>
        </motion.div>

        {showCta && (
          <motion.div className="rq-scroll-intro__actions" {...reveal(reduce, 0.56)}>
            <a
              href="#sa-review-queue-workbench"
              className="rq-scroll-intro__cta"
              data-testid="rq-intro-cta"
              // In-page scroll only: a raw hash change would be swallowed by
              // HashRouter as an unknown route and redirect to home.
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('sa-review-queue-workbench')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
              }}
            >
              Start reviewing
            </a>
          </motion.div>
        )}
      </div>
    </section>
  )
}

const researchData = window.SOLAR_CONTENT_DATA || fallbackData
const planetTitleById = Object.fromEntries(
  researchData.planets.map((p) => [String(p.id).toLowerCase(), p.planet]),
)

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}

export default function GradeSubmissions() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion()
  const isDesktop = useDesktopLayout()
  const { profile, points, refreshProfile } = useAuth()
  const [sceneReveal, setSceneReveal] = useState(0)

  const [queue, setQueue] = useState([])
  const [reviewsByEntry, setReviewsByEntry] = useState({})
  const [usernamesById, setUsernamesById] = useState({})
  const [baseTitlesById, setBaseTitlesById] = useState({})
  const [loading, setLoading] = useState(true)
  const [listTick, setListTick] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [factOk, setFactOk] = useState(true)
  const [difficulty, setDifficulty] = useState(3)
  const [notes, setNotes] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [layerFilter, setLayerFilter] = useState('all')
  const [planetFilter, setPlanetFilter] = useState('all')
  const [sortMode, setSortMode] = useState('priority')
  const [selIdx, setSelIdx] = useState(-1)
  const [helpOpen, setHelpOpen] = useState(false)

  const myId = profile?.id || null
  // Only the very first load shows the full-page skeleton -- a live
  // update arriving later (another user's submission, another reviewer's
  // grade) must not yank the workbench back to a loading state out from
  // under whoever is mid-review.
  const hasLoadedOnceRef = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
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

  // Live refresh: Realtime (new submissions, incoming reviews) bumps
  // listTick, with a slow poll as a fallback safety net. See
  // useReviewQueueRealtime.js for why archive_entries INSERT/UPDATE and
  // reviews INSERT are the two signals that matter here.
  const queueConnectionState = useReviewQueueRealtime(!!myId, useCallback(() => setListTick((t) => t + 1), []))

  // A different account signing in within the same page life (rare, but
  // possible without a full remount) should see its own first-load
  // skeleton rather than silently reusing the previous account's.
  useEffect(() => {
    hasLoadedOnceRef.current = false
  }, [myId])

  useEffect(() => {
    if (!myId) { setLoading(false); return }
    let active = true
    if (!hasLoadedOnceRef.current) setLoading(true)

    async function load() {
      const { data: pending, error } = await supabase
        .from('archive_entries')
        .select('*')
        .eq('status', 'pending')
        .eq('is_draft', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (!active) return
      if (error || !Array.isArray(pending)) {
        setQueue([])
        setLoading(false)
        hasLoadedOnceRef.current = true
        return
      }

      const candidates = pending.filter((e) => e.submitted_by !== myId)
      const ids = candidates.map((e) => e.id)
      const { data: reviewRows } = ids.length
        ? await supabase.from('reviews').select('*').in('entry_id', ids)
        : { data: [] }
      const byEntry = {}
      ;(reviewRows || []).forEach((r) => {
        if (!byEntry[r.entry_id]) byEntry[r.entry_id] = []
        byEntry[r.entry_id].push(r)
      })

      const notYetReviewed = candidates.filter(
        (e) => !(byEntry[e.id] || []).some((r) => r.reviewer_id === myId),
      )

      const authorIds = [...new Set(notYetReviewed.map((e) => e.submitted_by).filter(Boolean))]
      const reviewerIds = [...new Set((reviewRows || []).map((r) => r.reviewer_id))]
      const allProfileIds = [...new Set([...authorIds, ...reviewerIds])]
      const { data: profiles } = allProfileIds.length
        ? await supabase.from('users_profile').select('id, username').in('id', allProfileIds)
        : { data: [] }
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.username]))

      const baseIds = [...new Set(notYetReviewed.map((e) => e.updates_entry_id).filter(Boolean))]
      const { data: bases } = baseIds.length
        ? await supabase.from('archive_entries').select('id, title, layer').in('id', baseIds)
        : { data: [] }
      const baseMap = Object.fromEntries((bases || []).map((b) => [b.id, b]))

      if (!active) return
      setQueue(notYetReviewed)
      setReviewsByEntry(byEntry)
      setUsernamesById(nameMap)
      setBaseTitlesById(baseMap)
      setLoading(false)
      hasLoadedOnceRef.current = true
    }
    load()
    return () => { active = false }
  }, [myId, listTick])

  useEffect(() => {
    if (!selectedId) return
    setFactOk(true)
    setDifficulty(3)
    setNotes('')
    setNotesOpen(false)
    setSubmitErr('')
  }, [selectedId])

  const submitReview = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selectedId || !myId) return
      setSubmitErr('')
      setSubmitting(true)
      try {
        const { error } = await supabase.from('reviews').insert({
          entry_id: selectedId,
          reviewer_id: myId,
          fact_check_pass: factOk,
          difficulty,
          notes: notes.slice(0, 1200),
        })
        if (error) {
          if (error.code === '23505') setSubmitErr('You already graded this entry.')
          else if (/cannot review own/i.test(error.message || '')) setSubmitErr('You cannot grade your own submission.')
          else setSubmitErr('Unable to save this grade.')
          return
        }
        await refreshProfile()
        setSelectedId(null)
        setListTick((t) => t + 1)
      } finally {
        setSubmitting(false)
      }
    },
    [selectedId, myId, factOk, difficulty, notes, refreshProfile],
  )

  const visibleQueue = useMemo(() => {
    const now = Date.now()
    const withMeta = queue
      .filter((e) => layerFilter === 'all' || String(e.layer) === layerFilter)
      .filter((e) => planetFilter === 'all' || String(e.planet_id).toLowerCase() === planetFilter)
      .map((e, i) => {
        const reviews = reviewsByEntry[e.id] || []
        const created = new Date(e.created_at).getTime() || 0
        const lastActivity = reviews.reduce(
          (max, r) => Math.max(max, new Date(r.created_at).getTime() || 0),
          created,
        )
        return {
          entry: e,
          order: i,
          isStale: now - lastActivity > STALE_MS,
          created,
          reviewCount: reviews.length,
        }
      })

    withMeta.sort((a, b) => {
      if (sortMode === 'newest') return b.created - a.created
      if (sortMode === 'oldest') return a.created - b.created
      if (sortMode === 'progress') return b.reviewCount - a.reviewCount || a.order - b.order
      return (b.isStale - a.isStale) || (a.order - b.order)
    })
    return withMeta
  }, [queue, reviewsByEntry, layerFilter, planetFilter, sortMode])

  const selectedItem = useMemo(
    () => visibleQueue.find((item) => item.entry.id === selectedId) || null,
    [visibleQueue, selectedId],
  )

  useEffect(() => {
    setSelIdx((i) => (visibleQueue.length === 0 ? -1 : Math.min(Math.max(i, -1), visibleQueue.length - 1)))
    if (selectedId && !visibleQueue.some((item) => item.entry.id === selectedId)) {
      setSelectedId(null)
    }
  }, [visibleQueue, selectedId])

  const selectEntry = useCallback((id, idx) => {
    setSelIdx(idx)
    setSelectedId(id)
  }, [])

  const closeDetail = useCallback(() => {
    setSelectedId(null)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t && typeof t.closest === 'function' && t.closest('input, textarea, select, [contenteditable="true"]')) return

      const move = (delta) => {
        if (visibleQueue.length === 0) return
        e.preventDefault()
        setSelIdx((i) => {
          const next = Math.min(visibleQueue.length - 1, Math.max(0, (i < 0 ? (delta > 0 ? -1 : 0) : i) + delta))
          const item = visibleQueue[next]
          if (item) setSelectedId(item.entry.id)
          return next
        })
      }

      if (e.key === 'j' || e.key === 'ArrowDown') move(1)
      else if (e.key === 'k' || e.key === 'ArrowUp') move(-1)
      else if (e.key === 'Escape') closeDetail()
      else if ((e.key === 'Enter' || e.key === 'o') && !(t && typeof t.closest === 'function' && t.closest('button, a'))) {
        const item = visibleQueue[selIdx]
        if (item) {
          e.preventDefault()
          selectEntry(item.entry.id, selIdx)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visibleQueue, selIdx, selectEntry, closeDetail])

  const hasQueue = !loading && queue.length > 0

  const detailProps = selectedItem
    ? {
        entry: selectedItem.entry,
        reviews: reviewsByEntry[selectedItem.entry.id] || [],
        usernamesById,
        baseEntry: selectedItem.entry.updates_entry_id
          ? baseTitlesById[selectedItem.entry.updates_entry_id]
          : null,
        planetTitle: planetTitleById[String(selectedItem.entry.planet_id).toLowerCase()]
          || selectedItem.entry.planet_id,
        isStale: selectedItem.isStale,
        factOk,
        setFactOk,
        difficulty,
        setDifficulty,
        notes,
        setNotes,
        notesOpen,
        setNotesOpen,
        submitErr,
        submitting,
        onSubmit: submitReview,
        reduceMotion,
      }
    : null

  return (
    <div
      className={`solar-page rq-page${isDark ? ' rq-page--dark' : ' rq-page--light'}`}
      data-testid="review-queue-page"
    >
      <LazyVantaFogBackground
        isDark={isDark}
        entryReveal={sceneReveal}
        className="rq-page__vanta"
      />
      <div
        className="rq-page__veil"
        style={{ opacity: Math.max(0, (isDark ? 0.16 : 0.1) - sceneReveal * (isDark ? 0.12 : 0.08)) }}
        aria-hidden="true"
      />
      <div
        className="rq-page__vignette"
        style={{ opacity: isDark ? 0.3 + sceneReveal * 0.05 : 0.18 + sceneReveal * 0.04 }}
        aria-hidden="true"
      />

      <div className="rq-page__inner rq-shell" style={{ opacity: sceneReveal }}>
        <ScrollIntroSection
          pendingCount={loading ? null : visibleQueue.length}
          points={points}
          pointsPerReview={POINTS_PER_REVIEW_COMPLETED}
          showCta={hasQueue}
          queueDisconnected={queueConnectionState === 'disconnected'}
        />

        <section
          id="sa-review-queue-workbench"
          className="rq-workbench-section"
          data-testid="rq-workbench-section"
        >
        {hasQueue && (
          <div className="rq-filters rq-desk-toolbar" data-testid="rq-toolbar">
            <label className="rq-pill rq-pill--planet">
              <span className="rq-pill__label">Planet</span>
              <select
                value={planetFilter}
                onChange={(e) => setPlanetFilter(e.target.value)}
                className={`rq-pill__select${planetFilter !== 'all' ? ' rq-pill__select--active' : ''}`}
                aria-label="Filter by planet"
              >
                <option value="all">All</option>
                {researchData.planets.map((p) => (
                  <option key={p.id} value={String(p.id).toLowerCase()}>{p.planet}</option>
                ))}
              </select>
            </label>

            <label className="rq-pill rq-pill--layer">
              <span className="rq-pill__label">Layer</span>
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                className={`rq-pill__select${layerFilter !== 'all' ? ' rq-pill__select--active' : ''}`}
                aria-label="Filter by layer"
              >
                <option value="all">All</option>
                {Object.entries(LAYER_SHORT_NAMES).map(([l, name]) => (
                  <option key={l} value={l}>L{l} · {name}</option>
                ))}
              </select>
            </label>

            <label className="rq-pill rq-pill--sort">
              <span className="rq-pill__label">Sort</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="rq-pill__select"
                aria-label="Sort queue"
              >
                <option value="priority">Priority (stale first)</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="progress">Most reviewed</option>
              </select>
            </label>

            <button
              type="button"
              className="rq-filters__help"
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="rq-workbench" role="status" aria-label="Loading pending submissions">
            <span className="sr-only">Loading…</span>
            <QueueRailSkeleton rows={5} />
            <div className="rq-detail-pane rq-detail-pane--skeleton" aria-hidden>
              <div className="rq-skeleton__bar" style={{ width: '40%', marginBottom: 16 }} />
              <div className="rq-skeleton__bar" style={{ width: '75%', height: 28, marginBottom: 20 }} />
              <div className="rq-skeleton__bar" style={{ width: '100%', height: 80 }} />
            </div>
          </div>
        ) : queue.length === 0 ? (
          <div className="rq-empty" data-testid="rq-empty">
            <div className="rq-empty__icon"><Inbox size={24} aria-hidden /></div>
            <p className="rq-empty__title">Queue Empty</p>
            <p className="rq-empty__sub">There are no pending submissions.</p>
            <Link to="/reviews" className="rq-empty__action">Review Standards</Link>
          </div>
        ) : visibleQueue.length === 0 ? (
          <div className="rq-empty" data-testid="rq-filter-empty">
            <div className="rq-empty__icon"><SearchX size={24} aria-hidden /></div>
            <p className="rq-empty__title">No matches</p>
            <button
              type="button"
              className="rq-empty__action"
              onClick={() => { setLayerFilter('all'); setPlanetFilter('all') }}
            >
              <FilterX size={13} aria-hidden /> Clear filters
            </button>
          </div>
        ) : (
          <div className={`rq-workbench${isDesktop ? '' : ' rq-workbench--mobile'}`} data-testid="rq-workbench">
            <QueueRail
              items={visibleQueue}
              selectedId={selectedId}
              reviewsByEntry={reviewsByEntry}
              usernamesById={usernamesById}
              planetTitleById={planetTitleById}
              onSelect={selectEntry}
            />

            {isDesktop && (
              <div className="rq-detail-pane">
                {detailProps ? (
                  <div className="rq-detail-pane__surface sa-frost-card">
                    <ReviewEntryPanel {...detailProps} />
                  </div>
                ) : (
                  <div className="rq-pane__placeholder sa-frost-card" data-testid="rq-detail-placeholder">
                    <ClipboardCheck size={28} aria-hidden />
                    <p>Select a submission to review</p>
                    <p className="rq-pane__placeholder-hint">
                      <span className="rq-kbd">J</span>
                      <span className="rq-kbd">K</span>
                      {' '}to move · Enter to open
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </section>

        <AnimatePresence>
          {!isDesktop && selectedItem && detailProps && (
            <motion.div
              className="rq-mobile-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Entry detail"
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rq-mobile-sheet__backdrop" onClick={closeDetail} aria-hidden />
              <div className="rq-mobile-sheet__panel">
                <header className="rq-mobile-sheet__head">
                  <button
                    type="button"
                    className="rq-mobile-sheet__close"
                    onClick={closeDetail}
                    aria-label="Close entry detail"
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="rq-mobile-sheet__body">
                  <ReviewEntryPanel {...detailProps} compact />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ReviewKeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </div>
  )
}
