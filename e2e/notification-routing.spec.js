import { test, expect } from '@playwright/test'
import { hashUrl, installE2eAuth, mockNotifications, mockSupabaseQueue } from './helpers.js'

/**
 * Stale-review resurfacing (FEATURE_STALE_REVIEW_RESURFACING.md) adds a real
 * `notifications.type` column and a `stale_review` kind that must route to
 * /review-queue instead of the existing /my-submissions default. This suite
 * covers the click-routing contract for every notification kind, including
 * the legacy pre-migration rows (type = 'status', the column's default).
 */

const NOW = new Date().toISOString()

function notif(id, type, message) {
  return { id, message, entry_id: `entry-${id}`, is_read: false, created_at: NOW, type }
}

async function openFirstNotification(page) {
  await page.goto(hashUrl('/leaderboard'))
  await page.getByRole('button', { name: /Notifications/ }).click()
  await page.getByRole('menuitem').first().click()
}

test.describe('Notification routing', () => {
  test.beforeEach(async ({ page }) => {
    await installE2eAuth(page)
    await mockSupabaseQueue(page, [])
  })

  test('review_requested notification routes to /review-queue', async ({ page }) => {
    await mockNotifications(page, [
      notif('n0', 'review_requested', 'New L4 entry "Foo" is awaiting review.'),
    ])
    await openFirstNotification(page)
    await expect(page).toHaveURL(/#\/review-queue$/)
  })

  test('stale_review notification routes to /review-queue', async ({ page }) => {
    await mockNotifications(page, [
      notif('n1', 'stale_review', 'L5 entry "Foo" has been waiting 48+ hours for review.'),
    ])
    await openFirstNotification(page)
    await expect(page).toHaveURL(/#\/review-queue$/)
  })

  test('entry_approved notification still routes to /my-submissions (regression)', async ({ page }) => {
    await mockNotifications(page, [
      notif('n2', 'entry_approved', 'Your L4 entry "Bar" cleared review. Status: Approved. +220 points.'),
    ])
    await openFirstNotification(page)
    await expect(page).toHaveURL(/#\/my-submissions$/)
  })

  test('entry_rejected notification still routes to /my-submissions (regression)', async ({ page }) => {
    await mockNotifications(page, [
      notif('n3', 'entry_rejected', 'Your L4 entry "Baz" was rejected. Reviewer feedback is attached — see My submissions.'),
    ])
    await openFirstNotification(page)
    await expect(page).toHaveURL(/#\/my-submissions$/)
  })

  test('legacy pre-migration row (type default "status") still routes to /my-submissions', async ({ page }) => {
    await mockNotifications(page, [
      notif('n4', 'status', 'Your L4 entry "Legacy" was rejected. Reviewer feedback is attached — see My submissions.'),
    ])
    await openFirstNotification(page)
    await expect(page).toHaveURL(/#\/my-submissions$/)
  })
})
