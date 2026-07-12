import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import {
    REVIEWERS_REQUIRED,
    REVIEW_RECOMMENDATION_MAX_CHARS,
    POINTS_PER_REVIEW_COMPLETED,
} from '../constants/reviewWorkflow.js'
import fallbackData from '../data/researchData.json'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData
const planetTitleById = Object.fromEntries(
    researchData.planets.map((p) => [String(p.id).toLowerCase(), p.planet]),
)

function coordSlotLabel(e) {
    const x = String(e.coord_x ?? '').padStart(3, '0')
    const y = String(e.coord_y ?? '').padStart(3, '0')
    return `${x}, ${y}`
}

export default function GradeSubmissions() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const {
        profile,
        points,
        refreshProfile,
    } = useAuth()

    const [queue, setQueue] = useState([])
    const [reviewsByEntry, setReviewsByEntry] = useState({})
    const [usernamesById, setUsernamesById] = useState({})
    const [baseTitlesById, setBaseTitlesById] = useState({})
    const [loading, setLoading] = useState(true)
    const [listTick, setListTick] = useState(0)
    const [expandedId, setExpandedId] = useState(null)
    const [factOk, setFactOk] = useState(true)
    const [difficulty, setDifficulty] = useState(3)
    const [notes, setNotes] = useState('')
    const [submitErr, setSubmitErr] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const myId = profile?.id || null

    useEffect(() => {
        if (!myId) { setLoading(false); return }
        let active = true
        setLoading(true)

        async function load() {
            const { data: pending, error } = await supabase
                .from('archive_entries')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
            if (!active) return
            if (error || !Array.isArray(pending)) { setQueue([]); setLoading(false); return }

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

            // Exclude entries this reviewer has already graded
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
        }
        load()
        return () => { active = false }
    }, [myId, listTick])

    useEffect(() => {
        if (!expandedId) return
        setFactOk(true)
        setDifficulty(3)
        setNotes('')
        setSubmitErr('')
    }, [expandedId])

    const submitReview = useCallback(
        async (e) => {
            e.preventDefault()
            if (!expandedId || !myId) return
            setSubmitErr('')
            setSubmitting(true)
            try {
                const { error } = await supabase.from('reviews').insert({
                    entry_id: expandedId,
                    reviewer_id: myId,
                    fact_check_pass: factOk,
                    difficulty,
                    notes: notes.slice(0, REVIEW_RECOMMENDATION_MAX_CHARS),
                })
                if (error) {
                    if (error.code === '23505') setSubmitErr('You already graded this entry.')
                    else if (/cannot review own/i.test(error.message || '')) setSubmitErr('You cannot grade your own submission.')
                    else setSubmitErr('Unable to save this grade.')
                    return
                }
                await refreshProfile()
                setExpandedId(null)
                setListTick((t) => t + 1)
            } finally {
                setSubmitting(false)
            }
        },
        [expandedId, myId, factOk, difficulty, notes, refreshProfile],
    )

    const cardBg = isDark ? 'rgba(7,20,40,0.85)' : 'rgba(255,255,255,0.92)'
    const border = isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)'
    const muted = isDark ? '#64748b' : '#94a3b8'

    // No in-component auth/role gate here — the /review-queue route is
    // wrapped in RequireReviewer (App.jsx), which handles signed-out,
    // guest, and non-reviewer cases before this component ever mounts,
    // matching how every other member-gated page in this app relies
    // solely on its route guard (see Reviews.jsx).

    return (
        <div className="solar-page">
            <div className="solar-page__inner solar-page__inner--md">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="solar-page__hero"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ClipboardCheck size={28} color={isDark ? '#4fc3f7' : '#0284c7'} />
                        <h1 className="font-solar text-3xl font-black" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                            Grade submissions
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: muted }}>
                        Fact-check and rate comprehension difficulty. Entries join the live archive only after{' '}
                        <strong>{REVIEWERS_REQUIRED}</strong> independent reviewers all pass fact-check. Each grade earns{' '}
                        <strong>{POINTS_PER_REVIEW_COMPLETED}</strong> pts.
                    </p>
                    <p className="text-xs mt-2" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>
                        {points.toLocaleString()} pts
                    </p>
                </motion.div>

                {loading ? (
                    <div className="text-center py-16 text-sm" style={{ color: muted }}>Loading pending submissions…</div>
                ) : queue.length === 0 ? (
                    <div
                        className="text-center py-16 rounded-2xl text-sm"
                        style={{ background: cardBg, border: `1px solid ${border}`, color: muted }}
                    >
                        No pending submissions right now. Check back after contributors submit new entries.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {queue.map((s) => {
                            const open = expandedId === s.id
                            const reviews = reviewsByEntry[s.id] || []
                            const n = reviews.length
                            const authorName = usernamesById[s.submitted_by] || 'unknown'
                            const baseEntry = s.updates_entry_id ? baseTitlesById[s.updates_entry_id] : null
                            return (
                                <motion.div
                                    key={s.id}
                                    layout
                                    className="rounded-2xl overflow-hidden"
                                    style={{ background: cardBg, border: `1px solid ${border}` }}
                                >
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                                        onClick={() => setExpandedId(open ? null : s.id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                                {s.title || 'Untitled'}
                                            </div>
                                            {baseEntry && (
                                                <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                                                    <Layers size={11} />
                                                    Adds L{s.layer} depth to <strong>{baseEntry.title}</strong> (currently L{baseEntry.layer})
                                                </div>
                                            )}
                                            <div className="text-xs truncate flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: muted }}>
                                                <span>{planetTitleById[String(s.planet_id).toLowerCase()] || s.planet_id} · slot ({coordSlotLabel(s)}) ·</span>
                                                <span>L{s.layer} · author @{authorName}</span>
                                                <span>· {n}/{REVIEWERS_REQUIRED} reviews</span>
                                            </div>
                                            {(s.tags || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {(s.tags || []).map((tg) => (
                                                        <span
                                                            key={tg}
                                                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                                            style={{
                                                                background: isDark ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.1)',
                                                                color: isDark ? '#fbbf24' : '#b45309',
                                                                border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : 'rgba(180,83,9,0.2)'}`,
                                                            }}
                                                        >
                                                            #{tg}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {open ? <ChevronUp size={18} color={muted} /> : <ChevronDown size={18} color={muted} />}
                                    </button>
                                    <AnimatePresence>
                                        {open && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t"
                                                style={{ borderColor: border }}
                                            >
                                                <div className="p-4 flex flex-col gap-4">
                                                    {(s.short_summary || s.content) && (
                                                        <div className="text-xs leading-relaxed rounded-xl p-3" style={{ background: isDark ? 'rgba(2,4,8,0.45)' : 'rgba(240,244,248,0.9)', color: isDark ? '#cbd5e1' : '#475569' }}>
                                                            {s.short_summary && <p className="font-semibold mb-1 text-[13px]" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Summary</p>}
                                                            {s.short_summary && <p className="mb-2">{s.short_summary}</p>}
                                                            {s.content && (
                                                                <>
                                                                    <p className="font-semibold mb-1 text-[13px]" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Detail</p>
                                                                    <p className="whitespace-pre-wrap">{s.content}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 text-xs" style={{ color: muted }}>
                                                        <span className="px-2 py-1 rounded-lg" style={{ background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.08)' }}>
                                                            Author difficulty (claimed): {s.difficulty ?? '—'}/5
                                                        </span>
                                                    </div>
                                                    {n > 0 && (
                                                        <div className="text-xs space-y-1" style={{ color: muted }}>
                                                            <span className="font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Prior grades</span>
                                                            {reviews.map((r) => (
                                                                <div key={r.id} className="pl-2 border-l-2 border-opacity-30" style={{ borderColor: isDark ? '#475569' : '#cbd5e1' }}>
                                                                    <span className="font-medium" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                                                                        @{usernamesById[r.reviewer_id] || 'unknown'}
                                                                    </span>
                                                                    : fact-check {r.fact_check_pass ? 'pass' : 'fail'} · difficulty {r.difficulty}/5
                                                                    {r.notes?.trim() ? (
                                                                        <div className="mt-0.5 italic whitespace-pre-wrap" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                                                            "{r.notes.trim()}"
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <form onSubmit={submitReview} className="flex flex-col gap-3">
                                                        <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={factOk}
                                                                onChange={(ev) => setFactOk(ev.target.checked)}
                                                                className="mt-1 rounded"
                                                            />
                                                            <span className="flex items-start gap-2">
                                                                <ShieldCheck size={16} className="shrink-0 mt-0.5" style={{ color: '#34d399' }} />
                                                                This entry appears factually consistent and suitable for the archive (fact-check pass).
                                                            </span>
                                                        </label>
                                                        <div>
                                                            <label className="text-xs font-semibold block mb-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                                                Your difficulty rating (1–5)
                                                            </label>
                                                            <input
                                                                type="range"
                                                                min={1}
                                                                max={5}
                                                                value={difficulty}
                                                                onChange={(ev) => setDifficulty(Number(ev.target.value))}
                                                                className="w-full"
                                                            />
                                                            <div className="text-xs mt-1 tabular-nums" style={{ color: muted }}>
                                                                Selected: {difficulty}/5
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold block mb-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                                                Recommendations for the submitter (optional)
                                                            </label>
                                                            <textarea
                                                                value={notes}
                                                                onChange={(ev) => setNotes(ev.target.value)}
                                                                rows={4}
                                                                maxLength={REVIEW_RECOMMENDATION_MAX_CHARS}
                                                                className="w-full text-sm rounded-xl px-3 py-2 resize-none"
                                                                style={{
                                                                    background: isDark ? 'rgba(2,4,8,0.5)' : 'rgba(255,255,255,0.9)',
                                                                    border: `1px solid ${border}`,
                                                                    color: isDark ? '#f8fafc' : '#0f172a',
                                                                }}
                                                                placeholder="Suggest citations, clarity edits, or factual fixes — the author sees this with your grade."
                                                            />
                                                            <div className="text-[10px] mt-1 tabular-nums" style={{ color: muted }}>
                                                                {notes.length}/{REVIEW_RECOMMENDATION_MAX_CHARS}
                                                            </div>
                                                        </div>
                                                        {submitErr && (
                                                            <div className="flex items-center gap-2 text-xs" style={{ color: '#f87171' }}>
                                                                <AlertTriangle size={14} /> {submitErr}
                                                            </div>
                                                        )}
                                                        <motion.button
                                                            type="submit"
                                                            disabled={submitting}
                                                            whileHover={{ scale: submitting ? 1 : 1.02 }}
                                                            whileTap={{ scale: submitting ? 1 : 0.98 }}
                                                            className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                                                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                                                        >
                                                            {submitting ? 'Saving…' : 'Submit grade'}
                                                        </motion.button>
                                                    </form>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
