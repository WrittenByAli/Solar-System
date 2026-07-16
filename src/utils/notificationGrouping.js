/**
 * Pure date-bucketing for the notification dropdown. Buckets are computed
 * against LOCAL time (the browser's own timezone) -- `created_at` is stored
 * as `timestamp with time zone` in Postgres (verified against the live
 * schema), so the UTC->local conversion `new Date(iso)` performs is
 * correct and unambiguous; there is no separate timezone bug to fix here,
 * only display-time bucketing to add.
 */
const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function bucketLabel(iso, now = new Date()) {
    const then = new Date(iso)
    if (Number.isNaN(then.getTime())) return 'Earlier'

    const todayStart = startOfDay(now)
    const thenStart = startOfDay(then)
    const daysAgo = Math.round((todayStart - thenStart) / DAY_MS)

    if (daysAgo <= 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    if (daysAgo <= 6) return 'Earlier this week'
    if (daysAgo <= 13) return 'Last week'
    return 'Earlier'
}

const BUCKET_ORDER = ['Today', 'Yesterday', 'Earlier this week', 'Last week', 'Earlier']

/** Groups already-sorted (newest-first) rows into ordered [label, rows[]] buckets. */
export function groupByRecency(items, now = new Date()) {
    const buckets = new Map()
    for (const item of items) {
        const label = bucketLabel(item.created_at, now)
        if (!buckets.has(label)) buckets.set(label, [])
        buckets.get(label).push(item)
    }
    return BUCKET_ORDER.filter((label) => buckets.has(label)).map((label) => [label, buckets.get(label)])
}

export function relativeTime(iso, now = Date.now()) {
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return ''
    const diffMs = Math.max(0, now - then)
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return then ? new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
}
