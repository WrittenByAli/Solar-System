import {
    NEW_ACCOUNT_STARTER_POINTS,
    POINTS_AUTHOR_ON_APPROVAL,
    POINTS_PER_REVIEW_COMPLETED,
} from '../constants/reviewWorkflow.js'

const LS_PROFILE_PREFIX = 'solarArchiveUserProfile:'

function key(username) {
    return `${LS_PROFILE_PREFIX}${String(username).toLowerCase()}`
}

function normalizePlanetCounts(raw) {
    if (!raw || typeof raw !== 'object') return {}
    const out = {}
    for (const [k, v] of Object.entries(raw)) {
        const pid = String(k).toLowerCase()
        const n = typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
        if (n > 0) out[pid] = n
    }
    return out
}

/** All user profiles stored in this browser (for local demo leaderboards). */
export function listAllProfiles() {
    const out = []
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (!k || !k.startsWith(LS_PROFILE_PREFIX)) continue
            const username = k.slice(LS_PROFILE_PREFIX.length)
            const p = loadUserProfile(username)
            if (p) out.push(p)
        }
    } catch {
        /* ignore */
    }
    return out
}

export function loadUserProfile(username) {
    if (!username) return null
    try {
        const raw = localStorage.getItem(key(username))
        if (!raw) return null
        const p = JSON.parse(raw)
        return {
            username: p.username || username,
            email: p.email || '',
            points: typeof p.points === 'number' ? p.points : NEW_ACCOUNT_STARTER_POINTS,
            reviewsCompleted: typeof p.reviewsCompleted === 'number' ? p.reviewsCompleted : 0,
            contributionsByPlanet: normalizePlanetCounts(p.contributionsByPlanet),
            reviewsByPlanet: normalizePlanetCounts(p.reviewsByPlanet),
        }
    } catch {
        return null
    }
}

export function saveUserProfile(profile) {
    if (!profile?.username) return
    localStorage.setItem(key(profile.username), JSON.stringify(profile))
    window.dispatchEvent(new Event('solar-archive-profile-updated'))
}

export function upsertUserProfile(partial) {
    const username = partial.username
    if (!username) return null
    const prev = loadUserProfile(username) || {
        username,
        email: partial.email || '',
        points: NEW_ACCOUNT_STARTER_POINTS,
        reviewsCompleted: 0,
        contributionsByPlanet: {},
        reviewsByPlanet: {},
    }
    const next = {
        ...prev,
        ...partial,
        username: prev.username,
        contributionsByPlanet: normalizePlanetCounts(partial.contributionsByPlanet ?? prev.contributionsByPlanet),
        reviewsByPlanet: normalizePlanetCounts(partial.reviewsByPlanet ?? prev.reviewsByPlanet),
    }
    saveUserProfile(next)
    return next
}

export function addPointsToUser(username, delta) {
    const p = loadUserProfile(username)
    if (!p) return null
    const next = { ...p, points: Math.max(0, p.points + delta) }
    saveUserProfile(next)
    return next
}

export function incrementReviewerStats(username, planetId, factCheckPass = true) {
    const p = loadUserProfile(username)
    if (!p) return null
    const pid = String(planetId || '').toLowerCase()
    const prevR = p.reviewsByPlanet?.[pid] || 0
    const reviewsByPlanet =
        factCheckPass && pid
            ? { ...(p.reviewsByPlanet || {}), [pid]: prevR + 1 }
            : { ...(p.reviewsByPlanet || {}) }
    const next = {
        ...p,
        points: p.points + POINTS_PER_REVIEW_COMPLETED,
        reviewsCompleted: (p.reviewsCompleted || 0) + 1,
        reviewsByPlanet,
    }
    saveUserProfile(next)
    return next
}

export function rewardAuthorOnApproval(authorUsername, planetId) {
    if (!authorUsername || authorUsername === 'legacy_contributor') return
    let p = loadUserProfile(authorUsername)
    if (!p) {
        p = upsertUserProfile({
            username: authorUsername,
            email: '',
            points: NEW_ACCOUNT_STARTER_POINTS,
            reviewsCompleted: 0,
            contributionsByPlanet: {},
            reviewsByPlanet: {},
        })
    }
    const pid = String(planetId || '').toLowerCase()
    const prevC = p.contributionsByPlanet?.[pid] || 0
    const contributionsByPlanet = { ...(p.contributionsByPlanet || {}), [pid]: prevC + 1 }
    const withPoints = { ...p, points: p.points + POINTS_AUTHOR_ON_APPROVAL, contributionsByPlanet }
    saveUserProfile(withPoints)
    return withPoints
}
