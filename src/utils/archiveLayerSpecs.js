/**
 * Shared archive zoom / segment constants — keep in sync with ArchiveGrid SEG GRID behavior.
 * L1·1  L2·4  L3·16  L4·64  L5·256  L6·1024  L7·4096  L8·16384
 */
export const TOTAL_LAYERS = 8
export const STATIC_UP_TO = 3

export const CELL_PX = [0, 1, 4, 16, 64, 256, 1024, 4096, 16384]

/** L7 fixed segment count; last two segments index hub grid facts */
export const L7_SEGMENT_COUNT = 32
/** L8: 450 segments (30×15); first 30 = cited fact + source pairs */
export const L8_SEGMENT_COUNT = 450
export const L8_GRID_COLS = 30
export const L8_FACT_SOURCE_SLOTS = 30

/** L7 narrative tiles: 8-column grid, 30 tiles (D-pad steps these) */
export const L7_SEGMENT_NAV_COLS = 8
export const L7_SEGMENT_NAV_TOTAL = L7_SEGMENT_COUNT - 2

/** L8 narrative band (excludes cited tier and final stitched slot) */
export const L8_NARRATIVE_TILE_TOTAL = L8_SEGMENT_COUNT - L8_FACT_SOURCE_SLOTS - 1

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
