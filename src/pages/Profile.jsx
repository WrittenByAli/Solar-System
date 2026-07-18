import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Camera, Loader2, Upload, BadgeCheck, ShieldCheck, Mail, Calendar,
    Trophy, Rocket, FileText, CheckCircle2, ClipboardCheck,
    Flame, TrendingUp, Moon, Sun, ChevronRight, Sparkles, Pencil, Check, X,
} from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { imageFileToSquareBlob } from '../utils/archiveInstanceStorage.js'
import { rankProfiles } from '../utils/rankProfiles.js'
import {
    countByDay, buildHeatmapWeeks, computeStreaks, weeklySeries,
    deriveAchievements, buildTimeline, favoritePlanets,
} from '../utils/profileInsights.js'
import AvatarCircle from '../components/AvatarCircle.jsx'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import GlassCard from '../components/profile/GlassCard.jsx'
import AnimatedCounter from '../components/profile/AnimatedCounter.jsx'
import ProgressRing from '../components/profile/ProgressRing.jsx'
import ContributionHeatmap from '../components/profile/ContributionHeatmap.jsx'
import AchievementCard from '../components/profile/AchievementCard.jsx'
import '../styles/solar-page-shell.css'
import '../styles/solar-profile.css'

const ROLE_LABELS = { student: 'Member', reviewer: 'Reviewer', admin: 'Admin' }

const PLANET_STYLES = {
    star: { colors: ['#ffd98a', '#f5a623', '#8a4d0f'], glow: 'rgba(245,166,35,0.35)' },
    sun: { colors: ['#ffd98a', '#f5a623', '#8a4d0f'], glow: 'rgba(245,166,35,0.35)' },
    mercury: { colors: ['#e2e8f0', '#8d99ae', '#4a5568'], glow: 'rgba(148,163,184,0.25)' },
    venus: { colors: ['#ffe9b8', '#e8b76f', '#9c6b2f'], glow: 'rgba(232,183,111,0.3)' },
    earth: { colors: ['#9bd8ff', '#2f86c9', '#1b4d7a'], glow: 'rgba(79,195,247,0.3)' },
    moon: { colors: ['#f1f5f9', '#a8b2c1', '#5b6572'], glow: 'rgba(203,213,225,0.25)' },
    mars: { colors: ['#ffb199', '#d95d39', '#7c2d12'], glow: 'rgba(217,93,57,0.3)' },
    jupiter: { colors: ['#f3d9b1', '#d9a066', '#8a5a2b'], glow: 'rgba(217,160,102,0.3)' },
    saturn: { colors: ['#f5e3b3', '#d9b96e', '#95713a'], glow: 'rgba(217,185,110,0.3)' },
    uranus: { colors: ['#c9f5f2', '#67cfd0', '#2b7f85'], glow: 'rgba(103,207,208,0.3)' },
    neptune: { colors: ['#a9c4ff', '#4f6fd8', '#22337a'], glow: 'rgba(79,111,216,0.3)' },
}
const PLANET_FALLBACK = { colors: ['#d8c9ff', '#8b6fd8', '#41287a'], glow: 'rgba(139,111,216,0.3)' }

/* Apple system hues — used only as small semantic dots/icons */
const STATUS_DOTS = {
    approved: { dot: '#30d158', label: 'Approved' },
    pending: { dot: '#0a84ff', label: 'Pending' },
    rejected: { dot: '#ff453a', label: 'Rejected' },
}

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtMonthYear = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

function SectionHeader({ index, eyebrow, title, meta }) {
    const reduce = useReducedMotion()
    return (
        <motion.header
            className="sp-sechead"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            <div>
                <p className="sp-eyebrow"><b>{index}</b>{eyebrow}</p>
                <h2 className="sp-sectitle">{title}</h2>
            </div>
            {meta && <p className="sp-secmeta">{meta}</p>}
        </motion.header>
    )
}

function SectionError({ message }) {
    if (!message) return null
    return (
        <p className="text-xs px-3 py-2 rounded-lg" role="alert" style={{
            color: '#ff6961', background: 'rgba(255,69,58,0.08)',
            border: '1px solid rgba(255,69,58,0.2)',
        }}>
            {message}
        </p>
    )
}

/** Tiny SVG area chart for the trailing-weeks activity series. */
function Sparkline({ data, stroke, fill }) {
    const reduce = useReducedMotion()
    const W = 240
    const H = 70
    const max = Math.max(1, ...data)
    const step = W / Math.max(1, data.length - 1)
    const pts = data.map((v, i) => [i * step, H - 10 - (v / max) * (H - 24)])
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    const area = `${line} L${W},${H} L0,${H} Z`
    const last = pts[pts.length - 1]
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="Weekly activity trend">
            <defs>
                <linearGradient id="sp-spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fill} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={fill} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#sp-spark-fill)" />
            <motion.path
                d={line}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
            />
            {last && <circle cx={last[0]} cy={last[1]} r="3" fill="#f5a623" />}
        </svg>
    )
}

export default function Profile() {
    const { theme, toggleTheme } = useTheme()
    const isDark = theme === 'dark'
    const { isLoaded, user } = useUser()
    const { profile, role, points, avatarUrl, username, email, canAccessReviewerQueue, refreshProfile } = useAuth()
    const reduce = useReducedMotion()

    /* Apple grays — near-white text on black, near-black on light */
    const strong = isDark ? '#f5f5f7' : '#1d1d1f'
    const secondary = isDark ? '#a1a1a6' : '#424245'
    const muted = '#6e6e73'
    const hairline = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)'
    const ringTrack = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    const gold = isDark ? '#f5a623' : '#b45309'

    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [data, setData] = useState({ profiles: [], submissions: [], reviews: [], threshold: 2500, loading: true })

    const [editingName, setEditingName] = useState(false)
    const [nameDraft, setNameDraft] = useState('')
    const [nameBusy, setNameBusy] = useState(false)
    const [nameError, setNameError] = useState('')

    const fileInputRef = useRef(null)
    const nameInputRef = useRef(null)

    useEffect(() => {
        if (!profile?.id) return undefined
        let active = true
        async function load() {
            const [profilesQ, subsQ, revsQ, settingQ] = await Promise.all([
                supabase.from('public_profiles').select('id, username, points'), // safe-columns view: all users, for rank — no PII
                supabase.from('archive_entries')
                    .select('id, title, short_summary, layer, planet_id, status, created_at, updated_at, updates_entry_id')
                    .eq('submitted_by', profile.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(500),
                supabase.from('reviews')
                    .select('id, entry_id, fact_check_pass, created_at')
                    .eq('reviewer_id', profile.id)
                    .order('created_at', { ascending: false })
                    .limit(500),
                supabase.from('app_settings').select('value').eq('key', 'reviewer_points_threshold').maybeSingle(),
            ])
            if (!active) return
            setData({
                profiles: profilesQ.data || [],
                submissions: subsQ.data || [],
                reviews: revsQ.data || [],
                threshold: parseInt(settingQ.data?.value, 10) || 2500,
                loading: false,
            })
        }
        load()
        return () => { active = false }
    }, [profile?.id])

    useEffect(() => {
        if (editingName) nameInputRef.current?.focus()
    }, [editingName])

    /* ── Derived insights (all real data) ─────────────────────── */
    const insights = useMemo(() => {
        const { profiles, submissions, reviews, threshold } = data
        const ranked = rankProfiles(profiles)
        const rank = profile?.id ? ranked.findIndex((p) => p.id === profile.id) + 1 : 0
        const total = ranked.length
        const percentile = rank > 0 && total > 0 ? Math.max(1, Math.ceil((rank / total) * 100)) : null

        const approved = submissions.filter((s) => s.status === 'approved')
        const rejected = submissions.filter((s) => s.status === 'rejected')
        const decided = approved.length + rejected.length
        const acceptance = decided > 0 ? approved.length / decided : null

        const passCount = reviews.filter((r) => r.fact_check_pass).length
        const passRate = reviews.length > 0 ? passCount / reviews.length : null

        const actions = [...submissions, ...reviews]
        const dayCounts = countByDay(actions)
        const weeks = buildHeatmapWeeks(dayCounts, 26)
        const streaks = computeStreaks(dayCounts)
        const weekly = weeklySeries(actions, 12)
        const recentActions = weekly.reduce((a, n) => a + n, 0)

        return {
            rank,
            total,
            percentile,
            approvedCount: approved.length,
            acceptance,
            passRate,
            weeks,
            streaks,
            weekly,
            recentActions,
            totalActions: actions.length,
            achievements: deriveAchievements({ submissions, reviews, points, role, rank, profile }),
            timeline: buildTimeline({ profile, submissions, reviews, limit: 10 }),
            planets: favoritePlanets(submissions, 4),
            repPct: role === 'student' ? Math.min(1, points / threshold) : 1,
            threshold,
        }
    }, [data, profile, points, role])

    /* ── Avatar upload (storage → public URL → profile row) ───── */
    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file || !profile?.id) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Image must be JPEG, PNG, or WebP')
            return
        }

        setUploadError('')
        setUploading(true)
        try {
            const blob = await imageFileToSquareBlob(file)
            const objectKey = `${profile.id}.jpg`
            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(objectKey, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
            if (uploadErr) {
                setUploadError(`Upload failed: ${uploadErr.message}`)
                return
            }

            const { data: pub } = supabase.storage.from('avatars').getPublicUrl(objectKey)
            const bustedUrl = pub.publicUrl ? `${pub.publicUrl}?v=${Date.now()}` : null
            if (!bustedUrl) {
                setUploadError('Could not get image URL')
                return
            }

            const { error: updateErr } = await supabase
                .from('users_profile')
                .update({ avatar_url: bustedUrl })
                .eq('id', profile.id)
            if (updateErr) {
                setUploadError(`Save failed: ${updateErr.message}`)
            } else {
                await refreshProfile()
            }
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    /* ── Username editing ─────────────────────────────────────── */
    const startEditName = () => {
        setNameDraft(username || '')
        setNameError('')
        setEditingName(true)
    }

    const cancelEditName = () => {
        setEditingName(false)
        setNameError('')
    }

    const saveUsername = async () => {
        if (!profile?.id || nameBusy) return
        const next = nameDraft.trim().replace(/\s+/g, ' ')
        if (next === username) {
            setEditingName(false)
            return
        }
        if (next.length < 3 || next.length > 24) {
            setNameError('Username must be 3–24 characters.')
            return
        }
        if (!/^[a-zA-Z0-9][a-zA-Z0-9 _.-]*$/.test(next)) {
            setNameError('Letters, numbers, spaces and . _ - only (must start with a letter or number).')
            return
        }
        setNameBusy(true)
        setNameError('')
        const { data: taken } = await supabase
            .from('public_profiles') // username-uniqueness check across all users — view exposes username, no PII
            .select('id')
            .ilike('username', next)
            .neq('id', profile.id)
            .limit(1)
        if (taken?.length) {
            setNameError('That username is already taken.')
            setNameBusy(false)
            return
        }
        const { error } = await supabase
            .from('users_profile')
            .update({ username: next })
            .eq('id', profile.id)
        if (error) {
            setNameError('Could not save the username — try again.')
        } else {
            await refreshProfile()
            setEditingName(false)
        }
        setNameBusy(false)
    }

    const onNameKeyDown = (e) => {
        if (e.key === 'Enter') saveUsername()
        if (e.key === 'Escape') cancelEditName()
    }

    if (!isLoaded || !user) return null

    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || username || 'Explorer'
    const emailVerified = user.primaryEmailAddress?.verification?.status === 'verified'
    const loading = data.loading

    const heroStats = [
        { label: 'Contributions', value: data.submissions.length },
        { label: 'Approved', value: insights.approvedCount },
        { label: 'Reviews', value: data.reviews.length },
        { label: 'Points', value: points, color: gold },
    ]

    return (
        <div className="solar-page sp-page">
            <LazyVantaFogBackground
                isDark={isDark}
                entryReveal={1}
                className="sp-page__vanta"
            />

            <div
                className="sp-page__content w-full max-w-5xl mx-auto px-4 sm:px-6 pb-24 flex flex-col"
                style={{ paddingTop: 'calc(96px + env(safe-area-inset-top))' }}
            >
                {/* ══ Hero ══════════════════════════════════════════ */}
                <motion.section
                    className="sp-glass"
                    initial={reduce ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    {profile?.id && (
                        <span className="sp-dossier hidden sm:block">
                            Dossier № {profile.id.slice(0, 8)}
                        </span>
                    )}
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">
                            {/* Avatar */}
                            <div className="sp-avatar">
                                <div className="sp-avatar__ring" aria-hidden />
                                <div className="sp-avatar__img">
                                    <AvatarCircle avatarUrl={avatarUrl} username={username} size={124} />
                                </div>
                                {uploading && (
                                    <span className="sp-avatar__busy" aria-live="polite" aria-label="Uploading avatar">
                                        <Loader2 size={24} className="animate-spin" aria-hidden />
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="sp-avatar__cam"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || !profile?.id}
                                    title="Change avatar"
                                    aria-label="Change avatar"
                                >
                                    <Camera size={15} aria-hidden />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleAvatarChange}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                    aria-hidden
                                />
                            </div>

                            {/* Identity */}
                            <div className="flex-1 min-w-0 text-center sm:text-left pt-1">
                                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                                    <h1 className="sp-name truncate">{displayName}</h1>
                                    {emailVerified && (
                                        <span title="Email verified" aria-label="Email verified">
                                            <BadgeCheck size={20} style={{ color: gold }} aria-hidden />
                                        </span>
                                    )}
                                </div>

                                {editingName ? (
                                    <div className="mt-3.5">
                                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                            <input
                                                ref={nameInputRef}
                                                type="text"
                                                className="sp-nameinput"
                                                value={nameDraft}
                                                maxLength={24}
                                                onChange={(e) => setNameDraft(e.target.value)}
                                                onKeyDown={onNameKeyDown}
                                                disabled={nameBusy}
                                                placeholder="new username"
                                                aria-label="New username"
                                            />
                                            <button
                                                type="button"
                                                className="sp-namebtn sp-namebtn--save"
                                                onClick={saveUsername}
                                                disabled={nameBusy}
                                                aria-label="Save username"
                                                title="Save"
                                            >
                                                {nameBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />}
                                            </button>
                                            <button
                                                type="button"
                                                className="sp-namebtn"
                                                onClick={cancelEditName}
                                                disabled={nameBusy}
                                                aria-label="Cancel editing"
                                                title="Cancel"
                                            >
                                                <X size={14} aria-hidden />
                                            </button>
                                        </div>
                                        {nameError && <p className="sp-nameerr text-center sm:text-left">{nameError}</p>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap mt-3.5">
                                        <span className="sp-pill">{ROLE_LABELS[role] || 'Member'}</span>
                                        <span className="sp-meta-line">
                                            @{username} · member since {profile?.created_at ? fmtMonthYear(profile.created_at).toLowerCase() : '—'}
                                        </span>
                                        <button
                                            type="button"
                                            className="sp-editbtn"
                                            onClick={startEditName}
                                            disabled={!profile?.id}
                                            aria-label="Edit username"
                                            title="Edit username"
                                        >
                                            <Pencil size={11} aria-hidden />
                                        </button>
                                    </div>
                                )}

                                {/* Hairline-divided counters */}
                                <div className="sp-hero-stats">
                                    {heroStats.map(({ label, value, color }) => (
                                        <div key={label} className="sp-hero-stat">
                                            <AnimatedCounter
                                                value={value}
                                                className="sp-hero-stat__num"
                                                style={color ? { color } : undefined}
                                            />
                                            <p className="sp-hero-stat__label">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <div className="mt-4">
                    <SectionError message={uploadError} />
                </div>

                {/* ══ 01 · Reputation ═══════════════════════════════ */}
                <section className="mt-12">
                    <SectionHeader
                        index="01"
                        eyebrow="Rank & standing"
                        title="Reputation"
                        meta={insights.rank > 0 ? `nº ${insights.rank} / ${insights.total}` : 'unranked'}
                    />
                    <GlassCard className="p-6">
                        <div className="flex items-end justify-between gap-3 mb-3.5 flex-wrap">
                            <p className="text-sm font-semibold" style={{ color: strong, letterSpacing: '-0.01em' }}>
                                {role === 'student'
                                    ? 'Progress to Reviewer'
                                    : role === 'admin' ? 'Admin — top of the ladder' : 'Reviewer rank achieved'}
                            </p>
                            <p className="sp-mono text-[11px] tabular-nums" style={{ color: secondary }}>
                                {role === 'student'
                                    ? `${points.toLocaleString()} / ${insights.threshold.toLocaleString()} pts`
                                    : `${points.toLocaleString()} pts`}
                            </p>
                        </div>
                        <div className="sp-xpbar" role="progressbar" aria-valuenow={Math.round(insights.repPct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Reputation progress">
                            <motion.div
                                className="sp-xpbar__fill"
                                initial={reduce ? { width: `${insights.repPct * 100}%` } : { width: 0 }}
                                whileInView={{ width: `${insights.repPct * 100}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </div>
                        <p className="text-xs mt-3.5 max-w-xl leading-relaxed" style={{ color: muted }}>
                            {role === 'student'
                                ? `Points come from approved entries and completed reviews. The Reviewer rank unlocks automatically at ${insights.threshold.toLocaleString()}.`
                                : profile?.reviewer_promoted_at
                                    ? `Reviewer since ${fmtDate(profile.reviewer_promoted_at)}. Admin is appointed manually.`
                                    : 'Admin is appointed manually — this is the top of the automatic ladder.'}
                        </p>
                        <div className="flex gap-2 flex-wrap mt-5">
                            <span className="sp-chip">
                                <Trophy size={11} style={{ color: gold }} aria-hidden />
                                {insights.rank > 0 ? `Rank #${insights.rank} of ${insights.total}` : 'Not yet ranked'}
                            </span>
                            {insights.percentile && (
                                <span className="sp-chip">
                                    <TrendingUp size={11} aria-hidden />
                                    Top {insights.percentile}%
                                </span>
                            )}
                            <span className="sp-chip">
                                <Flame size={11} style={{ color: insights.streaks.current > 0 ? gold : undefined }} aria-hidden />
                                {insights.streaks.current > 0 ? `${insights.streaks.current}-day streak` : 'No active streak'}
                            </span>
                        </div>
                    </GlassCard>
                </section>

                {loading ? (
                    <div className="flex flex-col gap-5 mt-12" aria-label="Loading profile data" role="status">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="sp-skel h-44" /><div className="sp-skel h-44" /><div className="sp-skel h-44" />
                        </div>
                        <div className="sp-skel h-56" />
                        <div className="sp-skel h-64" />
                    </div>
                ) : (
                    <>
                        {/* ══ 02 · Field record ═════════════════════ */}
                        <section className="mt-12">
                            <SectionHeader index="02" eyebrow="Performance" title="Field record" />
                            <div className="grid sm:grid-cols-3 gap-4">
                                <GlassCard className="p-5 flex flex-col items-center gap-4">
                                    <p className="sp-tilelabel">Acceptance</p>
                                    <ProgressRing value={insights.acceptance ?? 0} from={strong} to={secondary} track={ringTrack} label="Acceptance rate">
                                        <span className="sp-ringnum">
                                            {insights.acceptance !== null ? `${Math.round(insights.acceptance * 100)}%` : '—'}
                                        </span>
                                    </ProgressRing>
                                    <p className="text-[11px] text-center leading-relaxed" style={{ color: muted }}>
                                        {insights.acceptance !== null
                                            ? 'of your reviewed entries were approved'
                                            : 'No entries have finished review yet'}
                                    </p>
                                </GlassCard>

                                <GlassCard className="p-5 flex flex-col items-center gap-4">
                                    <p className="sp-tilelabel">Verdicts</p>
                                    <ProgressRing value={insights.passRate ?? 0} from={strong} to={secondary} track={ringTrack} label="Review pass verdicts">
                                        <span className="sp-ringnum">
                                            {insights.passRate !== null ? `${Math.round(insights.passRate * 100)}%` : '—'}
                                        </span>
                                    </ProgressRing>
                                    <p className="text-[11px] text-center leading-relaxed" style={{ color: muted }}>
                                        {insights.passRate !== null
                                            ? 'of your peer reviews passed the entry'
                                            : 'Complete reviews to see your verdict split'}
                                    </p>
                                </GlassCard>

                                <GlassCard className="p-5 flex flex-col items-center gap-4">
                                    <p className="sp-tilelabel">Standing</p>
                                    <ProgressRing
                                        value={insights.rank > 0 ? 1 - (insights.rank - 1) / Math.max(1, insights.total) : 0}
                                        from="#f5a623"
                                        to="#ffcf70"
                                        track={ringTrack}
                                        label="Community standing"
                                    >
                                        <span className="sp-ringnum">{insights.rank > 0 ? `#${insights.rank}` : '—'}</span>
                                        {insights.percentile && (
                                            <span className="sp-mono text-[9px] font-medium mt-1" style={{ color: muted }}>TOP {insights.percentile}%</span>
                                        )}
                                    </ProgressRing>
                                    <p className="text-[11px] text-center leading-relaxed" style={{ color: muted }}>
                                        {insights.rank > 0 ? `of ${insights.total} archivists on the leaderboard` : 'Contribute to enter the leaderboard'}
                                    </p>
                                </GlassCard>
                            </div>
                        </section>

                        {/* ══ 03 · Activity ═════════════════════════ */}
                        <section className="mt-12">
                            <SectionHeader
                                index="03"
                                eyebrow="Telemetry"
                                title="Activity"
                                meta={`${insights.totalActions} actions logged`}
                            />
                            <GlassCard className="p-6">
                                <div className="grid lg:grid-cols-[1fr_220px] gap-6 items-start">
                                    <div>
                                        <p className="sp-mono text-[11px] mb-4" style={{ color: secondary }}>
                                            {insights.recentActions} in the last 12 weeks
                                        </p>
                                        <ContributionHeatmap weeks={insights.weeks} muted={muted} />
                                    </div>
                                    <div className="flex lg:flex-col gap-3 flex-wrap">
                                        <div className="flex-1 lg:flex-none rounded-xl px-4 py-3" style={{ border: `1px solid ${hairline}` }}>
                                            <span className="flex items-center gap-2" style={{ color: insights.streaks.current > 0 ? gold : strong }}>
                                                <Flame size={14} aria-hidden />
                                                <AnimatedCounter value={insights.streaks.current} className="sp-hero-stat__num" style={{ fontSize: '1.45rem', color: 'inherit' }} />
                                            </span>
                                            <p className="sp-infolabel mt-1.5">Current streak</p>
                                        </div>
                                        <div className="flex-1 lg:flex-none rounded-xl px-4 py-3" style={{ border: `1px solid ${hairline}` }}>
                                            <AnimatedCounter value={insights.streaks.longest} className="sp-hero-stat__num" style={{ fontSize: '1.45rem' }} />
                                            <p className="sp-infolabel mt-1.5">Longest streak</p>
                                        </div>
                                        <div className="flex-1 lg:flex-none" style={{ minWidth: 150 }}>
                                            <Sparkline data={insights.weekly} stroke={strong} fill={strong} />
                                            <p className="sp-infolabel text-center mt-1">12-week trend</p>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </section>

                        {/* ══ 04 · Commendations ════════════════════ */}
                        <section className="mt-12">
                            <SectionHeader
                                index="04"
                                eyebrow="Commendations"
                                title="Achievements"
                                meta={`${insights.achievements.filter((a) => a.progress >= a.target).length} / ${insights.achievements.length} unlocked`}
                            />
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {insights.achievements.map((ach, i) => (
                                    <AchievementCard key={ach.id} ach={ach} index={i} />
                                ))}
                            </div>
                        </section>

                        {/* ══ 05 · Mission log ══════════════════════ */}
                        <section className="mt-12">
                            <SectionHeader index="05" eyebrow="History" title="Activity Log" />
                            <GlassCard className="p-6">
                                <div className="sp-tl">
                                    {insights.timeline.map((ev, i) => {
                                        const iconFor = {
                                            joined: { Icon: Rocket, color: strong },
                                            promotion: { Icon: ShieldCheck, color: gold },
                                            submission: { Icon: FileText, color: secondary },
                                            approved: { Icon: CheckCircle2, color: '#30d158' },
                                            review: { Icon: ClipboardCheck, color: ev.meta?.pass ? '#30d158' : '#ff9f0a' },
                                        }[ev.type] || { Icon: Sparkles, color: secondary }
                                        const dot = ev.type === 'submission' ? STATUS_DOTS[ev.meta?.status] : null
                                        return (
                                            <motion.div
                                                key={ev.id}
                                                className="sp-tl__item"
                                                initial={reduce ? false : { opacity: 0, x: -14 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true, margin: '-30px' }}
                                                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : Math.min(i * 0.04, 0.3) }}
                                            >
                                                <span className="sp-tl__dot" style={{ color: iconFor.color }}>
                                                    <iconFor.Icon size={12} aria-hidden />
                                                </span>
                                                <div className="sp-tl__card">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold truncate" style={{ color: strong, letterSpacing: '-0.012em' }}>
                                                                {ev.type === 'submission' ? `Submitted "${ev.title}"`
                                                                    : ev.type === 'approved' ? `"${ev.title}" was approved`
                                                                        : ev.title}
                                                            </p>
                                                            <p className="sp-tl__date">
                                                                {fmtDate(ev.at)}
                                                                {ev.meta?.layer ? ` · L${ev.meta.layer}` : ''}
                                                                {ev.meta?.planetId ? ` · ${ev.meta.planetId}` : ''}
                                                            </p>
                                                        </div>
                                                        {dot && (
                                                            <span className="sp-status shrink-0">
                                                                <i className="sp-status__dot" style={{ background: dot.dot }} aria-hidden />
                                                                {dot.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </GlassCard>
                        </section>

                        {/* ══ 06 · Favorite hubs ════════════════════ */}
                        <section className="mt-12">
                            <SectionHeader index="06" eyebrow="Contribution data" title="Favorite Hubs" />
                            {insights.planets.length === 0 ? (
                                <GlassCard className="p-8 text-center">
                                    <p className="text-sm mb-5" style={{ color: secondary }}>
                                        Your most active research hubs will appear here.
                                    </p>
                                    <Link to="/submit" className="sp-cta">
                                        <Upload size={14} aria-hidden />
                                        Submit Research
                                    </Link>
                                </GlassCard>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {insights.planets.map(({ planetId, total, approved }) => {
                                        const style = PLANET_STYLES[planetId] || PLANET_FALLBACK
                                        const [c0, c1, c2] = style.colors
                                        return (
                                            <Link key={planetId} to={`/archive/${planetId}`} className="sp-planet">
                                                <div className="sp-planet__stage">
                                                    <span className="sp-planet__orbit" aria-hidden />
                                                    <span
                                                        className="sp-planet__orb"
                                                        aria-hidden
                                                        style={{
                                                            background: `radial-gradient(circle at 32% 30%, ${c0}, ${c1} 55%, ${c2} 100%)`,
                                                            boxShadow: `inset -8px -10px 22px rgba(0,0,0,0.45), 0 0 18px ${style.glow}`,
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="sp-planet__name">{planetId}</p>
                                                    <p className="sp-planet__count">
                                                        {total} {total === 1 ? 'entry' : 'entries'} · {approved} approved
                                                    </p>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        {/* ══ 07 · Dossier ══════════════════════════ */}
                        <section className="mt-12">
                            <SectionHeader index="07" eyebrow="Records & controls" title="Identity" />
                            <div className="grid md:grid-cols-2 gap-4">
                                <GlassCard className="p-4 flex flex-col gap-1">
                                    <div className="sp-inforow">
                                        <span className="sp-inforow__icon"><Mail size={15} aria-hidden /></span>
                                        <div className="min-w-0">
                                            <p className="sp-infolabel">Email</p>
                                            <p className="text-sm font-medium truncate mt-0.5" style={{ color: strong }}>{email || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="sp-inforow">
                                        <span className="sp-inforow__icon"><Calendar size={15} aria-hidden /></span>
                                        <div>
                                            <p className="sp-infolabel">Joined</p>
                                            <p className="text-sm font-medium mt-0.5" style={{ color: strong }}>
                                                {profile?.created_at ? fmtDate(profile.created_at) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="sp-inforow">
                                        <span className="sp-inforow__icon"><ShieldCheck size={15} aria-hidden /></span>
                                        <div>
                                            <p className="sp-infolabel">Role</p>
                                            <p className="text-sm font-medium mt-0.5" style={{ color: strong }}>{ROLE_LABELS[role] || 'Member'}</p>
                                        </div>
                                    </div>
                                    <div className="sp-inforow">
                                        <span className="sp-inforow__icon"><BadgeCheck size={15} aria-hidden /></span>
                                        <div>
                                            <p className="sp-infolabel">Verification</p>
                                            <p className="text-sm font-medium mt-0.5" style={{ color: emailVerified ? '#30d158' : strong }}>
                                                {emailVerified ? 'Email verified' : 'Email not verified'}
                                            </p>
                                        </div>
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-4 flex flex-col gap-1">
                                    <div className="sp-inforow">
                                        <span className="sp-inforow__icon">
                                            {isDark ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium" style={{ color: strong }}>Dark mode</p>
                                            <p className="text-[11px] mt-0.5" style={{ color: muted }}>Switch the interface theme</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="sp-switch"
                                            data-on={isDark}
                                            onClick={toggleTheme}
                                            role="switch"
                                            aria-checked={isDark}
                                            aria-label="Toggle dark mode"
                                        >
                                            <span className="sp-switch__knob" />
                                        </button>
                                    </div>
                                    <Link to="/account" className="sp-inforow">
                                        <span className="sp-inforow__icon"><ShieldCheck size={15} aria-hidden /></span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium" style={{ color: strong }}>Account &amp; security</p>
                                            <p className="text-[11px] mt-0.5" style={{ color: muted }}>Two-factor auth, passkeys, sessions</p>
                                        </div>
                                        <ChevronRight size={16} style={{ color: muted }} aria-hidden />
                                    </Link>
                                    {canAccessReviewerQueue && (
                                        <Link to="/review-queue" className="sp-inforow">
                                            <span className="sp-inforow__icon"><ClipboardCheck size={15} aria-hidden /></span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium" style={{ color: strong }}>Review queue</p>
                                                <p className="text-[11px] mt-0.5" style={{ color: muted }}>Grade pending submissions</p>
                                            </div>
                                            <ChevronRight size={16} style={{ color: muted }} aria-hidden />
                                        </Link>
                                    )}
                                    <Link to="/submit" className="sp-inforow">
                                        <span className="sp-inforow__icon"><Upload size={15} aria-hidden /></span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium" style={{ color: strong }}>Submit an entry</p>
                                            <p className="text-[11px] mt-0.5" style={{ color: muted }}>Contribute research to the archive</p>
                                        </div>
                                        <ChevronRight size={16} style={{ color: muted }} aria-hidden />
                                    </Link>
                                </GlassCard>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    )
}
