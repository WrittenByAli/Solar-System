import { listAllProfiles } from './userProfileStorage.js'

/**
 * Rank users for one planet hub by approved submissions (contributors) or grades filed (fact-checkers).
 */
export function rankUsersOnPlanet(planetId, metric) {
    const pid = String(planetId || '').toLowerCase()
    if (!pid) return []
    const profiles = listAllProfiles()
    return profiles
        .map((p) => ({
            username: p.username,
            score:
                metric === 'contributions'
                    ? p.contributionsByPlanet?.[pid] || 0
                    : p.reviewsByPlanet?.[pid] || 0,
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
}

/** @returns {1|2|3|null} honor tier for top-three experts (contributors) on this planet */
export function getExpertHonorRank(username, planetId) {
    const list = rankUsersOnPlanet(planetId, 'contributions')
    const i = list.findIndex((x) => x.username.toLowerCase() === String(username || '').toLowerCase())
    if (i < 0 || i > 2) return null
    return /** @type {const} */ (i + 1)
}

/** @returns {1|2|3|null} honor tier for top-three fact-checkers on this planet */
export function getFactCheckerHonorRank(username, planetId) {
    const list = rankUsersOnPlanet(planetId, 'reviews')
    const i = list.findIndex((x) => x.username.toLowerCase() === String(username || '').toLowerCase())
    if (i < 0 || i > 2) return null
    return /** @type {const} */ (i + 1)
}

export function topThreeOnPlanet(planetId, metric) {
    return rankUsersOnPlanet(planetId, metric).slice(0, 3)
}
