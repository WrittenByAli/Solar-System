/**
 * Per-segment difficulty (1 = easiest … 5 = hardest) for comprehension ordering.
 * Uses lightweight text signals when editors/research JSON don't attach explicit ratings.
 */

const DIFF_MIN = 1
const DIFF_MAX = 5

/** Normalize arbitrary segment rows into plain sentence strings */
export function segmentsToStrings(raw) {
    if (!Array.isArray(raw)) return []
    return raw
        .map((item) => {
            if (typeof item === 'string') return item.trim()
            if (item && typeof item === 'object' && typeof item.text === 'string') return item.text.trim()
            return ''
        })
        .filter(Boolean)
}

/**
 * Heuristic difficulty estimate from prose (no external NLP deps).
 * Longer words, longer sentences, and denser prose trend toward higher difficulty.
 */
export function estimateSegmentDifficulty(text) {
    const t = String(text || '').trim()
    if (!t) return 3

    const words = t.split(/\s+/).filter(Boolean)
    const n = words.length || 1
    const lettersOnly = (w) => w.replace(/[^a-zA-Z]/g, '')
    const wordsWithLetters = words.filter((w) => lettersOnly(w).length > 0)
    const denom = wordsWithLetters.length || n
    const avgLetters =
        wordsWithLetters.reduce((acc, w) => acc + lettersOnly(w).length, 0) / denom

    const longWordRatio = words.filter((w) => lettersOnly(w).length >= 9).length / n

    const punctDensity = (t.match(/[,;:()[\]{}"""'\-/]/g) || []).length / Math.max(20, t.length)

    let score = 0
    score += Math.min(1, Math.max(0, (avgLetters - 4.5) / 8)) * 0.38
    score += Math.min(1, longWordRatio) * 0.34
    score += Math.min(1, (t.length / 220 - 0.35) / 1.2) * 0.18
    score += Math.min(1, punctDensity * 80) * 0.1

    const level = DIFF_MIN + Math.round(score * (DIFF_MAX - DIFF_MIN))
    return Math.max(DIFF_MIN, Math.min(DIFF_MAX, level))
}

function blendWithEntryDifficulty(segmentDifficulty, entryDifficulty) {
    if (entryDifficulty == null || !Number.isFinite(Number(entryDifficulty))) return segmentDifficulty
    const ed = Math.max(DIFF_MIN, Math.min(DIFF_MAX, Math.round(Number(entryDifficulty))))
    return Math.max(DIFF_MIN, Math.min(DIFF_MAX, Math.round(segmentDifficulty * 0.55 + ed * 0.45)))
}

/**
 * Attach difficulty to each segment, sort ascending (easiest first).
 * Optional entry-level difficulty (author/reviewer) nudges all segments toward that band.
 */
export function buildSortedSegments(rawStrings, entryDifficulty = null) {
    const strings = Array.isArray(rawStrings)
        ? rawStrings.map((s) => String(s).trim()).filter(Boolean)
        : []

    const withMeta = strings.map((text, originalIndex) => {
        const base = estimateSegmentDifficulty(text)
        const difficulty = blendWithEntryDifficulty(base, entryDifficulty)
        return { text, difficulty, originalIndex }
    })

    withMeta.sort((a, b) => {
        if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
        return a.originalIndex - b.originalIndex
    })

    return withMeta.map(({ text, difficulty }) => ({ text, difficulty }))
}

export function segmentText(seg) {
    if (seg == null) return ''
    if (typeof seg === 'string') return seg
    return seg.text ?? ''
}

/** Difficulty 1–5 or null for legacy bare strings */
export function segmentDifficultyValue(seg) {
    if (seg != null && typeof seg === 'object' && seg.difficulty != null) {
        const d = Math.round(Number(seg.difficulty))
        if (Number.isFinite(d)) return Math.max(DIFF_MIN, Math.min(DIFF_MAX, d))
    }
    return null
}

/**
 * Sort segment rows by comprehension difficulty ascending: least difficult (easiest) first,
 * most difficult last. Stable tie-break keeps original order when scores match.
 */
export function normalizeSegmentsEasiestFirst(segments, entryDifficulty = null) {
    if (!Array.isArray(segments) || segments.length <= 1) {
        return Array.isArray(segments) ? [...segments] : []
    }
    const decorated = segments.map((seg, originalIndex) => {
        const stored = segmentDifficultyValue(seg)
        const score =
            stored != null
                ? stored
                : blendWithEntryDifficulty(estimateSegmentDifficulty(segmentText(seg)), entryDifficulty)
        return { seg, originalIndex, score }
    })
    decorated.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        return a.originalIndex - b.originalIndex
    })
    return decorated.map((d) => d.seg)
}

/** Resolved difficulty for tooltips (stored value or heuristic from text). */
export function resolveSegmentDifficulty(seg) {
    const stored = segmentDifficultyValue(seg)
    if (stored != null) return stored
    const t = segmentText(seg)
    if (!t) return null
    return estimateSegmentDifficulty(t)
}

/**
 * Native `title` tooltip copy for hover on a narrative segment (plain text, newline-separated).
 */
export function buildSegmentHoverTooltip(seg, opts = {}) {
    const text = segmentText(seg)
    const d = resolveSegmentDifficulty(seg)
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    const chars = text.length

    const lines = ['SOLAR Archive · Segment']
    if (opts.layer) lines.push(`Layer: ${opts.layer}`)
    if (opts.coordLabel) lines.push(`Grid coordinates: ${opts.coordLabel}`)
    if (opts.entryTitle) lines.push(`Entry title: ${opts.entryTitle}`)
    if (opts.rank != null && opts.totalSegments != null && opts.totalSegments > 0) {
        lines.push(`Reading order: rank ${opts.rank} of ${opts.totalSegments} (sorted easiest → hardest for this entry)`)
    }
    if (opts.tileHint) lines.push(opts.tileHint)
    if (d != null) {
        lines.push(`Segment comprehension difficulty: ${d}/5 (1 = easiest to understand, 5 = most demanding)`)
    }
    if (opts.entryDifficulty != null && Number.isFinite(Number(opts.entryDifficulty))) {
        const ed = Math.max(DIFF_MIN, Math.min(DIFF_MAX, Math.round(Number(opts.entryDifficulty))))
        lines.push(`Whole-entry difficulty (author / reviewer consensus): ${ed}/5`)
    }
    lines.push(`Length: ${words} word${words === 1 ? '' : 's'} · ${chars} character${chars === 1 ? '' : 's'}`)
    lines.push('──────── Full text ────────')
    lines.push(text.trim() || '(empty segment)')
    return lines.join('\n')
}

/** Hover details for L8 cited-fact tiles (fact blurb + source meta). */
export function buildCitedFactHoverTooltip({ factText, entryTitle, coordLabel, sourceLabel, sourceHref }) {
    const t = String(factText || '').trim()
    const d = estimateSegmentDifficulty(t)
    const words = t ? t.split(/\s+/).filter(Boolean).length : 0
    const lines = [
        'SOLAR Archive · Cited fact tile',
        `Grid coordinates: ${coordLabel || '—'}`,
        entryTitle ? `Entry title: ${entryTitle}` : null,
        `Fact blur comprehension difficulty (estimated): ${d}/5`,
        `Length: ${words} word${words === 1 ? '' : 's'} · ${t.length} character${t.length === 1 ? '' : 's'}`,
        sourceLabel ? `Source label: ${sourceLabel}` : null,
        sourceHref ? `Source link: ${sourceHref}` : null,
        '──────── Fact text ────────',
        t || '(no fact text)',
    ].filter(Boolean)
    return lines.join('\n')
}

/** Plain paragraph hover when there is no structured segment row (full-body fallback). */
export function buildFullTextHoverTooltip(bodyText, opts = {}) {
    const t = String(bodyText || '').trim()
    const d = estimateSegmentDifficulty(t)
    const words = t ? t.split(/\s+/).filter(Boolean).length : 0
    const lines = [
        'SOLAR Archive · Full depth text',
        opts.layer ? `Layer: ${opts.layer}` : null,
        opts.coordLabel ? `Grid coordinates: ${opts.coordLabel}` : null,
        opts.entryTitle ? `Entry title: ${opts.entryTitle}` : null,
        opts.tileHint ? String(opts.tileHint) : null,
    ].filter(Boolean)
    if (opts.entryDifficulty != null && Number.isFinite(Number(opts.entryDifficulty))) {
        const ed = Math.max(DIFF_MIN, Math.min(DIFF_MAX, Math.round(Number(opts.entryDifficulty))))
        lines.push(`Whole-entry difficulty (author / reviewer consensus): ${ed}/5`)
    }
    lines.push(`Estimated comprehension difficulty (whole block): ${d}/5`)
    lines.push(`Length: ${words} word${words === 1 ? '' : 's'} · ${t.length} character${t.length === 1 ? '' : 's'}`)
    lines.push('──────── Text ────────')
    lines.push(t.slice(0, 4000) + (t.length > 4000 ? '\n…' : ''))
    return lines.join('\n')
}
