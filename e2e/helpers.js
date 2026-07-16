/** Shared Playwright helpers for Solar Archive E2E (VITE_E2E=true). */

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
