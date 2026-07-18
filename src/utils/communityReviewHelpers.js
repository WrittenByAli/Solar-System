import { DEFAULT_HUBS } from './defaultHubs.js'
import { POINTS_PER_REVIEW_COMPLETED } from '../constants/reviewWorkflow.js'

export const COMMUNITY_REVIEWS_PAGE_SIZE = 20

export const COMMUNITY_REVIEW_SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'most_helpful', label: 'Most helpful' },
  { id: 'highest_quality', label: 'Highest quality' },
  { id: 'highest_difficulty', label: 'Highest difficulty' },
  { id: 'trending', label: 'Trending' },
]

const HUB_BY_ID = new Map(DEFAULT_HUBS.map((h) => [h.id, h]))

export const REVIEWER_RANKS = [
  { name: 'Reviewer I', min: 0, max: 200, color: '#94a3b8' },
  { name: 'Reviewer II', min: 200, max: 500, color: '#34d399' },
  { name: 'Citation Analyst', min: 500, max: 1200, color: '#0ea5e9' },
  { name: 'Archive Validator', min: 1200, max: 3000, color: '#a78bfa' },
  { name: 'Senior Reviewer', min: 3000, max: 6000, color: '#f5a623' },
  { name: 'Lead Reviewer', min: 6000, max: Infinity, color: '#ff6b35' },
]

export function formatReviewerName(username) {
  return (username || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function reviewerRankFromPoints(points) {
  const pts = Number(points) || 0
  return REVIEWER_RANKS.find((r) => pts >= r.min && pts < r.max) || REVIEWER_RANKS[0]
}

export function reviewerRoleLabel(role, points) {
  if (role === 'admin') return 'Admin Reviewer'
  if (role === 'reviewer') return reviewerRankFromPoints(points).name
  return 'Community Reviewer'
}

export function qualityToStars(qualityScore, difficulty, factCheckPass) {
  const base = Number(qualityScore)
  const score = Number.isFinite(base)
    ? base
    : (factCheckPass ? 10 : 4) + (Number(difficulty) || 3)
  return Math.max(1, Math.min(5, Math.round((score / 15) * 5)))
}

export function hubMeta(planetId) {
  const hub = HUB_BY_ID.get(String(planetId || '').toLowerCase())
  return {
    planetId: hub?.id || planetId || 'unknown',
    planetName: hub?.name || String(planetId || 'Unknown'),
    hubName: hub?.description || hub?.name || String(planetId || 'Unknown'),
  }
}

export function formatCoord(x, y) {
  const pad = (n) => {
    const v = Math.abs(Number(n) || 0)
    const sign = Number(n) < 0 ? '-' : ''
    return `${sign}${String(v).padStart(4, '0')}`
  }
  return `${pad(x)}, ${pad(y)}`
}

export function normalizeCommunityReview(row) {
  if (!row) return null
  const { planetName, hubName } = hubMeta(row.planet_id)
  const points = Number(row.reviewer_points) || 0
  const rank = reviewerRankFromPoints(points)
  return {
    id: row.review_id,
    entryId: row.entry_id,
    reviewerId: row.reviewer_id,
    reviewer: row.reviewer_username,
    reviewerUsername: row.reviewer_username,
    reviewerAvatarUrl: row.reviewer_avatar_url || null,
    reviewerPoints: points,
    reviewerRole: row.reviewer_role || 'student',
    rank: reviewerRoleLabel(row.reviewer_role, points),
    rankColor: rank.color,
    notes: row.notes || 'Verified citations and coordinate placement for this archive entry.',
    factCheckPass: !!row.fact_check_pass,
    difficulty: Number(row.difficulty) || 1,
    qualityScore: Number(row.quality_score) || 0,
    helpfulScore: Number(row.helpful_score) || 0,
    trendingScore: Number(row.trending_score) || 0,
    pointsEarned: Number(row.reviewer_points_earned) || POINTS_PER_REVIEW_COMPLETED,
    status: 'approved',
    date: row.review_created_at,
    title: row.entry_title || 'Archive entry',
    planetId: row.planet_id,
    planet: planetName,
    hub: hubName,
    layer: row.layer ? `L${row.layer}` : 'L4',
    coord: formatCoord(row.coord_x, row.coord_y),
    stars: qualityToStars(row.quality_score, row.difficulty, row.fact_check_pass),
  }
}

export function mergeUniqueReviews(existing, incoming) {
  const seen = new Set(existing.map((r) => r.id))
  const merged = [...existing]
  for (const row of incoming) {
    if (!seen.has(row.id)) {
      seen.add(row.id)
      merged.unshift(row)
    }
  }
  return merged
}

export function planetFilterOptions() {
  return [{ id: 'all', label: 'All planets' }, ...DEFAULT_HUBS.map((h) => ({
    id: h.id,
    label: h.name,
  }))]
}

export function difficultyFilterOptions() {
  return [
    { id: 'all', label: 'All levels' },
    ...[1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `Level ${n}` })),
  ]
}

export function sortColumn(sortId) {
  switch (sortId) {
    case 'oldest': return { column: 'review_created_at', ascending: true, tie: 'review_id', tieAsc: true }
    case 'most_helpful': return { column: 'helpful_score', ascending: false, tie: 'review_created_at', tieAsc: false }
    case 'highest_quality': return { column: 'quality_score', ascending: false, tie: 'review_created_at', tieAsc: false }
    case 'highest_difficulty': return { column: 'difficulty', ascending: false, tie: 'review_created_at', tieAsc: false }
    case 'trending': return { column: 'trending_score', ascending: false, tie: 'review_created_at', tieAsc: false }
    case 'newest':
    default:
      return { column: 'review_created_at', ascending: false, tie: 'review_id', tieAsc: false }
  }
}

export const COMMUNITY_REVIEW_SELECT_COLUMNS = [
  'review_id',
  'entry_id',
  'reviewer_id',
  'fact_check_pass',
  'difficulty',
  'notes',
  'review_created_at',
  'entry_title',
  'planet_id',
  'layer',
  'coord_x',
  'coord_y',
  'entry_status',
  'reviewer_username',
  'reviewer_avatar_url',
  'reviewer_points',
  'reviewer_role',
  'quality_score',
  'reviewer_points_earned',
  'helpful_score',
  'trending_score',
].join(',')
