export const MOCK_QUEUE_ENTRY = {
  id: 'e2e-entry-001',
  title: 'Newtonian Mechanics — Force Vectors',
  status: 'pending',
  is_draft: false,
  deleted_at: null,
  submitted_by: 'other-user-id',
  planet_id: 'sun',
  layer: 4,
  coord_x: 12,
  coord_y: 88,
  short_summary: 'An overview of force vectors in classical mechanics.',
  content: 'Detailed exposition of Newton\'s second law applied to coordinate grid entries.',
  difficulty: 3,
  tags: ['physics', 'mechanics'],
  created_at: new Date().toISOString(),
  updates_entry_id: null,
  segments: [
    { title: 'Forces', body: 'Force is a vector quantity.' },
    { title: 'Acceleration', body: 'F = ma relates force and acceleration.' },
  ],
}

export const MOCK_COMMUNITY_REVIEWS = [
  {
    review_id: 'rev-e2e-001',
    entry_id: 'entry-e2e-001',
    reviewer_id: 'e2e-profile-uuid',
    fact_check_pass: true,
    difficulty: 3,
    notes: 'Strong citation trail and accurate coordinate placement on the Sun hub grid.',
    review_created_at: '2026-07-10T14:22:00.000Z',
    entry_title: 'Newtonian Mechanics — Force Vectors',
    planet_id: 'sun',
    layer: 4,
    coord_x: 12,
    coord_y: 88,
    entry_status: 'approved',
    reviewer_username: 'e2e_reviewer',
    reviewer_avatar_url: null,
    reviewer_points: 1200,
    reviewer_role: 'reviewer',
    quality_score: 13,
    reviewer_points_earned: 85,
    helpful_score: 15.6,
    trending_score: 11.2,
  },
  {
    review_id: 'rev-e2e-002',
    entry_id: 'entry-e2e-002',
    reviewer_id: 'other-reviewer-uuid',
    fact_check_pass: true,
    difficulty: 5,
    notes: 'Excellent applied technology write-up with verifiable sources.',
    review_created_at: '2026-07-08T09:10:00.000Z',
    entry_title: 'Mars Rover Telemetry Pipelines',
    planet_id: 'mars',
    layer: 5,
    coord_x: 44,
    coord_y: 120,
    entry_status: 'approved',
    reviewer_username: 'mars_validator',
    reviewer_avatar_url: null,
    reviewer_points: 3400,
    reviewer_role: 'reviewer',
    quality_score: 15,
    reviewer_points_earned: 85,
    helpful_score: 18,
    trending_score: 9.4,
  },
  {
    review_id: 'rev-e2e-003',
    entry_id: 'entry-e2e-003',
    reviewer_id: 'e2e-profile-uuid',
    fact_check_pass: false,
    difficulty: 2,
    notes: 'Coordinate drift noted near sector boundary; citations otherwise solid.',
    review_created_at: '2026-07-01T18:45:00.000Z',
    entry_title: 'Thermodynamics Primer',
    planet_id: 'sun',
    layer: 4,
    coord_x: 8,
    coord_y: 52,
    entry_status: 'approved',
    reviewer_username: 'e2e_reviewer',
    reviewer_avatar_url: null,
    reviewer_points: 1200,
    reviewer_role: 'reviewer',
    quality_score: 6,
    reviewer_points_earned: 85,
    helpful_score: 5.1,
    trending_score: 3.8,
  },
]

function parsePostgrestFilters(url) {
  const params = new URL(url).searchParams
  const filters = {
    planetId: null,
    difficulty: null,
    reviewerUsername: null,
    search: null,
    limit: 21,
  }

  for (const [key, value] of params.entries()) {
    if (key === 'planet_id' && value.startsWith('eq.')) {
      filters.planetId = value.slice(3)
    } else if (key === 'difficulty' && value.startsWith('eq.')) {
      filters.difficulty = Number(value.slice(3))
    } else if (key === 'reviewer_username' && value.startsWith('ilike.')) {
      filters.reviewerUsername = value.slice(6).replace(/^%|%$/g, '')
    } else if (key === 'or') {
      const match = value.match(/entry_title\.ilike\.%([^,%]+)%/)
      if (match) filters.search = match[1]
    } else if (key === 'limit') {
      filters.limit = Number(value) || 21
    }
  }

  return filters
}

function filterCommunityReviewRows(rows, filters) {
  let result = [...rows]

  if (filters.planetId) {
    result = result.filter((row) => row.planet_id === filters.planetId)
  }
  if (filters.difficulty != null && !Number.isNaN(filters.difficulty)) {
    result = result.filter((row) => row.difficulty === filters.difficulty)
  }
  if (filters.reviewerUsername) {
    const needle = filters.reviewerUsername.toLowerCase()
    result = result.filter((row) => row.reviewer_username.toLowerCase().includes(needle))
  }
  if (filters.search) {
    const needle = filters.search.toLowerCase()
    result = result.filter((row) => (
      row.entry_title.toLowerCase().includes(needle)
      || row.reviewer_username.toLowerCase().includes(needle)
      || (row.notes || '').toLowerCase().includes(needle)
      || row.planet_id.toLowerCase().includes(needle)
    ))
  }

  result.sort((a, b) => new Date(b.review_created_at) - new Date(a.review_created_at))
  return result.slice(0, filters.limit)
}

export async function mockCommunityReviews(page, rows = MOCK_COMMUNITY_REVIEWS) {
  const handler = async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/rest/v1/public_community_reviews') && method === 'GET') {
      const filters = parsePostgrestFilters(url)
      const filtered = filterCommunityReviewRows(rows, filters)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(0, filtered.length - 1)}/${filtered.length}` },
        body: JSON.stringify(filtered),
      })
      return
    }

    await route.continue()
  }

  await page.route(/\/rest\/v1\/public_community_reviews/, handler)
}

export async function installE2eAuth(page, overrides = {}) {
  await page.addInitScript((o) => {
    window.__SA_E2E_AUTH__ = {
      role: 'reviewer',
      username: 'e2e_reviewer',
      email: 'e2e@test.local',
      points: 1200,
      profileId: 'e2e-profile-uuid',
      ...o,
    }
  }, overrides)
}

export async function installMemberAuth(page) {
  await installE2eAuth(page, { role: 'member' })
}

export async function mockSupabaseQueue(page, entries = [MOCK_QUEUE_ENTRY]) {
  const handler = async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/rest/v1/archive_entries')) {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': `0-${entries.length - 1}/${entries.length}` },
          body: JSON.stringify(entries),
        })
        return
      }
    }

    if (url.includes('/rest/v1/public_community_reviews')) {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/0' },
          body: '[]',
        })
        return
      }
    }

    if (url.includes('/rest/v1/reviews')) {
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-review-id' }),
        })
        return
      }
    }

    if (url.includes('/rest/v1/users_profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'other-user-id', username: 'submit_author' }]),
      })
      return
    }

    await route.continue()
  }

  await page.route(/\/rest\/v1\//, handler)
}

/**
 * Mocks the `notifications` table's GET (list) and HEAD (exact-count, used
 * by fetchUnreadCount) requests — the same route-interception convention as
 * mockSupabaseQueue, kept separate since notifications is an independent
 * concern from the review-queue mocks above.
 */
export async function mockNotifications(page, rows = []) {
  const handler = async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (!url.includes('/rest/v1/notifications')) {
      await route.continue()
      return
    }
    if (method === 'GET' || method === 'HEAD') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` },
        body: method === 'HEAD' ? '' : JSON.stringify(rows),
      })
      return
    }
    if (method === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.continue()
  }
  await page.route(/\/rest\/v1\/notifications/, handler)
}

export function hashUrl(path) {
  return `/#${path.startsWith('/') ? path : `/${path}`}`
}
