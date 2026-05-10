import {
    REVIEWERS_REQUIRED,
    REVIEW_RECOMMENDATION_MAX_CHARS,
} from '../constants/reviewWorkflow.js'

export const MAX_TAGS_PER_SUBMISSION = 16
export const MAX_TAG_CHARS = 32

/** Normalize tags for search, merge, and cross-submission navigation */
export function normalizeSubmissionTags(input) {
    const raw = Array.isArray(input)
        ? input
        : typeof input === 'string'
            ? input.split(/[,#\n\r]+/)
            : []
    const out = []
    const seen = new Set()
    for (const piece of raw) {
        let s = String(piece || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '')
            .slice(0, MAX_TAG_CHARS)
        if (s.length < 2) continue
        if (seen.has(s)) continue
        seen.add(s)
        out.push(s)
        if (out.length >= MAX_TAGS_PER_SUBMISSION) break
    }
    return out
}

const LS_SUBMISSIONS = 'submittedArchiveEntries'

function newId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Normalize legacy rows into the pipeline shape */
export function migrateSubmission(entry) {
    if (!entry || typeof entry !== 'object') return entry
    const out = { ...entry }
    if (!out.id) {
        out.id = `legacy-${String(out.coordX)}-${String(out.coordY)}-${out.createdAt || Date.now()}`
    }
    if (!out.status) out.status = 'approved'
    if (!Array.isArray(out.reviews)) out.reviews = []
    if (!out.authorUsername) out.authorUsername = 'legacy_contributor'
    out.tags = normalizeSubmissionTags(out.tags)
    return out
}

export function getSubmissions() {
    try {
        const raw = JSON.parse(localStorage.getItem(LS_SUBMISSIONS) || '[]')
        if (!Array.isArray(raw)) return []
        return raw.map(migrateSubmission)
    } catch {
        return []
    }
}

export function saveSubmissions(list) {
    localStorage.setItem(LS_SUBMISSIONS, JSON.stringify(list))
    window.dispatchEvent(new Event('solar-archive-submissions-updated'))
}

/** Append a new pending submission (caller supplies author + fields) */
export function appendPendingSubmission(entry) {
    const row = migrateSubmission({
        ...entry,
        tags: normalizeSubmissionTags(entry.tags),
        id: entry.id || newId(),
        status: 'pending',
        reviews: [],
        createdAt: entry.createdAt || new Date().toISOString(),
    })
    const all = getSubmissions()
    all.push(row)
    saveSubmissions(all)
    return row
}

export function getPendingSubmissions() {
    return getSubmissions().filter((s) => s.status === 'pending')
}

export function getApprovedSubmissions() {
    return getSubmissions().filter((s) => s.status === 'approved')
}

/**
 * Add one review. Approves only when REVIEWERS_REQUIRED distinct reviewers
 * all passed fact-check; otherwise rejects if we already have 3+ with any fail.
 */
export function addReviewToSubmission(submissionId, review) {
    const { reviewerUsername, factCheckPass, difficulty, notes } = review
    const all = getSubmissions()
    const idx = all.findIndex((s) => s.id === submissionId)
    if (idx < 0) return { ok: false, error: 'not_found' }

    const s = { ...all[idx], reviews: [...(all[idx].reviews || [])] }
    if (s.status !== 'pending') return { ok: false, error: 'not_pending' }

    if (s.reviews.some((r) => r.reviewerUsername === reviewerUsername)) {
        return { ok: false, error: 'already_reviewed' }
    }

    if (s.authorUsername === reviewerUsername) {
        return { ok: false, error: 'cannot_review_own' }
    }

    const row = {
        reviewerUsername,
        factCheckPass: !!factCheckPass,
        difficulty: Math.min(5, Math.max(1, parseInt(difficulty, 10) || 3)),
        notes: typeof notes === 'string' ? notes.slice(0, REVIEW_RECOMMENDATION_MAX_CHARS) : '',
        at: new Date().toISOString(),
    }
    s.reviews.push(row)

    const n = s.reviews.length
    if (n >= REVIEWERS_REQUIRED) {
        const allPass = s.reviews.every((r) => r.factCheckPass === true)
        if (allPass) {
            s.status = 'approved'
            const sum = s.reviews.reduce((a, r) => a + r.difficulty, 0)
            s.consensusDifficulty = Math.round(sum / s.reviews.length)
        } else {
            s.status = 'rejected'
        }
    }

    all[idx] = s
    saveSubmissions(all)
    return { ok: true, submission: s }
}
