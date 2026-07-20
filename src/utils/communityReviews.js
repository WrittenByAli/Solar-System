import { supabase } from './supabaseClient.js'
import {
  COMMUNITY_REVIEWS_PAGE_SIZE,
  COMMUNITY_REVIEW_SELECT_COLUMNS,
  normalizeCommunityReview,
  sortColumn,
} from './communityReviewHelpers.js'

export * from './communityReviewHelpers.js'

// PostgREST `.or()` takes a RAW filter string with no parameterization, so
// any user/client value interpolated into it must be neutralized by hand.
// Within an `ilike.%value%` term PostgREST reads the value until the next
// unescaped `,` or `)`, and `(` opens a logical group — so `,` `(` `)` are
// the structural break-out characters and MUST be stripped. `%` and `_` are
// ilike wildcards (strip so a literal search doesn't silently wildcard), and
// `\` is the escape char. `.` is intentionally KEPT so legitimate searches
// like "U.S." survive — it is not structural once we're past `column.ilike.`.
// NOTE: even a successful break-out here is bounded to columns of the
// public_community_reviews VIEW (approved, already-public review data) — it
// cannot pivot to another table or add query params — so this is
// defense-in-depth against malformed-query 400s, not a data-exfil fix.
const OR_FILTER_UNSAFE_RE = /[%_,()\\]/g

function sanitizeOrValue(raw) {
  return String(raw ?? '').replace(OR_FILTER_UNSAFE_RE, ' ')
}

function applyFilters(query, filters = {}) {
  let q = query
  if (filters.planetId && filters.planetId !== 'all') {
    q = q.eq('planet_id', filters.planetId)
  }
  if (filters.difficulty && filters.difficulty !== 'all') {
    q = q.eq('difficulty', Number(filters.difficulty))
  }
  if (filters.reviewerUsername?.trim()) {
    // .ilike() escapes its own value (supabase-js encodes it as a discrete
    // query param, not an .or() string), so no manual sanitization needed here.
    q = q.ilike('reviewer_username', `%${filters.reviewerUsername.trim()}%`)
  }
  const term = filters.search?.trim()
  if (term) {
    const safe = sanitizeOrValue(term)
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
  // cursor values originate from a prior result row but arrive back through
  // the client and are therefore untrusted — sanitize them exactly like the
  // search term before interpolating into the raw .or() string.
  const primary = sanitizeOrValue(cursor.primary)
  const tieVal = sanitizeOrValue(cursor.tie)
  return query.or(
    `${column}.${opPrimary}.${primary},and(${column}.eq.${primary},${tie}.${opTie}.${tieVal})`,
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
