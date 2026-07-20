import { MAX_TAGS_PER_SUBMISSION, MAX_TAG_CHARS } from './submissionStorage.js'

// Server-enforced bounds (see supabase/migrations/20260720000000_bound_archive_entry_text_fields.sql)
// mirrored here so the form fails fast with a readable message instead of a
// raw Postgres 23514 (check_violation) round-trip.
export const TITLE_MAX_CHARS = 80
export const SHORT_SUMMARY_MAX_CHARS = 700
export const CONTENT_MAX_CHARS = 2500
export const MAX_ALTERNATE_PERSPECTIVES = 6
export const ALTERNATE_PERSPECTIVE_MAX_CHARS = 200

/** Required + max-length check for the entry title. HTML maxLength on the
    input already blocks most typing past the limit, but paste / IME / a
    future markup change can bypass it, so this is the authoritative check. */
export function validateTitle(rawTitle) {
    const trimmed = String(rawTitle || '').trim()
    if (!trimmed) return 'Subject is required'
    if (trimmed.length > TITLE_MAX_CHARS) return `Title must be ${TITLE_MAX_CHARS} characters or fewer`
    return null
}

/** Generic max-length guard for a free-text field, independent of whatever
    min-length/required business rule the caller layers on top. */
export function validateMaxLength(rawValue, max, fieldLabel) {
    if (String(rawValue || '').length > max) return `${fieldLabel} must be ${max} characters or fewer`
    return null
}

/** Re-derives normalizeSubmissionTags' own split/clean rules to report a real
    error (too many tags, a tag too long) instead of letting normalization
    silently drop/truncate what the user typed. */
export function validateRawTagsInput(rawInput) {
    const pieces = typeof rawInput === 'string' ? rawInput.split(/[,#\n\r]+/) : []
    let count = 0
    for (const piece of pieces) {
        const cleaned = String(piece || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '')
        if (cleaned.length < 2) continue
        if (cleaned.length > MAX_TAG_CHARS) return `Each tag must be ${MAX_TAG_CHARS} characters or fewer`
        count += 1
        if (count > MAX_TAGS_PER_SUBMISSION) return `Maximum ${MAX_TAGS_PER_SUBMISSION} tags allowed`
    }
    return null
}

/** Entry-count + per-entry length check for the alternate-perspectives
    textarea (one "hubId | label" per line). Blank lines are formatting, not
    an error, and are already dropped before this check runs. */
export function validateAlternatePerspectivesInput(rawInput) {
    const lines = String(rawInput || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    if (lines.length > MAX_ALTERNATE_PERSPECTIVES) {
        return `Maximum ${MAX_ALTERNATE_PERSPECTIVES} alternate perspective links allowed`
    }
    const tooLong = lines.find((line) => line.length > ALTERNATE_PERSPECTIVE_MAX_CHARS)
    if (tooLong) {
        return `Each alternate perspective line must be ${ALTERNATE_PERSPECTIVE_MAX_CHARS} characters or fewer`
    }
    return null
}
