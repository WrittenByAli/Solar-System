/**
 * Pure derivations for the /profile page. Every figure produced here comes
 * from real rows (archive_entries, reviews, users_profile) — nothing is
 * fabricated. Keep this file free of React/Supabase imports so it stays
 * unit-testable.
 */

const DAY_MS = 86_400_000

export function toDayKey(dateLike) {
    const d = new Date(dateLike)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function keyToUtc(key) {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
}

const byCreatedAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at)
const nth = (sorted, n) => (sorted.length >= n ? sorted[n - 1] : null)

/** Bucket timestamped rows into per-local-day counts. */
export function countByDay(events) {
    const map = {}
    for (const e of events) {
        if (!e?.created_at) continue
        const key = toDayKey(e.created_at)
        map[key] = (map[key] || 0) + 1
    }
    return map
}

/**
 * GitHub-style grid: array of week columns (Sunday-first), ending today.
 * Cells beyond today are marked future so the grid renders a clean edge.
 */
export function buildHeatmapWeeks(dayCounts, weekCount = 26) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today.getTime() - (weekCount * 7 - 1) * DAY_MS)
    start.setDate(start.getDate() - start.getDay())
    const weeks = []
    let cursor = new Date(start)
    while (cursor <= today) {
        const week = []
        for (let i = 0; i < 7; i++) {
            const future = cursor > today
            week.push({
                key: toDayKey(cursor),
                date: new Date(cursor),
                count: future ? 0 : dayCounts[toDayKey(cursor)] || 0,
                future,
            })
            cursor = new Date(cursor.getTime() + DAY_MS)
        }
        weeks.push(week)
    }
    return weeks
}

/** Current streak (ending today or yesterday) + longest ever. */
export function computeStreaks(dayCounts) {
    const days = Object.keys(dayCounts).filter((k) => dayCounts[k] > 0).sort()
    if (days.length === 0) return { current: 0, longest: 0, activeDays: 0 }

    let longest = 1
    let run = 1
    for (let i = 1; i < days.length; i++) {
        run = keyToUtc(days[i]) - keyToUtc(days[i - 1]) === DAY_MS ? run + 1 : 1
        if (run > longest) longest = run
    }

    let current = 0
    let probe = new Date()
    probe.setHours(0, 0, 0, 0)
    if (!dayCounts[toDayKey(probe)]) probe = new Date(probe.getTime() - DAY_MS)
    while (dayCounts[toDayKey(probe)] > 0) {
        current += 1
        probe = new Date(probe.getTime() - DAY_MS)
    }

    return { current, longest, activeDays: days.length }
}

/** Per-week activity counts for the trailing N weeks (oldest → newest). */
export function weeklySeries(events, weekCount = 12) {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const buckets = new Array(weekCount).fill(0)
    for (const e of events) {
        if (!e?.created_at) continue
        const weeksAgo = Math.floor((end.getTime() - new Date(e.created_at).getTime()) / (7 * DAY_MS))
        if (weeksAgo >= 0 && weeksAgo < weekCount) buckets[weekCount - 1 - weeksAgo] += 1
    }
    return buckets
}

/**
 * Achievement definitions with real progress and, where the data allows it,
 * the real earn date (date of the nth qualifying row). Point-threshold
 * badges have no historical record, so their earnedAt stays null and the
 * UI shows "Unlocked" without inventing a date.
 */
export function deriveAchievements({ submissions = [], reviews = [], points = 0, role = 'student', rank = 0, profile = null }) {
    const subsAsc = [...submissions].sort(byCreatedAsc)
    const revsAsc = [...reviews].sort(byCreatedAsc)
    const apprAsc = submissions
        .filter((s) => s.status === 'approved')
        .sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at))
    const isReviewer = role === 'reviewer' || role === 'admin'

    return [
        { id: 'first-light', icon: 'sparkles', rarity: 'common', title: 'First Light', desc: 'Submit your first archive entry', target: 1, progress: Math.min(subsAsc.length, 1), earnedAt: nth(subsAsc, 1)?.created_at ?? null },
        { id: 'fact-checker', icon: 'clipboard', rarity: 'common', title: 'Fact Checker', desc: 'Complete a peer review', target: 1, progress: Math.min(revsAsc.length, 1), earnedAt: nth(revsAsc, 1)?.created_at ?? null },
        { id: 'contributor', icon: 'rocket', rarity: 'rare', title: 'Contributor', desc: 'Submit 5 entries', target: 5, progress: Math.min(subsAsc.length, 5), earnedAt: nth(subsAsc, 5)?.created_at ?? null },
        { id: 'peer-approved', icon: 'check', rarity: 'rare', title: 'Peer Approved', desc: 'Get an entry approved by reviewers', target: 1, progress: Math.min(apprAsc.length, 1), earnedAt: nth(apprAsc, 1)?.updated_at ?? nth(apprAsc, 1)?.created_at ?? null },
        { id: 'rising-star', icon: 'star', rarity: 'rare', title: 'Rising Star', desc: 'Reach 500 contribution points', target: 500, progress: Math.min(points, 500), earnedAt: null },
        { id: 'archivist', icon: 'archive', rarity: 'epic', title: 'Archivist', desc: 'Submit 15 entries', target: 15, progress: Math.min(subsAsc.length, 15), earnedAt: nth(subsAsc, 15)?.created_at ?? null },
        { id: 'historian', icon: 'landmark', rarity: 'epic', title: 'Historian', desc: 'Have 5 entries approved', target: 5, progress: Math.min(apprAsc.length, 5), earnedAt: nth(apprAsc, 5)?.updated_at ?? null },
        { id: 'podium', icon: 'medal', rarity: 'epic', title: 'Podium', desc: 'Reach the leaderboard top 3', target: 1, progress: rank > 0 && rank <= 3 ? 1 : 0, earnedAt: null },
        { id: 'constellation', icon: 'shield', rarity: 'legendary', title: 'Constellation', desc: 'Earn the Reviewer rank', target: 1, progress: isReviewer ? 1 : 0, earnedAt: profile?.reviewer_promoted_at ?? null },
        { id: 'top-reviewer', icon: 'trophy', rarity: 'legendary', title: 'Top Reviewer', desc: 'Complete 25 reviews', target: 25, progress: Math.min(revsAsc.length, 25), earnedAt: nth(revsAsc, 25)?.created_at ?? null },
    ]
}

/** Merged, newest-first event stream: joins, promotions, submissions, approvals, reviews. */
export function buildTimeline({ profile, submissions = [], reviews = [], limit = 12 }) {
    const events = []
    if (profile?.created_at) {
        events.push({ id: 'joined', type: 'joined', at: profile.created_at, title: 'Joined the SOLAR Archive' })
    }
    if (profile?.reviewer_promoted_at) {
        events.push({ id: 'promoted', type: 'promotion', at: profile.reviewer_promoted_at, title: 'Promoted to Reviewer' })
    }
    for (const s of submissions) {
        events.push({ id: `sub-${s.id}`, type: 'submission', at: s.created_at, title: s.title, meta: { status: s.status, layer: s.layer, planetId: s.planet_id } })
        if (s.status === 'approved') {
            events.push({ id: `app-${s.id}`, type: 'approved', at: s.updated_at || s.created_at, title: s.title, meta: { layer: s.layer, planetId: s.planet_id } })
        }
    }
    for (const r of reviews) {
        events.push({
            id: `rev-${r.id}`,
            type: 'review',
            at: r.created_at,
            title: r.fact_check_pass ? 'Passed an entry in peer review' : 'Flagged an entry in peer review',
            meta: { pass: r.fact_check_pass },
        })
    }
    return events
        .filter((e) => e.at)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, limit)
}

/** Most-contributed-to hubs, by total submissions then name. */
export function favoritePlanets(submissions = [], max = 4) {
    const counts = {}
    for (const s of submissions) {
        const pid = String(s.planet_id || '').toLowerCase()
        if (!pid) continue
        if (!counts[pid]) counts[pid] = { planetId: pid, total: 0, approved: 0 }
        counts[pid].total += 1
        if (s.status === 'approved') counts[pid].approved += 1
    }
    return Object.values(counts)
        .sort((a, b) => b.total - a.total || a.planetId.localeCompare(b.planetId))
        .slice(0, max)
}
