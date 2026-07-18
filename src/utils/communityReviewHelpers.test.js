import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMMUNITY_REVIEW_SORTS,
  difficultyFilterOptions,
  formatCoord,
  formatReviewerName,
  hubMeta,
  mergeUniqueReviews,
  normalizeCommunityReview,
  planetFilterOptions,
  qualityToStars,
  reviewerRankFromPoints,
  reviewerRoleLabel,
} from './communityReviewHelpers.js'

describe('communityReviews helpers', () => {
  it('formats reviewer usernames for display', () => {
    assert.equal(formatReviewerName('e2e_reviewer'), 'E2e Reviewer')
    assert.equal(formatReviewerName(''), '')
  })

  it('maps reviewer points to rank tiers', () => {
    assert.equal(reviewerRankFromPoints(1200).name, 'Archive Validator')
    assert.equal(reviewerRankFromPoints(50).name, 'Reviewer I')
  })

  it('labels reviewer roles without exposing PII', () => {
    assert.equal(reviewerRoleLabel('admin', 100), 'Admin Reviewer')
    assert.equal(reviewerRoleLabel('reviewer', 1200), 'Archive Validator')
    assert.equal(reviewerRoleLabel('student', 0), 'Community Reviewer')
  })

  it('derives star ratings from quality signals', () => {
    assert.equal(qualityToStars(15, 5, true), 5)
    assert.equal(qualityToStars(null, 1, false), 1)
  })

  it('resolves hub metadata from planet ids', () => {
    const sun = hubMeta('sun')
    assert.equal(sun.planetName, 'Sun')
    assert.equal(sun.hubName, 'Physics')
  })

  it('formats archive coordinates with zero padding', () => {
    assert.equal(formatCoord(12, 88), '0012, 0088')
    assert.equal(formatCoord(-3, 5), '-0003, 0005')
  })

  it('normalizes database rows into card-ready objects', () => {
    const row = {
      review_id: 'rev-1',
      entry_id: 'entry-1',
      reviewer_id: 'user-1',
      fact_check_pass: true,
      difficulty: 4,
      notes: 'Verified sources.',
      review_created_at: '2026-07-01T00:00:00.000Z',
      entry_title: 'Sample Entry',
      planet_id: 'mars',
      layer: 4,
      coord_x: 1,
      coord_y: 2,
      reviewer_username: 'mars_validator',
      reviewer_avatar_url: null,
      reviewer_points: 3400,
      reviewer_role: 'reviewer',
      quality_score: 14,
      reviewer_points_earned: 85,
      helpful_score: 16,
      trending_score: 10,
    }

    const normalized = normalizeCommunityReview(row)
    assert.equal(normalized.id, 'rev-1')
    assert.equal(normalized.title, 'Sample Entry')
    assert.equal(normalized.planet, 'Mars')
    assert.equal(normalized.status, 'approved')
    assert.equal(normalized.pointsEarned, 85)
    assert.ok(normalized.stars >= 1 && normalized.stars <= 5)
  })

  it('merges realtime rows without duplicates', () => {
    const existing = [{ id: 'a' }, { id: 'b' }]
    const incoming = [{ id: 'b' }, { id: 'c' }]
    assert.deepEqual(mergeUniqueReviews(existing, incoming), [{ id: 'c' }, { id: 'a' }, { id: 'b' }])
  })

  it('exposes stable filter and sort option lists', () => {
    assert.ok(planetFilterOptions().some((opt) => opt.id === 'sun'))
    assert.ok(difficultyFilterOptions().some((opt) => opt.id === '3'))
    assert.ok(COMMUNITY_REVIEW_SORTS.some((opt) => opt.id === 'trending'))
  })
})
