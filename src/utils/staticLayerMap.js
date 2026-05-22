/**
 * Optional L2/L3 subject lattice overlay — loaded without rebuild.
 *
 * Set before React loads, e.g. in public/static-layer-map.js:
 *   window.SOLAR_STATIC_LAYER_MAP = { version: 1, planets: { sun: { 2: { tiles: [...] } } } }
 *
 * Tile shape: { row: 1-4, col: 1-4, title, drillLayer?: 3|4, centerGx?, centerGy?, subtitle? }
 * When centerGx/centerGy omitted, drill falls back to existing onDrillSubfield behaviour.
 */

function rawMap() {
    try {
        const w = typeof window !== 'undefined' ? window.SOLAR_STATIC_LAYER_MAP : null
        return w && typeof w === 'object' ? w : null
    } catch {
        return null
    }
}

/** @param {string} planetId */
export function getStaticMapForPlanet(planetId) {
    const pid = String(planetId || '').toLowerCase()
    const m = rawMap()
    if (!m?.planets || typeof m.planets !== 'object') return null
    return m.planets[pid] || m.planets.default || null
}

/**
 * @param {string} planetId
 * @param {number} layer 2 | 3
 * @param {number} row 0-based
 * @param {number} col 0-based
 */
export function getStaticLatticeTile(planetId, layer, row, col) {
    const byPlanet = getStaticMapForPlanet(planetId)
    if (!byPlanet) return null
    const layerKey = String(layer)
    const block = byPlanet[layerKey] || byPlanet[`L${layer}`]
    const tiles = block?.tiles
    if (!Array.isArray(tiles)) return null
    const r1 = row + 1
    const c1 = col + 1
    return (
        tiles.find((t) => Number(t.row) === r1 && Number(t.col) === c1) ||
        tiles.find((t) => Number(t.r) === r1 && Number(t.c) === c1) ||
        null
    )
}

/**
 * @returns {{ focusGx?: number, focusGy?: number, drillLayer?: number } | null}
 */
export function getStaticFocusHint(planetId, layer, row, col) {
    const t = getStaticLatticeTile(planetId, layer, row, col)
    if (!t) return null
    const gx = t.centerGx ?? t.focusGx
    const gy = t.centerGy ?? t.focusGy
    const dl = t.drillLayer != null ? Number(t.drillLayer) : undefined
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) return dl ? { drillLayer: dl } : null
    return { focusGx: gx, focusGy: gy, drillLayer: dl }
}
