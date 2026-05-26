import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
    MIN_POINTS_REVIEWER_ACCESS,
    REVIEWERS_REQUIRED,
    REVIEW_RECOMMENDATION_MAX_CHARS,
    POINTS_PER_REVIEW_COMPLETED,
} from '../constants/reviewWorkflow.js'
import {
    addReviewToSubmission,
    getPendingSubmissions,
    migrateSubmission,
} from '../utils/submissionStorage.js'
import {
    incrementReviewerStats,
    rewardAuthorOnApproval,
} from '../utils/userProfileStorage.js'
import FoundationLogo from '../components/FoundationLogo.jsx'
import FieldHonorTokens from '../components/FieldHonorTokens.jsx'
import fallbackData from '../data/researchData.json'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData
const planetTitleById = Object.fromEntries(
    researchData.planets.map((p) => [String(p.id).toLowerCase(), p.planet]),
)

function coordSlotLabel(e) {
    const x = String(e.coordX || '').padStart(3, '0')
    const y = String(e.coordY || '').padStart(3, '0')
    return `${x}, ${y}`
}

export default function GradeSubmissions() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const {
        isLoggedIn,
        username,
        points,
        canAccessReviewerQueue,
        refreshProfile,
    } = useAuth()

    const [listTick, setListTick] = useState(0)
    const [expandedId, setExpandedId] = useState(null)
    const [factOk, setFactOk] = useState(true)
    const [difficulty, setDifficulty] = useState(3)
    const [notes, setNotes] = useState('')
    const [submitErr, setSubmitErr] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const bump = () => setListTick((t) => t + 1)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => window.removeEventListener('solar-archive-submissions-updated', bump)
    }, [])

    const queue = useMemo(() => {
        return getPendingSubmissions()
            .map(migrateSubmission)
            .filter((s) => s.authorUsername !== username)
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    }, [listTick, username])

    useEffect(() => {
        if (!expandedId) return
        setFactOk(true)
        setDifficulty(3)
        setNotes('')
        setSubmitErr('')
    }, [expandedId])

    const submitReview = useCallback(
        (e) => {
            e.preventDefault()
            if (!expandedId || !username) return
            setSubmitErr('')
            setSubmitting(true)
            try {
                const sub = queue.find((x) => x.id === expandedId)
                const res = addReviewToSubmission(expandedId, {
                    reviewerUsername: username,
                    factCheckPass: factOk,
                    difficulty,
                    notes,
                })
                if (!res.ok) {
                    if (res.error === 'already_reviewed') setSubmitErr('You already graded this entry.')
                    else if (res.error === 'cannot_review_own') setSubmitErr('You cannot grade your own submission.')
                    else setSubmitErr('Unable to save this grade.')
                    setSubmitting(false)
                    return
                }
                incrementReviewerStats(username, res.submission?.planet || sub?.planet, factOk)
                if (res.submission?.status === 'approved') {
                    rewardAuthorOnApproval(res.submission.authorUsername, res.submission.planet)
                }
                refreshProfile(username)
                setExpandedId(null)
            } finally {
                setSubmitting(false)
            }
        },
        [expandedId, username, factOk, difficulty, notes, refreshProfile, queue],
    )

    const cardBg = isDark ? 'rgba(7,20,40,0.85)' : 'rgba(255,255,255,0.92)'
    const border = isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)'
    const muted = isDark ? '#64748b' : '#94a3b8'

    if (!isLoggedIn) {
        return (
            <div className="solar-page solar-page--center">
                <div className="solar-page__inner max-w-lg mx-auto text-center w-full">
                <ClipboardCheck size={40} color={isDark ? '#4fc3f7' : '#0284c7'} className="mb-4" />
                <h1 className="font-solar text-2xl font-black mb-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Sign in to review
                </h1>
                <p className="text-sm mb-6" style={{ color: muted }}>
                    Archive reviewers sign in with a username so grades are attributed correctly.
                </p>
                <Link
                    to="/join"
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                >
                    Go to Join / Login
                </Link>
                </div>
            </div>
        )
    }

    if (!canAccessReviewerQueue) {
        const need = Math.max(0, MIN_POINTS_REVIEWER_ACCESS - points)
        return (
            <div className="solar-page">
                <div className="solar-page__inner max-w-lg mx-auto">
                <div className="solar-page__hero text-center">
                    <motion.div
                        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #f5a623, #ff6b35)' }}
                    >
                        <FoundationLogo fillCircle alt="" />
                    </motion.div>
                    <h1 className="font-solar text-2xl font-black mb-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        Reviewer access locked
                    </h1>
                    <p className="text-sm" style={{ color: muted }}>
                        Reach <strong style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>{MIN_POINTS_REVIEWER_ACCESS.toLocaleString()}</strong>{' '}
                        leaderboard points to unlock grading submissions. Each completed grade earns points.
                    </p>
                </div>
                <div
                    className="p-5 rounded-2xl mb-6"
                    style={{ background: cardBg, border: `1px solid ${border}` }}
                >
                    <div className="flex justify-between text-sm mb-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        <span>Your points</span>
                        <span className="font-black tabular-nums">{points.toLocaleString()}</span>
                    </div>
                    <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.12)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(100, (points / MIN_POINTS_REVIEWER_ACCESS) * 100)}%`,
                                background: 'linear-gradient(90deg, #7c3aed, #4fc3f7)',
                            }}
                        />
                    </div>
                    <p className="text-xs mt-3" style={{ color: muted }}>
                        {need > 0 ? `${need.toLocaleString()} more points needed.` : 'You qualify — refresh if this screen is stale.'}
                    </p>
                </div>
                <Link
                    to="/leaderboard"
                    className="block text-center text-sm font-semibold"
                    style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}
                >
                    View leaderboard
                </Link>
                </div>
            </div>
        )
    }

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
                        <strong>{REVIEWERS_REQUIRED}</strong> independent reviewers all pass fact-check. Approved prose is ordered{' '}
                        <strong>easiest → hardest</strong> by segment. Each grade earns <strong>{POINTS_PER_REVIEW_COMPLETED}</strong> pts.
                    </p>
                    <p className="text-xs mt-2" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>
                        Signed in as <strong>{username}</strong> · {points.toLocaleString()} pts
                    </p>
                </motion.div>

                {queue.length === 0 ? (
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
                            const n = (s.reviews || []).length
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
                                                {s.subject || 'Untitled'}
                                            </div>
                                            <div className="text-xs truncate flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: muted }}>
                                                <span>{String(s.planet)} · slot ({coordSlotLabel(s)}) ·</span>
                                                <span className="inline-flex items-center gap-1 min-w-0">
                                                    author
                                                    <FieldHonorTokens
                                                        username={s.authorUsername}
                                                        planetId={s.planet}
                                                        planetLabel={planetTitleById[String(s.planet).toLowerCase()] || s.planet}
                                                    />
                                                    <span className="truncate">@{s.authorUsername}</span>
                                                </span>
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
                                                    {(s.summary || s.detail) && (
                                                        <div className="text-xs leading-relaxed rounded-xl p-3" style={{ background: isDark ? 'rgba(2,4,8,0.45)' : 'rgba(240,244,248,0.9)', color: isDark ? '#cbd5e1' : '#475569' }}>
                                                            {s.summary && <p className="font-semibold mb-1 text-[13px]" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Summary</p>}
                                                            {s.summary && <p className="mb-2">{s.summary}</p>}
                                                            {s.detail && (
                                                                <>
                                                                    <p className="font-semibold mb-1 text-[13px]" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Detail</p>
                                                                    <p className="whitespace-pre-wrap">{s.detail}</p>
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
                                                            {(s.reviews || []).map((r) => (
                                                                <div key={`${r.reviewerUsername}-${r.at}`} className="pl-2 border-l-2 border-opacity-30" style={{ borderColor: isDark ? '#475569' : '#cbd5e1' }}>
                                                                    <span className="font-medium" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                                                                        @{r.reviewerUsername}
                                                                    </span>
                                                                    : fact-check {r.factCheckPass ? 'pass' : 'fail'} · difficulty {r.difficulty}/5
                                                                    {r.notes?.trim() ? (
                                                                        <div className="mt-0.5 italic whitespace-pre-wrap" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                                                            “{r.notes.trim()}”
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


