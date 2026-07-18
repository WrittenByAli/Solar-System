import { supabase } from './supabaseClient.js'
import {
  COMMUNITY_REVIEWS_PAGE_SIZE,
  COMMUNITY_REVIEW_SELECT_COLUMNS,
  normalizeCommunityReview,
  sortColumn,
} from './communityReviewHelpers.js'

export * from './communityReviewHelpers.js'

function applyFilters(query, filters = {}) {
  let q = query
  if (filters.planetId && filters.planetId !== 'all') {
    q = q.eq('planet_id', filters.planetId)
  }
  if (filters.difficulty && filters.difficulty !== 'all') {
    q = q.eq('difficulty', Number(filters.difficulty))
  }
  if (filters.reviewerUsername?.trim()) {
    q = q.ilike('reviewer_username', `%${filters.reviewerUsername.trim()}%`)
  }
  const term = filters.search?.trim()
  if (term) {
    const safe = term.replace(/[%_,]/g, ' ')
    q = q.or([
      `entry_title.ilike.%${safe}%`,
      `reviewer_username.ilike.%${safe}%`,
      `notes.ilike.%${safe}%`,
      `planet_id.ilike.%${safe}%`,
    ].join(','))
  }
  return q
}

function applyCursor(query, sort, cursor) {
  if (!cursor?.primary || !cursor?.tie) return query
  const { column, ascending, tie, tieAsc } = sortColumn(sort)
  const opPrimary = ascending ? 'gt' : 'lt'
  const opTie = tieAsc ? 'gt' : 'lt'
  return query.or(
    `${column}.${opPrimary}.${cursor.primary},and(${column}.eq.${cursor.primary},${tie}.${opTie}.${cursor.tie})`,
  )
}

export async function fetchCommunityReviews({
  cursor = null,
  limit = COMMUNITY_REVIEWS_PAGE_SIZE,
  sort = 'newest',
  filters = {},
} = {}) {
  const sortDef = sortColumn(sort)
  let query = supabase
    .from('public_community_reviews')
    .select(COMMUNITY_REVIEW_SELECT_COLUMNS)
    .order(sortDef.column, { ascending: sortDef.ascending })
    .order(sortDef.tie, { ascending: sortDef.tieAsc })
    .limit(limit + 1)

  query = applyFilters(query, filters)
  query = applyCursor(query, sort, cursor)

  const { data, error } = await query
  if (error) return { items: [], error, hasMore: false, nextCursor: null }

  const rows = data || []
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const last = pageRows[pageRows.length - 1]
  const nextCursor = hasMore && last
    ? {
        primary: last[sortDef.column],
        tie: last[sortDef.tie],
      }
    : null

  return {
    items: pageRows.map(normalizeCommunityReview).filter(Boolean),
    error: null,
    hasMore,
    nextCursor,
  }
}
