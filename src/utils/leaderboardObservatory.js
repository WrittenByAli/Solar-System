/**
 * Pure derivations for the Celestial Observatory leaderboard.
 * Transforms leaderboard_view rows into visual + narrative models.
 */

export const GALAXY_TIERS = [
    { id: 'nebula', name: 'Nebula Explorer', minPoints: 0, hue: 220, accent: '#7dd3fc' },
    { id: 'planetary', name: 'Planetary Scholar', minPoints: 500, hue: 200, accent: '#93c5fd' },
    { id: 'solar', name: 'Solar Researcher', minPoints: 1500, hue: 42, accent: '#fcd34d' },
    { id: 'galactic', name: 'Galactic Curator', minPoints: 3500, hue: 280, accent: '#c4b5fd' },
    { id: 'stellar', name: 'Stellar Archivist', minPoints: 6000, hue: 260, accent: '#a78bfa' },
    { id: 'constellation', name: 'Constellation Keeper', minPoints: 10000, hue: 320, accent: '#f0abfc' },
    { id: 'cosmic', name: 'Cosmic Historian', minPoints: 15000, hue: 30, accent: '#fdba74' },
    { id: 'universal', name: 'Universal Guardian', minPoints: 25000, hue: 48, accent: '#fde68a' },
]

/** Orion-inspired slots (% of observatory viewBox) for top 10 */
export const CONSTELLATION_SLOTS = [
    { x: 50, y: 18 },
    { x: 36, y: 8 },
    { x: 64, y: 7 },
    { x: 28, y: 20 },
    { x: 72, y: 19 },
    { x: 42, y: 27 },
    { x: 58, y: 28 },
    { x: 22, y: 36 },
    { x: 78, y: 35 },
    { x: 50, y: 40 },
]

export const CONSTELLATION_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [0, 6], [5, 7], [6, 8], [5, 6], [7, 9], [8, 9],
]

const PLANET_NAMES = {
    sun: 'Sun Hub', earth: 'Earth Hub', mars: 'Mars Hub', venus: 'Venus Hub',
    mercury: 'Mercury Hub', jupiter: 'Jupiter Hub', saturn: 'Saturn Hub',
    neptune: 'Neptune Hub', uranus: 'Uranus Hub',
}

function stableSeed(str) {
    let h = 0
    for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
    return Math.abs(h)
}

export function getGalaxyTier(points) {
    const pts = points || 0
    let tier = GALAXY_TIERS[0]
    for (const t of GALAXY_TIERS) {
        if (pts >= t.minPoints) tier = t
    }
    const idx = GALAXY_TIERS.indexOf(tier)
    const next = GALAXY_TIERS[idx + 1] || null
    const progress = next
        ? (pts - tier.minPoints) / (next.minPoints - tier.minPoints)
        : 1
    return { ...tier, index: idx, next, progress: Math.min(1, Math.max(0, progress)) }
}

export function getGalaxyLevel(points) {
    return getGalaxyTier(points).index + 1
}

/** Planet appearance scales with rank and points */
export function getPlanetVisuals(rank, points, totalProfiles = 100) {
    const r = rank || totalProfiles
    const t = Math.min(1, (r - 1) / Math.max(1, totalProfiles - 1))
    const ptsNorm = Math.min(1, (points || 0) / 25000)
    const isGasGiant = r <= 3 || ptsNorm > 0.7
    const size = Math.round(28 + (1 - t) * 52 + ptsNorm * 12)
    const ringCount = Math.min(4, Math.floor((1 - t) * 3 + ptsNorm * 2))
    const moonCount = Math.min(6, Math.floor(ptsNorm * 4 + (1 - t) * 2))
    const atmosphere = 0.35 + (1 - t) * 0.45 + ptsNorm * 0.2
    const glow = 0.4 + (1 - t) * 0.5 + (r === 1 ? 0.3 : 0)
    const hue = isGasGiant ? 210 + stableSeed(String(rank)) % 40 : 18 + stableSeed(String(rank)) % 30
    const saturation = isGasGiant ? 55 + ptsNorm * 25 : 65 + ptsNorm * 20
    const lightness = isGasGiant ? 48 + (1 - t) * 12 : 42 + (1 - t) * 18
    return {
        size,
        ringCount,
        moonCount,
        atmosphere: Math.min(1, atmosphere),
        glow: Math.min(1, glow),
        type: isGasGiant ? 'gas' : 'rocky',
        color: `hsl(${hue} ${saturation}% ${lightness}%)`,
        ringColor: `hsla(${hue}, ${saturation}%, 72%, 0.45)`,
        cloudOpacity: 0.15 + atmosphere * 0.35,
    }
}

export function topPlanetHub(profile, planets = []) {
    const byPlanet = profile.contributionsByPlanet || profile.approved_by_planet || {}
    let best = null
    let bestScore = 0
    for (const [pid, count] of Object.entries(byPlanet)) {
        if (count > bestScore) {
            bestScore = count
            best = pid
        }
    }
    if (!best && profile.reviewsByPlanet) {
        for (const [pid, count] of Object.entries(profile.reviewsByPlanet)) {
            if (count > bestScore) {
                bestScore = count
                best = pid
            }
        }
    }
    const planet = planets.find((p) => String(p.id).toLowerCase() === String(best || '').toLowerCase())
    return {
        id: best || planets[0]?.id || 'mercury',
        label: planet?.planet ? `${planet.planet} Hub` : PLANET_NAMES[best] || 'Mercury Hub',
    }
}

export function deriveReputation(profile) {
    const reviews = profile.reviewsCompleted || 0
    const approved = profile.approvedTotal
        ?? Object.values(profile.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
    const layers = Object.keys(profile.approvedByLayer || {}).filter((k) => (profile.approvedByLayer[k] || 0) > 0).length
    const hubs = Object.keys(profile.contributionsByPlanet || {}).filter((k) => (profile.contributionsByPlanet[k] || 0) > 0).length
    const seed = stableSeed(profile.username) % 7
    const clamp = (v) => Math.min(5, Math.max(1, Math.round(v * 10) / 10))

    const accuracy = clamp(3.2 + Math.min(1.6, reviews * 0.04) + (approved > 0 ? 0.4 : 0))
    const speed = clamp(3 + Math.min(2, reviews * 0.06) + seed * 0.05)
    const depth = clamp(2.5 + Math.min(2.2, layers * 0.45 + hubs * 0.2))
    const trust = clamp(3.5 + Math.min(1.4, (profile.points || 0) / 8000) + Math.min(0.5, reviews * 0.02))

    return { accuracy, speed, depth, trust }
}

export function deriveStreak(profile) {
    const reviews = profile.reviewsCompleted || 0
    const approved = profile.approvedTotal
        ?? Object.values(profile.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
    return Math.max(0, Math.min(90, Math.floor((reviews + approved) / 3) + (stableSeed(profile.username) % 5)))
}

export function deriveTimeline(profile, rank) {
    const tier = getGalaxyTier(profile.points)
    const hub = topPlanetHub(profile)
    const approved = profile.approvedTotal
        ?? Object.values(profile.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
    const events = []
    if (approved > 0) {
        events.push({ year: '2025', label: `Published ${approved} archive ${approved === 1 ? 'entry' : 'entries'}` })
    }
    if (profile.reviewsCompleted > 0) {
        events.push({ year: '2025', label: `Reviewed ${profile.reviewsCompleted} pending submissions` })
    }
    if (hub.label) {
        events.push({ year: '2025', label: `Primary orbit · ${hub.label}` })
    }
    if (tier.index >= 3) {
        events.push({ year: '2025', label: `Earned ${tier.name}` })
    }
    if (rank && rank <= 20) {
        events.push({ year: '2025', label: `Reached Top ${rank}` })
    }
    return events.slice(0, 6)
}

export function deriveInfluenceChain(profile, planets = []) {
    const byPlanet = { ...profile.contributionsByPlanet, ...profile.reviewsByPlanet }
    const sorted = Object.entries(byPlanet || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pid]) => {
            const p = planets.find((pl) => String(pl.id).toLowerCase() === pid.toLowerCase())
            return p?.planet ? `${p.planet} Hub` : PLANET_NAMES[pid] || pid
        })
    if (sorted.length === 0) return ['Your work', 'Archive Core']
    return ['Your work', ...sorted]
}

export function deriveDiscoveries(profile, planets = []) {
    const discoveries = []
    const reviews = profile.reviewsCompleted || 0
    const approved = profile.approvedTotal
        ?? Object.values(profile.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
    const hubCount = new Set([
        ...Object.keys(profile.contributionsByPlanet || {}).filter((k) => profile.contributionsByPlanet[k] > 0),
        ...Object.keys(profile.reviewsByPlanet || {}).filter((k) => profile.reviewsByPlanet[k] > 0),
    ]).size
    const layerCount = Object.keys(profile.approvedByLayer || {}).filter((k) => (profile.approvedByLayer[k] || 0) > 0).length
    const rep = deriveReputation(profile)

    if (reviews >= 5 && hubCount >= 1) {
        discoveries.push({ id: 'first-reviewer', title: 'Hub Sentinel', detail: 'Early reviewer activity in active hubs' })
    }
    if (rep.accuracy >= 4.5 && reviews >= 20) {
        discoveries.push({ id: 'accuracy', title: 'Precision Orbit', detail: 'Sustained high approval accuracy' })
    }
    if (hubCount >= Math.min(10, planets.length)) {
        discoveries.push({ id: 'all-hubs', title: 'Galactic Traverse', detail: 'Contributed across every research hub' })
    }
    if (layerCount >= 5) {
        discoveries.push({ id: 'layers', title: 'Depth Cartographer', detail: 'Published across multiple archive layers' })
    }
    if (approved >= 10 && (profile.points || 0) >= 2000) {
        discoveries.push({ id: 'cited', title: 'Influence Node', detail: 'Work propagating through hub networks' })
    }
    return discoveries
}

/** Connect users who share hub activity (reviews or contributions) */
export function buildCollaborationEdges(profiles, limit = 8) {
    const top = profiles.slice(0, limit)
    const edges = []
    for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
            const a = top[i]
            const b = top[j]
            const hubsA = new Set([
                ...Object.keys(a.contributionsByPlanet || {}).filter((k) => a.contributionsByPlanet[k] > 0),
                ...Object.keys(a.reviewsByPlanet || {}).filter((k) => a.reviewsByPlanet[k] > 0),
            ])
            const shared = Object.keys(b.contributionsByPlanet || {}).filter((k) => hubsA.has(k) && b.contributionsByPlanet[k] > 0)
                .concat(Object.keys(b.reviewsByPlanet || {}).filter((k) => hubsA.has(k) && b.reviewsByPlanet[k] > 0))
            if (shared.length > 0) {
                edges.push({ from: a.username, to: b.username, strength: Math.min(3, shared.length) })
            }
        }
    }
    return edges.slice(0, 12)
}

export function scatterStarPosition(username, index, isConstellation) {
    if (isConstellation) return CONSTELLATION_SLOTS[index] || CONSTELLATION_SLOTS[9]
    const seed = stableSeed(username)
    return {
        x: 4 + (seed % 920) / 10,
        y: 4 + ((seed >> 4) % 360) / 10,
    }
}

export function enrichContributor(profile, rank, totalCount, planets = []) {
    const tier = getGalaxyTier(profile.points)
    const approved = profile.approvedTotal
        ?? Object.values(profile.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)
    return {
        ...profile,
        rank,
        approvedTotal: approved,
        tier,
        level: tier.index + 1,
        planetVisuals: getPlanetVisuals(rank, profile.points, totalCount),
        hub: topPlanetHub(profile, planets),
        reputation: deriveReputation(profile),
        streak: deriveStreak(profile),
        timeline: deriveTimeline(profile, rank),
        influence: deriveInfluenceChain(profile, planets),
        discoveries: deriveDiscoveries(profile, planets),
        brightness: rank === 1 ? 1 : Math.max(0.25, 1 - (rank - 1) * 0.07),
    }
}

export function buildObservatoryModel(profiles, planets = []) {
    // Tie-break MUST stay byte-for-byte identical to leaderboard_view's own
    // `row_number() OVER (ORDER BY up.points DESC, up.username)` (see the
    // materialized view definition, migration
    // leaderboard_materialized_view_and_cron). Leaderboard.jsx discards the
    // DB's own `rank` column and recomputes it here instead -- this is the
    // ONLY reason that's still correct today. Changing either comparator
    // without the other will silently desync the displayed rank from the
    // database's rank. DEMO_PROFILES (the empty-leaderboard preview, which
    // has no `rank` field at all) is why this can't simply be replaced with
    // "trust the DB's rank" -- this function has to work for both shapes.
    const ranked = [...profiles].sort((a, b) => (b.points || 0) - (a.points || 0) || a.username.localeCompare(b.username))
    const contributors = ranked.map((p, i) => enrichContributor(p, i + 1, ranked.length, planets))
    const stars = contributors.map((c, i) => ({
        ...c,
        position: scatterStarPosition(c.username, i, i < 10),
        inConstellation: i < 10,
    }))
    const top10 = stars.slice(0, 10)
    return {
        contributors,
        stars,
        top10,
        constellationEdges: CONSTELLATION_EDGES,
        collaborationEdges: buildCollaborationEdges(contributors),
        aggregate: {
            totalPoints: ranked.reduce((s, p) => s + (p.points || 0), 0),
            totalReviews: ranked.reduce((s, p) => s + (p.reviewsCompleted || 0), 0),
            totalApproved: ranked.reduce((s, p) => s + (p.approvedTotal ?? Object.values(p.contributionsByPlanet || {}).reduce((a, n) => a + n, 0)), 0),
            profileCount: ranked.length,
        },
    }
}

/**
 * Re-rank an already-enriched contributor list for the leaderboard toolbar
 * (search / planet filter / reviewer-vs-contributor tabs). Operates on
 * buildObservatoryModel's output, not raw profiles, so every visual field
 * (tier, planetVisuals, etc.) survives.
 *
 * Rank is recomputed relative to the CURRENT view (e.g. "Reviewers · Earth"
 * shows ranks 1..N within that scoped list), not the all-time points rank
 * carried over from buildObservatoryModel -- that matches how every
 * mode/filter-combo leaderboard actually behaves elsewhere (a per-view
 * ranking, not a fixed global one reused everywhere).
 *
 * `metric` picks both the sort key AND, when a planetId is given, which
 * per-planet jsonb breakdown to filter/sort by -- there is no "points
 * earned in this planet" figure (points are a single flat total with no
 * per-planet breakdown), so a planet filter under the default 'points'
 * metric filters to participants in that hub but still sorts/displays their
 * real total points, rather than fabricating a per-planet points number.
 */
export function applyLeaderboardView(contributors, { metric = 'points', planetId = null, searchQuery = '' } = {}) {
    let scoped = contributors

    if (planetId) {
        const byPlanetKey = metric === 'reviewsCompleted' ? 'reviewsByPlanet' : 'contributionsByPlanet'
        scoped = scoped.filter((c) => {
            const own = (c.contributionsByPlanet || {})[planetId] > 0
            const reviewed = (c.reviewsByPlanet || {})[planetId] > 0
            if (metric === 'points') return own || reviewed // default metric: show any participant in this hub
            return (c[byPlanetKey] || {})[planetId] > 0
        })
    }

    const metricValue = (c) => {
        if (metric === 'points') return c.points || 0
        if (planetId) {
            const byPlanetKey = metric === 'reviewsCompleted' ? 'reviewsByPlanet' : 'contributionsByPlanet'
            return (c[byPlanetKey] || {})[planetId] || 0
        }
        return c[metric] || 0
    }

    const ranked = [...scoped]
        .sort((a, b) => metricValue(b) - metricValue(a) || a.username.localeCompare(b.username))
        .map((c, i) => ({ ...c, viewRank: i + 1, viewMetricValue: metricValue(c) }))

    const q = searchQuery.trim().toLowerCase()
    const visible = q ? ranked.filter((c) => c.username.toLowerCase().includes(q)) : ranked

    return { ranked, visible }
}

export function getWeeklyMission(approvedCount, reviewCount) {
    const targetEntries = 50
    const targetReviews = 200
    const entryProgress = Math.min(1, approvedCount / targetEntries)
    const reviewProgress = Math.min(1, reviewCount / targetReviews)
    return {
        title: 'Map 50 new Solar Physics entries',
        subtitle: 'Community trajectory toward the Sun hub archive',
        entryTarget: targetEntries,
        reviewTarget: targetReviews,
        entryProgress,
        reviewProgress,
        activePhase: entryProgress < 1 ? 'entries' : 'reviews',
    }
}

export function getHallOfFame(contributors) {
    const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
    return {
        month,
        monuments: contributors.slice(0, 5).map((c) => ({
            userId: c.userId,
            username: c.username,
            rank: c.rank,
            points: c.points,
            tier: c.tier.name,
            planetVisuals: c.planetVisuals,
        })),
    }
}

export function findContributorRank(contributors, username) {
    if (!username) return null
    const c = contributors.find((p) => p.username === username)
    return c ? { rank: c.rank, points: c.points, delta: stableSeed(username) % 12 } : null
}

export function orbitSpeed(metric, max = 100) {
    return 8 + Math.min(24, (metric / Math.max(1, max)) * 20)
}
