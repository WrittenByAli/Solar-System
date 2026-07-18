import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, PenLine,
    Trash2, ExternalLink, AlertTriangle, Layers, Upload,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import { themeText } from '../utils/themeText.js'
import { useAuth } from '../context/AuthContext.jsx'
import FogPageShell, { useSceneReveal } from '../components/FogPageShell.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { REVIEWERS_REQUIRED } from '../constants/reviewWorkflow.js'
import fallbackData from '../data/researchData.json'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData
const planetTitleById = Object.fromEntries(
    researchData.planets.map((p) => [String(p.id).toLowerCase(), p.planet]),
)

function getStatusMeta(isDark) {
    if (isDark) {
        return {
            approved: { label: 'Approved', icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
            pending: { label: 'Pending review', icon: Clock, color: '#4fc3f7', bg: 'rgba(79,195,247,0.12)', border: 'rgba(79,195,247,0.3)' },
            rejected: { label: 'Rejected', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
            draft: { label: 'Draft', icon: PenLine, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
        }
    }
    return {
        approved: { label: 'Approved', icon: CheckCircle, color: '#0369a1', bg: 'rgba(3,105,161,0.12)', border: 'rgba(3,105,161,0.28)' },
        pending: { label: 'Pending review', icon: Clock, color: '#0284c7', bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.28)' },
        rejected: { label: 'Rejected', icon: XCircle, color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.28)' },
        draft: { label: 'Draft', icon: PenLine, color: '#6d28d9', bg: 'rgba(109,40,217,0.1)', border: 'rgba(109,40,217,0.25)' },
    }
}

function coordLabel(e) {
    const x = String(e.coord_x ?? '').padStart(3, '0')
    const y = String(e.coord_y ?? '').padStart(3, '0')
    return `${x}, ${y}`
}

function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, isDark, danger = true }) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/50"
                        onClick={onCancel}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        className="fixed z-[101] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm rounded-2xl p-5 sa-glass-surface"
                        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: danger ? '#f87171' : '#f5a623' }} />
                            <div>
                                <h3 id="confirm-dialog-title" className="font-bold text-sm mb-1" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{title}</h3>
                                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>{message}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={onCancel}
                                className="px-4 py-2 rounded-xl text-xs font-bold"
                                style={{ color: isDark ? '#94a3b8' : '#475569', background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.12)' }}>
                                Cancel
                            </button>
                            <button type="button" onClick={onConfirm}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                                style={{ background: danger ? '#dc2626' : 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}>
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default function MySubmissions() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const sceneReveal = useSceneReveal()
    const { profile } = useAuth()

    const [rows, setRows] = useState([])
    const [reviewsByEntry, setReviewsByEntry] = useState({})
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [tick, setTick] = useState(0)
    const [pendingDelete, setPendingDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const { ink, muted } = themeText(isDark)
    const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
    const strong = ink
    const statusMeta = useMemo(() => getStatusMeta(isDark), [isDark])

    useEffect(() => {
        if (!profile?.id) { setLoading(false); return }
        let active = true
        setLoading(true)
        async function load() {
            const { data: entries } = await supabase
                .from('archive_entries')
                .select('*')
                .eq('submitted_by', profile.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(200)
            if (!active) return
            const list = entries || []
            setRows(list)

            const rejectedOrPendingIds = list.filter((e) => !e.is_draft).map((e) => e.id)
            if (rejectedOrPendingIds.length) {
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('id, entry_id, reviewer_id, fact_check_pass, difficulty, notes, created_at')
                    .in('entry_id', rejectedOrPendingIds)
                if (active && reviews) {
                    const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))]
                    const { data: reviewers } = reviewerIds.length
                        ? await supabase.from('public_profiles').select('id, username').in('id', reviewerIds)
                        : { data: [] }
                    const nameMap = Object.fromEntries((reviewers || []).map((p) => [p.id, p.username]))
                    const byEntry = {}
                    reviews.forEach((r) => {
                        if (!byEntry[r.entry_id]) byEntry[r.entry_id] = []
                        byEntry[r.entry_id].push({ ...r, reviewerUsername: nameMap[r.reviewer_id] || 'unknown' })
                    })
                    setReviewsByEntry(byEntry)
                }
            } else {
                setReviewsByEntry({})
            }
            setLoading(false)
        }
        load()
        return () => { active = false }
    }, [profile?.id, tick])

    const requestDelete = useCallback((row) => {
        setPendingDelete(row)
    }, [])

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete) return
        setDeleting(true)
        await supabase.from('archive_entries').update({ deleted_at: new Date().toISOString() }).eq('id', pendingDelete.id)
        setDeleting(false)
        setPendingDelete(null)
        setTick((t) => t + 1)
    }, [pendingDelete])

    const statusFor = (row) => (row.is_draft ? 'draft' : row.status)

    const counts = useMemo(() => {
        const c = { draft: 0, pending: 0, approved: 0, rejected: 0 }
        rows.forEach((r) => { c[statusFor(r)] = (c[statusFor(r)] || 0) + 1 })
        return c
    }, [rows])

    return (
        <FogPageShell isDark={isDark} sceneReveal={sceneReveal}>
        <div className="solar-page">
            <div className="solar-page__inner solar-page__inner--md">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="solar-page__hero"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <FileText size={28} color={isDark ? '#4fc3f7' : '#0284c7'} />
                        <h1 className="font-solar text-3xl font-black" style={{ color: strong }}>
                            My Submissions
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: muted }}>
                        Review and manage your submitted research.
                    </p>
                    {!loading && rows.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                            {['draft', 'pending', 'approved', 'rejected'].map((key) => {
                                const meta = statusMeta[key]
                                if (!counts[key]) return null
                                return (
                                    <span key={key} className="text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                                        style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                                        <meta.icon size={12} />
                                        {counts[key]} {meta.label.toLowerCase()}
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </motion.div>

                {loading ? (
                    <div className="text-center py-16 text-sm" style={{ color: muted }}>Loading your submissions…</div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl text-sm flex flex-col items-center gap-4 sa-glass-surface"
                        style={{ color: muted }}>
                        <p>You haven't submitted anything yet.</p>
                        <Link to="/submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}>
                            <Upload size={14} /> Submit your first entry
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {rows.map((row) => {
                            const status = statusFor(row)
                            const meta = statusMeta[status]
                            const open = expandedId === row.id
                            const reviews = reviewsByEntry[row.id] || []
                            const canEdit = !row.is_draft && (row.status === 'pending' || row.status === 'rejected')
                            const canDelete = row.is_draft || row.status === 'pending' || row.status === 'rejected'
                            const planetLabel = planetTitleById[String(row.planet_id).toLowerCase()] || row.planet_id

                            return (
                                <motion.div key={row.id} layout className="rounded-2xl overflow-hidden sa-glass-surface">
                                    <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left"
                                        onClick={() => setExpandedId(open ? null : row.id)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm truncate" style={{ color: strong }}>
                                                    {row.title || 'Untitled draft'}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                                                    style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                                                    <meta.icon size={10} />
                                                    {meta.label}
                                                </span>
                                            </div>
                                            {row.updates_entry_id && (
                                                <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                                                    <Layers size={11} /> Deepens an existing entry
                                                </div>
                                            )}
                                            <div className="text-xs truncate flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5" style={{ color: muted }}>
                                                <span>{planetLabel} · slot ({coordLabel(row)}) · L{row.layer}</span>
                                                {!row.is_draft && row.status === 'pending' && (
                                                    <span>· {reviews.length}/{REVIEWERS_REQUIRED} reviews</span>
                                                )}
                                                <span>· {new Date(row.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {open ? <ChevronUp size={18} color={muted} /> : <ChevronDown size={18} color={muted} />}
                                    </button>

                                    <AnimatePresence>
                                        {open && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                className="border-t" style={{ borderColor: divider }}>
                                                <div className="p-4 flex flex-col gap-4">
                                                    {(row.short_summary || row.content) && (
                                                        <div className="text-xs leading-relaxed rounded-xl p-3"
                                                            style={{ background: isDark ? 'rgba(2,4,8,0.45)' : 'rgba(240,244,248,0.9)', color: isDark ? '#cbd5e1' : '#475569' }}>
                                                            {row.short_summary && <p className="font-semibold mb-1 text-[13px]" style={{ color: strong }}>Summary</p>}
                                                            {row.short_summary && <p className="mb-2">{row.short_summary}</p>}
                                                            {row.content && (
                                                                <>
                                                                    <p className="font-semibold mb-1 text-[13px]" style={{ color: strong }}>Detail</p>
                                                                    <p className="whitespace-pre-wrap">{row.content}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {(row.tags || []).length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.tags.map((tg) => (
                                                                <span key={tg} className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                                                    style={{ background: isDark ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.1)', color: isDark ? '#fbbf24' : '#b45309', border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : 'rgba(180,83,9,0.2)'}` }}>
                                                                    #{tg}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(row.attachments || []).length > 0 && (
                                                        <div className="text-xs" style={{ color: muted }}>
                                                            <span className="font-semibold" style={{ color: muted }}>
                                                                {row.attachments.length} attachment{row.attachments.length === 1 ? '' : 's'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {status === 'rejected' && reviews.length > 0 && (
                                                        <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(248,113,113,0.06)' : 'rgba(248,113,113,0.05)', border: `1px solid ${isDark ? 'rgba(248,113,113,0.2)' : 'rgba(248,113,113,0.18)'}` }}>
                                                            <p className="font-semibold text-[13px] mb-2" style={{ color: isDark ? '#fca5a5' : '#991b1b' }}>Reviewer feedback</p>
                                                            <div className="text-xs space-y-2" style={{ color: muted }}>
                                                                {reviews.map((r) => (
                                                                    <div key={r.id} className="pl-2 border-l-2 border-opacity-30" style={{ borderColor: isDark ? '#475569' : '#cbd5e1' }}>
                                                                        <span className="font-medium" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>@{r.reviewerUsername}</span>
                                                                        {' — '}fact-check {r.fact_check_pass ? 'pass' : 'fail'} · difficulty {r.difficulty}/5
                                                                        {r.notes?.trim() ? (
                                                                            <div className="mt-0.5 italic whitespace-pre-wrap" style={{ color: muted }}>
                                                                                "{r.notes.trim()}"
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {status === 'pending' && reviews.length > 0 && (
                                                        <div className="text-xs space-y-1" style={{ color: muted }}>
                                                            <span className="font-semibold" style={{ color: muted }}>Grades so far</span>
                                                            {reviews.map((r) => (
                                                                <div key={r.id} className="pl-2 border-l-2 border-opacity-30" style={{ borderColor: isDark ? '#475569' : '#cbd5e1' }}>
                                                                    fact-check {r.fact_check_pass ? 'pass' : 'fail'} · difficulty {r.difficulty}/5
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {row.is_draft && (
                                                            <Link to="/submit"
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white"
                                                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}>
                                                                <PenLine size={13} /> Continue draft
                                                            </Link>
                                                        )}
                                                        {canEdit && (
                                                            <Link to={`/submit?editEntryId=${row.id}`}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                                                                style={{ color: isDark ? '#4fc3f7' : '#0284c7', background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.08)', border: `1px solid ${isDark ? 'rgba(79,195,247,0.25)' : 'rgba(2,132,199,0.2)'}` }}>
                                                                <PenLine size={13} /> Edit &amp; resubmit
                                                            </Link>
                                                        )}
                                                        {status === 'approved' && (
                                                            <Link to={`/archive/${row.planet_id}`}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                                                                style={{
                                                                    color: isDark ? '#34d399' : '#0369a1',
                                                                    background: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(3,105,161,0.1)',
                                                                    border: `1px solid ${isDark ? 'rgba(52,211,153,0.25)' : 'rgba(3,105,161,0.28)'}`,
                                                                }}>
                                                                <ExternalLink size={13} /> View in archive
                                                            </Link>
                                                        )}
                                                        {canDelete && (
                                                            <button type="button" onClick={() => requestDelete(row)}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                                                                style={{
                                                                    color: isDark ? '#f87171' : '#dc2626',
                                                                    background: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(254,226,226,0.82)',
                                                                    border: `1px solid ${isDark ? 'rgba(248,113,113,0.25)' : 'rgba(220,38,38,0.42)'}`,
                                                                }}>
                                                                <Trash2 size={13} /> Delete
                                                            </button>
                                                        )}
                                                    </div>
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

            <ConfirmDialog
                open={!!pendingDelete}
                title={pendingDelete?.is_draft ? 'Discard this draft?' : 'Delete this submission?'}
                message={
                    pendingDelete?.is_draft
                        ? 'This draft will be permanently removed. This cannot be undone.'
                        : 'This submission will be removed from your list and the review queue. This cannot be undone.'
                }
                confirmLabel={deleting ? 'Deleting…' : 'Delete'}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
                isDark={isDark}
            />
        </div>
        </FogPageShell>
    )
}
