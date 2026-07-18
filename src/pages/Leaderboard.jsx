import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, X } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import AvatarCircle from '../components/AvatarCircle.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { applyLeaderboardView, buildObservatoryModel } from '../utils/leaderboardObservatory.js'
import fallbackData from '../data/researchData.json'
import '../styles/solar-leaderboard.css'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData

const DEMO_PROFILES = [
    { username: 'OrionNova', points: 14520, reviewsCompleted: 412, approvedTotal: 188, contributionsByPlanet: { sun: 42, jupiter: 38, mars: 28 }, approvedByLayer: { '4': 40, '5': 50, '6': 45, '7': 30, '8': 23 }, reviewsByPlanet: { sun: 80, earth: 60, mars: 55 } },
    { username: 'aurora_reviewer', points: 12840, reviewsCompleted: 310, approvedTotal: 142, contributionsByPlanet: { sun: 35, earth: 40, jupiter: 22 }, reviewsByPlanet: { sun: 90, earth: 70, mars: 50 } },
    { username: 'orbit_cartographer', points: 9820, reviewsCompleted: 245, approvedTotal: 118, contributionsByPlanet: { earth: 45, venus: 30, saturn: 20 }, reviewsByPlanet: { earth: 80, venus: 55 } },
    { username: 'solar_factcheck', points: 7640, reviewsCompleted: 198, approvedTotal: 95, contributionsByPlanet: { jupiter: 40, mercury: 25 }, reviewsByPlanet: { jupiter: 100, mercury: 45 } },
    { username: 'bio_dome_archivist', points: 5820, reviewsCompleted: 156, approvedTotal: 72, contributionsByPlanet: { earth: 50, venus: 22 }, reviewsByPlanet: { earth: 70, venus: 40 } },
    { username: 'mars_systems', points: 4210, reviewsCompleted: 112, approvedTotal: 58, contributionsByPlanet: { mars: 45, mercury: 13 }, reviewsByPlanet: { mars: 80 } },
    { username: 'neptune_waterlab', points: 3180, reviewsCompleted: 88, approvedTotal: 42, contributionsByPlanet: { neptune: 35, saturn: 7 }, reviewsByPlanet: { neptune: 60 } },
    { username: 'quantum_scribe', points: 2640, reviewsCompleted: 72, approvedTotal: 35, contributionsByPlanet: { sun: 20, jupiter: 15 }, reviewsByPlanet: { sun: 40 } },
    { username: 'venus_grower', points: 1980, reviewsCompleted: 54, approvedTotal: 28, contributionsByPlanet: { venus: 28 }, reviewsByPlanet: { venus: 35 } },
    { username: 'saturn_ecology', points: 1540, reviewsCompleted: 41, approvedTotal: 22, contributionsByPlanet: { saturn: 22 }, reviewsByPlanet: { saturn: 28 } },
]

const PODIUM_ORDER = [
    { place: 2, rankIndex: 1 },
    { place: 1, rankIndex: 0 },
    { place: 3, rankIndex: 2 },
]

const PODIUM_TONE = { 1: 'gold-1', 2: 'gold-2', 3: 'gold-3' }

function PodiumColumn({ contributor, place, isMe, avatarUrl, displayValue, displaySuffix }) {
    if (!contributor) return <div className="obs-podium__col obs-podium__col--empty" aria-hidden />

    const tone = PODIUM_TONE[place]

    return (
        <motion.div
            className={`obs-podium__col obs-podium__col--${place}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: place === 1 ? 0.1 : place === 2 ? 0 : 0.2 }}
        >
            <div className={`obs-podium__player obs-podium__player--${tone}`}>
                <span className={`obs-podium__tag obs-podium__tag--${tone}`}>
                    {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
                </span>
                <div className={`obs-podium__avatar obs-podium__avatar--${tone}`}>
                    <AvatarCircle username={contributor.username} avatarUrl={avatarUrl} size={place === 1 ? 72 : 58} />
                </div>
                <div className="obs-podium__identity">
                    <p className="obs-podium__name">{contributor.username}</p>
                    {isMe ? <span className="obs-podium__you">you</span> : null}
                </div>
                <p className="obs-podium__points">
                    {(displayValue ?? contributor.points).toLocaleString()}
                    {displaySuffix ? <span className="obs-podium__points-suffix"> {displaySuffix}</span> : null}
                </p>
            </div>
            <div className={`obs-podium__pedestal obs-podium__pedestal--${tone}`}>
                <span className={`obs-podium__badge obs-podium__badge--${tone}`}>{place}</span>
            </div>
        </motion.div>
    )
}

function LeaderboardTable({ rows, myUserId, resolveAvatar, metricLabel, metricValue, rankKey = 'rank' }) {
    if (rows.length === 0) return null

    return (
        <div className="obs-lb-table-wrap">
            <div className="obs-lb-table__head" aria-hidden>
                <span className="obs-lb-th obs-lb-th--rank">#</span>
                <span className="obs-lb-th obs-lb-th--player">Player</span>
                <span className="obs-lb-th obs-lb-th--points">Points</span>
                <span className="obs-lb-th obs-lb-th--entries">{metricLabel}</span>
            </div>
            <ol className="obs-lb-table" aria-label="Rankings">
                {rows.map((c) => {
                    const isMe = myUserId && c.userId === myUserId
                    return (
                        <li key={`${c.userId || c.username}-${c[rankKey]}`} className={`obs-lb-row${isMe ? ' obs-lb-row--me' : ''}`}>
                            <span className="obs-lb-row__rank">{c[rankKey]}</span>
                            <div className="obs-lb-row__player">
                                <AvatarCircle username={c.username} avatarUrl={resolveAvatar(c)} size={36} />
                                <div className="obs-lb-row__identity">
                                    <span className="obs-lb-row__name">{c.username}</span>
                                    {isMe ? <span className="obs-lb-row__you">you</span> : null}
                                </div>
                            </div>
                            <span className="obs-lb-row__points">{c.points.toLocaleString()}</span>
                            <span className="obs-lb-row__entries">{metricValue(c)}</span>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}

export default function Leaderboard() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    // Matched by userId, not username: verified live against production data
    // that users_profile.username has NO unique constraint (only clerk_id and
    // the id PK do) -- 3 real accounts already share the name "Muhammad Ali".
    // Comparing by username would tag ALL same-named accounts as "you" and
    // show them each other's avatar.
    const { avatarUrl: myAvatarUrl, profile: myProfile, isLoggedIn } = useAuth()
    const myUserId = myProfile?.id ?? null
    const [sceneReveal, setSceneReveal] = useState(0)
    const [supaProfiles, setSupaProfiles] = useState([])
    // 'loading' | 'error' | 'ready' -- previously any failure (network error,
    // RLS denial, Supabase downtime) was indistinguishable from "no real
    // profiles yet": both silently fell through to the same 10 fabricated
    // DEMO_PROFILES with no indication anything had gone wrong. A real error
    // now shows a real error state instead of fake leaderboard data.
    const [loadState, setLoadState] = useState('loading')
    const [refreshing, setRefreshing] = useState(false)
    const [tick, setTick] = useState(0)
    const [metric, setMetric] = useState('points') // 'points' | 'approvedTotal' | 'reviewsCompleted'
    const [planetFilter, setPlanetFilter] = useState('') // '' = all planets/hubs
    const [searchQuery, setSearchQuery] = useState('')
    // 'all' | '7d' | '30d'. Only meaningful for approvedTotal/reviewsCompleted:
    // users_profile.points is a flat lifetime total with no timestamped
    // ledger (verified against the schema -- no approved_at column exists),
    // so it cannot be time-sliced without either a schema change or a
    // misleading proxy. reviewsCompleted CAN be sliced accurately
    // (reviews.created_at IS the point-earning moment). approvedTotal uses
    // archive_entries.created_at (submission time) as an honest proxy --
    // labeled "submitted", not "earned", since approval can lag submission.
    const [timeWindow, setTimeWindow] = useState('all')
    const [timeScoped, setTimeScoped] = useState(null) // null = not using this path; else { rows, loadState, guestBlocked }
    const [timeScopedRetryTick, setTimeScopedRetryTick] = useState(0)
    // Pagination: DISPLAY_PAGE_SIZE governs how many already-fetched rows are
    // shown at once (cheap, instant, no query); FETCH_PAGE_SIZE governs how
    // many rows one server round-trip pulls from leaderboard_view. "Show
    // more" only ever triggers a NEW server fetch on the plain unfiltered
    // view (metric='points', no hub filter, no search, no time window) --
    // that's the only mode where "the base fetch might be incomplete" is
    // even meaningful; every other mode (tabs/hub/search/time-window)
    // already operates over a fully-computed list for its own scope (either
    // all of model.contributors fetched so far, or timeScoped's single
    // un-paginated query), so "Show more" there just reveals more of what's
    // already there.
    const DISPLAY_PAGE_SIZE = 25
    const FETCH_PAGE_SIZE = 100
    const [visibleCount, setVisibleCount] = useState(DISPLAY_PAGE_SIZE)
    const [fetchOffset, setFetchOffset] = useState(0)
    const [hasMoreOnServer, setHasMoreOnServer] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    useEffect(() => { window.scrollTo(0, 0) }, [])

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
        window.addEventListener('solar-archive-profile-updated', bump)
        window.addEventListener('solar-archive-submissions-updated', bump)
        return () => {
            window.removeEventListener('solar-archive-profile-updated', bump)
            window.removeEventListener('solar-archive-submissions-updated', bump)
        }
    }, [])

    const loadLeaderboard = async (offset = 0, append = false) => {
        const { data: rows, error } = await supabase
            .from('leaderboard_view')
            .select('*')
            .order('rank')
            .range(offset, offset + FETCH_PAGE_SIZE - 1)

        if (error) throw error

        const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))]
        const avatarByUserId = {}

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('public_profiles') // safe-columns view — never expose PII of other users
                .select('id, avatar_url')
                .in('id', userIds)

            for (const profile of profiles || []) {
                avatarByUserId[profile.id] = profile.avatar_url || null
            }
        }

        const built = (rows || []).map((r) => ({
            userId: r.user_id,
            username: r.username,
            avatarUrl: avatarByUserId[r.user_id] || r.avatar_url || null,
            points: r.points || 0,
            reviewsCompleted: r.reviews_completed || 0,
            approvedTotal: r.approved_total || 0,
            contributionsByPlanet: r.approved_by_planet || {},
            approvedByLayer: r.approved_by_layer || {},
            reviewsByPlanet: r.reviews_by_planet || {},
        }))
        setSupaProfiles((prev) => (append ? [...prev, ...built] : built))
        setHasMoreOnServer(built.length === FETCH_PAGE_SIZE)
        setFetchOffset(offset + built.length)
        setLoadState('ready')
    }

    useEffect(() => {
        let active = true
        setLoadState((s) => (s === 'ready' ? s : 'loading'))
        setVisibleCount(DISPLAY_PAGE_SIZE)
        loadLeaderboard(0, false).catch(() => { if (active) setLoadState('error') })
        return () => { active = false }
    }, [tick])

    // Reset the reveal count whenever the active view changes -- switching
    // tabs/hub/search/time-window should start each view fresh, not carry
    // over however many rows were revealed in a different view.
    useEffect(() => { setVisibleCount(DISPLAY_PAGE_SIZE) }, [metric, planetFilter, searchQuery, timeWindow])

    const isBaseView = metric === 'points' && !planetFilter && !searchQuery.trim() && timeWindow === 'all'

    const handleLoadMore = async () => {
        if (isBaseView && visibleCount >= supaProfiles.length && hasMoreOnServer) {
            setLoadingMore(true)
            try {
                await loadLeaderboard(fetchOffset, true)
                setVisibleCount((c) => c + DISPLAY_PAGE_SIZE)
            } catch {
                // Leave visibleCount/rows untouched -- a failed "load more" shouldn't
                // wipe out what's already successfully showing.
            } finally {
                setLoadingMore(false)
            }
            return
        }
        setVisibleCount((c) => c + DISPLAY_PAGE_SIZE)
    }

    // Time-scoped ranking bypasses leaderboard_view entirely (it has no time
    // dimension -- confirmed via its definition, a full-history cumulative
    // aggregate) and queries the raw tables directly. Deliberately does NOT
    // combine with planetFilter -- that would need an embedded FK join
    // (reviews -> archive_entries.planet_id) which adds real fragility for
    // a feature this scoped; the hub selector is disabled while a time
    // window is active instead (see the toolbar JSX).
    useEffect(() => {
        if (timeWindow === 'all' || metric === 'points') {
            setTimeScoped(null)
            return undefined
        }
        // Checked proactively via the REAL auth state, not inferred from the
        // query result: verified live that RLS-denied SELECTs return 200 +
        // an EMPTY array, not an error -- `reviews` has no anon SELECT
        // policy at all (`reviews_read_authenticated` is `to authenticated`
        // only), so a guest's query would silently look identical to "zero
        // reviewers this week" with no error to detect. That would have
        // shown guests a misleading "nobody reviewed anything" instead of
        // "sign in to see this".
        if (metric === 'reviewsCompleted' && !isLoggedIn) {
            setTimeScoped({ rows: [], loadState: 'guest-blocked', guestBlocked: true })
            return undefined
        }
        let active = true
        setTimeScoped({ rows: [], loadState: 'loading', guestBlocked: false })

        const days = timeWindow === '7d' ? 7 : 30
        const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        async function run() {
            const table = metric === 'reviewsCompleted' ? 'reviews' : 'archive_entries'
            const idColumn = metric === 'reviewsCompleted' ? 'reviewer_id' : 'submitted_by'
            let query = supabase.from(table).select(idColumn).gte('created_at', cutoffIso)
            if (metric === 'approvedTotal') {
                query = query.eq('status', 'approved').is('updates_entry_id', null)
            }
            const { data, error } = await query
            if (!active) return

            if (error) {
                setTimeScoped({ rows: [], loadState: 'error', guestBlocked: false })
                return
            }

            const counts = new Map()
            for (const row of data || []) {
                const uid = row[idColumn]
                if (!uid) continue
                counts.set(uid, (counts.get(uid) || 0) + 1)
            }
            const userIds = [...counts.keys()]
            if (userIds.length === 0) {
                setTimeScoped({ rows: [], loadState: 'ready', guestBlocked: false })
                return
            }

            const { data: profiles } = await supabase
                .from('public_profiles') // safe-columns view — never expose PII of other users
                .select('id, username, avatar_url, points')
                .in('id', userIds)
            if (!active) return

            const rows = (profiles || [])
                .map((p) => ({
                    userId: p.id,
                    username: p.username,
                    avatarUrl: p.avatar_url || null,
                    points: p.points || 0,
                    viewMetricValue: counts.get(p.id) || 0,
                }))
                .sort((a, b) => b.viewMetricValue - a.viewMetricValue || a.username.localeCompare(b.username))
                .map((r, i) => ({ ...r, viewRank: i + 1 }))

            setTimeScoped({ rows, loadState: 'ready', guestBlocked: false })
        }

        run().catch(() => { if (active) setTimeScoped({ rows: [], loadState: 'error', guestBlocked: false }) })
        return () => { active = false }
    }, [metric, timeWindow, timeScopedRetryTick, isLoggedIn])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await supabase.rpc('refresh_leaderboard_view')
            await loadLeaderboard()
        } catch {
            setLoadState('error')
        } finally {
            setRefreshing(false)
        }
    }

    // DEMO_PROFILES is a deliberate, clearly-labeled preview for a genuinely
    // empty leaderboard (e.g. a brand-new deployment with zero real
    // profiles) -- it must NEVER be the silent fallback for a fetch failure,
    // which is what loadState now prevents.
    const isPreview = loadState === 'ready' && supaProfiles.length === 0
    const rawProfiles = isPreview ? DEMO_PROFILES : supaProfiles

    const model = useMemo(
        () => buildObservatoryModel(rawProfiles, researchData.planets),
        [rawProfiles],
    )

    // planets that actually have at least one contributor/reviewer, so the
    // filter never offers a hub that would just show "no results"
    const availablePlanets = useMemo(() => {
        const ids = new Set()
        for (const c of model.contributors) {
            Object.keys(c.contributionsByPlanet || {}).forEach((id) => { if (c.contributionsByPlanet[id] > 0) ids.add(id) })
            Object.keys(c.reviewsByPlanet || {}).forEach((id) => { if (c.reviewsByPlanet[id] > 0) ids.add(id) })
        }
        return researchData.planets.filter((p) => ids.has(String(p.id).toLowerCase()))
    }, [model.contributors])

    const view = useMemo(
        () => applyLeaderboardView(model.contributors, { metric, planetId: planetFilter || null, searchQuery }),
        [model.contributors, metric, planetFilter, searchQuery],
    )
    const usingTimeWindow = timeWindow !== 'all' && metric !== 'points'
    // Time-scoped rows are pre-ranked server-round-trip; search still applies
    // client-side on top of them, same as the all-time path.
    const timeScopedVisible = useMemo(() => {
        if (!timeScoped || timeScoped.loadState !== 'ready') return []
        const q = searchQuery.trim().toLowerCase()
        return q ? timeScoped.rows.filter((r) => r.username.toLowerCase().includes(q)) : timeScoped.rows
    }, [timeScoped, searchQuery])

    const visibleRows = usingTimeWindow ? timeScopedVisible : view.visible
    const isFiltered = !!planetFilter || metric !== 'points'
    const isSearching = searchQuery.trim().length > 0

    const metricLabel = metric === 'reviewsCompleted' ? 'Reviews' : (usingTimeWindow ? 'Submitted' : 'Entries')
    const metricValue = (c) => (isFiltered ? c.viewMetricValue : (c.approvedTotal || 0))

    // Podium only makes sense for a ranked TOP, not an arbitrary search
    // result set -- searching shows a flat table of matches instead, each
    // still carrying its real rank within the current tab/planet view.
    const podiumSource = isSearching ? [] : visibleRows
    const topThree = podiumSource.slice(0, 3)
    const rest = isSearching ? visibleRows : visibleRows.slice(3, visibleCount)
    // "Show more" appears when there's more to reveal from what's already
    // fetched, OR (base view only) the server might have additional pages.
    const canLoadMore = !isSearching && (visibleCount < visibleRows.length || (isBaseView && hasMoreOnServer))

    const resolveAvatar = (contributor) => {
        if (myUserId && contributor.userId === myUserId && myAvatarUrl) {
            return myAvatarUrl
        }
        return contributor.avatarUrl || null
    }

    return (
        <div className={`solar-page obs-page${isDark ? ' obs-page--dark' : ' obs-page--light'}`}>
            <LazyVantaFogBackground
                isDark={isDark}
                entryReveal={sceneReveal}
                className="obs-page__vanta"
            />
            <div
                className="obs-page__veil"
                style={{ opacity: Math.max(0, (isDark ? 0.18 : 0.06) - sceneReveal * (isDark ? 0.14 : 0.05)) }}
                aria-hidden="true"
            />
            <div
                className="obs-page__vignette"
                style={{ opacity: isDark ? 0.28 + sceneReveal * 0.05 : 0.08 + sceneReveal * 0.02 }}
                aria-hidden="true"
            />

            <div className="obs-page__inner obs-page__inner--podium" style={{ opacity: sceneReveal }}>
                <header className="obs-hero obs-hero--compact">
                    <h1 className="obs-hero__title">Top Contributors</h1>
                    <button
                        type="button"
                        className="obs-refresh-btn"
                        onClick={handleRefresh}
                        disabled={refreshing || loadState === 'loading'}
                    >
                        <RefreshCw size={14} className={refreshing ? 'obs-spin' : ''} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </header>

                {loadState === 'loading' && (
                    <p className="obs-podium-cta" role="status" aria-live="polite">Loading rankings…</p>
                )}

                {loadState === 'error' && (
                    <div className="obs-podium-cta" role="alert">
                        <p>Couldn&apos;t load the leaderboard right now.</p>
                        <button type="button" className="obs-refresh-btn" onClick={() => setTick((t) => t + 1)}>
                            Try again
                        </button>
                    </div>
                )}

                {loadState !== 'loading' && loadState !== 'error' && (
                    <>
                        {isPreview && (
                            <p className="obs-podium-cta" role="status">
                                Preview rankings — be the first real contributor to top the board!
                            </p>
                        )}

                        {!isPreview && (
                            <div className="obs-toolbar" role="toolbar" aria-label="Leaderboard filters">
                                <div className="obs-toolbar__tabs" role="tablist" aria-label="Rank by">
                                    {[
                                        { key: 'points', label: 'Top Contributors' },
                                        { key: 'approvedTotal', label: 'Contributors' },
                                        { key: 'reviewsCompleted', label: 'Reviewers' },
                                    ].map((t) => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            role="tab"
                                            aria-selected={metric === t.key}
                                            className="obs-toolbar__tab"
                                            data-active={metric === t.key}
                                            onClick={() => {
                                                setMetric(t.key)
                                                // Time filtering has no meaning on the flat lifetime-points
                                                // metric -- see the timeWindow state comment.
                                                if (t.key === 'points') setTimeWindow('all')
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <label className="obs-toolbar__field" title={usingTimeWindow ? 'Not available with a time window active' : undefined}>
                                    <span className="obs-toolbar__field-label">Hub</span>
                                    <select
                                        value={planetFilter}
                                        onChange={(e) => setPlanetFilter(e.target.value)}
                                        aria-label="Filter by research hub"
                                        disabled={usingTimeWindow}
                                    >
                                        <option value="">All hubs</option>
                                        {availablePlanets.map((p) => (
                                            <option key={p.id} value={String(p.id).toLowerCase()}>{p.planet || p.id}</option>
                                        ))}
                                    </select>
                                </label>

                                <label
                                    className="obs-toolbar__field"
                                    title={metric === 'points' ? 'Not available on Top Contributors — lifetime points have no time history' : undefined}
                                >
                                    <span className="obs-toolbar__field-label">Since</span>
                                    <select
                                        value={timeWindow}
                                        onChange={(e) => setTimeWindow(e.target.value)}
                                        aria-label="Filter by time window"
                                        disabled={metric === 'points'}
                                    >
                                        <option value="all">All time</option>
                                        <option value="7d">Last 7 days</option>
                                        <option value="30d">Last 30 days</option>
                                    </select>
                                </label>

                                <div className="obs-toolbar__search">
                                    <Search size={14} aria-hidden />
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search players…"
                                        aria-label="Search players by username"
                                    />
                                    {searchQuery && (
                                        <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {usingTimeWindow && timeScoped?.loadState === 'loading' && (
                            <p className="obs-podium-cta" role="status" aria-live="polite">Loading…</p>
                        )}

                        {usingTimeWindow && timeScoped?.loadState === 'guest-blocked' && (
                            <p className="obs-podium-cta" role="status">Sign in to see reviewer activity.</p>
                        )}

                        {usingTimeWindow && timeScoped?.loadState === 'error' && (
                            <div className="obs-podium-cta" role="alert">
                                <p>Couldn&apos;t load this view right now.</p>
                                <button type="button" className="obs-refresh-btn" onClick={() => setTimeScopedRetryTick((t) => t + 1)}>
                                    Try again
                                </button>
                            </div>
                        )}

                        {(!usingTimeWindow || timeScoped?.loadState === 'ready') && (
                            <>
                                {!isSearching && (
                                    <section className="obs-podium" aria-label="Top three">
                                        {PODIUM_ORDER.map(({ place, rankIndex }) => (
                                            <PodiumColumn
                                                key={place}
                                                place={place}
                                                contributor={topThree[rankIndex]}
                                                isMe={myUserId && topThree[rankIndex]?.userId === myUserId}
                                                avatarUrl={topThree[rankIndex] ? resolveAvatar(topThree[rankIndex]) : null}
                                                displayValue={topThree[rankIndex] && isFiltered ? topThree[rankIndex].viewMetricValue : undefined}
                                                displaySuffix={topThree[rankIndex] && isFiltered ? metricLabel.toLowerCase() : undefined}
                                            />
                                        ))}
                                    </section>
                                )}

                                {!isPreview && !isFiltered && !isSearching && (
                                    <p className="obs-podium-cta">
                                        Ranked by knowledge points from approved archive contributions.
                                    </p>
                                )}

                                {usingTimeWindow && metric === 'approvedTotal' && !isSearching && (
                                    <p className="obs-podium-cta">
                                        Entries submitted in this window — approval can lag submission, so this
                                        reflects activity, not necessarily points already earned.
                                    </p>
                                )}

                                {isSearching && visibleRows.length === 0 && (
                                    <p className="obs-podium-cta" role="status">No players match &quot;{searchQuery}&quot;.</p>
                                )}

                                <LeaderboardTable
                                    rows={rest}
                                    myUserId={myUserId}
                                    resolveAvatar={resolveAvatar}
                                    metricLabel={metricLabel}
                                    metricValue={metricValue}
                                    rankKey="viewRank"
                                />

                                {canLoadMore && (
                                    <div className="obs-lb-loadmore">
                                        <button
                                            type="button"
                                            className="obs-refresh-btn"
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? 'Loading…' : 'Show more'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
