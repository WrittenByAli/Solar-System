/**
 * Shared archive zoom / segment constants — keep in sync with ArchiveGrid SEG GRID behavior.
 * L1·1  L2·4  L3·16  L4·64  L5·256  L6·1024  L7·4096  L8·16384
 */
export const TOTAL_LAYERS = 8
export const STATIC_UP_TO = 3

export const CELL_PX = [0, 1, 4, 16, 64, 256, 1024, 4096, 16384]

/** L7 fixed segment count; last two segments = cited facts + grid references */
export const L7_SEGMENT_COUNT = 32
/** L8: 450 segments (30×15); bottom row (30) = cited fact + source pairs */
export const L8_SEGMENT_COUNT = 450
export const L8_GRID_COLS = 30
export const L8_FACT_SOURCE_SLOTS = 30

/** L7 narrative tiles in the 8-column grid (submit fills these only; not seg 31–32). */
export const L7_NARRATIVE_SEGMENT_COUNT = L7_SEGMENT_COUNT - 2
/** L7 D-pad / HUD: all segments 1–32 including cited + grid-ref panels */
export const L7_SEGMENT_NAV_COLS = 8
export const L7_SEGMENT_NAV_TOTAL = L7_SEGMENT_COUNT

/** L8 narrative band tile count (indices 0 … L8_NARRATIVE_TILE_TOTAL - 1) */
export const L8_NARRATIVE_TILE_TOTAL = L8_SEGMENT_COUNT - L8_FACT_SOURCE_SLOTS - 1

/** 0-based segment index of final stitched slot (one cell after narrative band). */
export const L8_FINAL_SEGMENT_INDEX = L8_NARRATIVE_TILE_TOTAL
/** 0-based first index of cited-fact tier (30 cells, bottom grid row). */
export const L8_CITED_SEGMENT_START_INDEX = L8_FINAL_SEGMENT_INDEX + 1

export const LAYER_LABELS = {
    1: '1px · Overview',
    2: '4px · Region',
    3: '16px · Sector',
    4: '64px · Zone',
    5: '256px · Summary',
    6: '1024px · Detail',
    7: '4096px · Intermediate',
    8: '16384px · Deep Full',
}

export const SUBMISSION_PREVIEW_LAYER_IDS = [5, 6, 7, 8]

/** Parse ?archiveLayer= from submit / report URLs → 5–8 or null */
export function parseSubmissionArchiveLayer(raw) {
    const n = parseInt(String(raw ?? '').trim(), 10)
    return SUBMISSION_PREVIEW_LAYER_IDS.includes(n) ? n : null
}

export function parsePositiveInt(raw) {
    const n = parseInt(String(raw ?? '').trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
}

/** Sentence tiles derived from the merged cell entry (catalog + approved submissions). */
export function countNarrativeSegments(cellData) {
    return Array.isArray(cellData?.segments) ? cellData.segments.length : 0
}

/** All 30 L7 narrative tiles populated — required before Layer 8 “next sentence” authoring. */
export function isL7NarrativeBandComplete(cellData) {
    return countNarrativeSegments(cellData) >= L7_NARRATIVE_SEGMENT_COUNT
}

/** L5 short summary present at this coordinate. */
export function cellHasL5(cellData) {
    return !!(cellData?.shortSummary && String(cellData.shortSummary).trim())
}

/** L6 detail present (detailedSummary, detail, or description). */
export function cellHasL6(cellData) {
    return !!(
        (cellData?.detailedSummary && String(cellData.detailedSummary).trim()) ||
        (cellData?.detail && String(cellData.detail).trim()) ||
        (cellData?.description && String(cellData.description).trim())
    )
}

/** Narrative tiles (L7/L8) require both L5 and L6 at the same coordinate. */
export function cellHasL5AndL6(cellData) {
    return cellHasL5(cellData) && cellHasL6(cellData)
}

export const L56_NARRATIVE_GATE_MESSAGE =
    'Add L5 (summary) and L6 (detail) content at this coordinate before authoring narrative tiles. Easiest segments (difficulty 1) fill L7 first; harder segments automatically advance to L8 once L7 is complete.'

export const L56_NARRATIVE_GATE_SHORT =
    'Add L5 (summary) and L6 (detail) at this coordinate before narrative tiles.'

export const L7_NARRATIVE_GATE_MESSAGE =
    `Complete all ${L7_NARRATIVE_SEGMENT_COUNT} Layer 7 narrative tiles for this coordinate before drafting Layer 8 sentences (same sentence pool; easier slots surface on L7 first).`

export const L7_NARRATIVE_GATE_SHORT =
    `Complete all ${L7_NARRATIVE_SEGMENT_COUNT} L7 narrative tiles before L8.`

/**
 * Submit / HUD state for L7/L8 narrative authoring at one cell.
 * @returns {{ kind: 'none'|'l56_gate'|'l7_gate'|'l7_full'|'l8_full'|'ready', slot?: number, total?: number }}
 */
export function getNarrativeSubmitState(layer, cellData) {
    if (layer !== 7 && layer !== 8) return { kind: 'none' }
    if (!cellHasL5AndL6(cellData)) return { kind: 'l56_gate' }
    const nSeg = countNarrativeSegments(cellData)
    if (layer === 7) {
        if (nSeg >= L7_NARRATIVE_SEGMENT_COUNT) return { kind: 'l7_full' }
        return { kind: 'ready', slot: nSeg + 1, total: L7_NARRATIVE_SEGMENT_COUNT }
    }
    if (!isL7NarrativeBandComplete(cellData)) return { kind: 'l7_gate' }
    if (nSeg >= L8_NARRATIVE_TILE_TOTAL) return { kind: 'l8_full' }
    return { kind: 'ready', slot: nSeg + 1, total: L8_NARRATIVE_TILE_TOTAL }
}

/**
 * Next narrative sentence slot (1-based) for submit deep-link.
 * Blocked until L5+L6 exist; L8 blocked until L7 narrative band is full.
 */
export function nextNarrativeSegmentSubmitSlot(layer, cellData) {
    const state = getNarrativeSubmitState(layer, cellData)
    if (state.kind !== 'ready') return null
    return { slot: state.slot, total: state.total }
}
