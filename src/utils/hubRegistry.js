/**
 * Canonical hub identity + grid geometry — the single source of truth for
 * every consumer that used to read `archive_instances` (empty table, always
 * fell back to a hardcoded 3840x2160 default) or the hardcoded
 * `ARCHIVE_HUB_LOCATIONS` / `HUB_DISCIPLINE_COPY` modules for hub metadata.
 *
 * `planets` owns identity/description/grid geometry/display order/isActive.
 * `hubs` is joined in for the one field it uniquely owns, `layer_range`,
 * via its `planet_id` FK (not assumed id-equality, so this keeps working if
 * hubs and planets ever diverge 1:1).
 *
 * Synchronous getters return cached-or-DEFAULT_HUBS and kick off a
 * background Supabase hydration on a cold read — the same idiom already
 * used three times in archiveInstanceStorage.js (hubConfigCache /
 * registryCache / libraryCache). No localStorage persistence: the cache
 * lives for the tab's lifetime only.
 */
import { supabase } from './supabaseClient.js'

/** Bundled fallback — matches today's live seed data exactly (10 hubs, 3840x2160, L4-L8, active). */
export const DEFAULT_HUBS = [
    { id: 'star', name: 'North Star', description: 'Foundation · North Star', gridWidth: 3840, gridHeight: 2160, displayOrder: 0, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'sun', name: 'Sun', description: 'Physics', gridWidth: 3840, gridHeight: 2160, displayOrder: 1, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'mercury', name: 'Mercury', description: 'Mathematics', gridWidth: 3840, gridHeight: 2160, displayOrder: 2, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'venus', name: 'Venus', description: 'Psychology & Neuroscience', gridWidth: 3840, gridHeight: 2160, displayOrder: 3, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'earth', name: 'Earth', description: 'Earth & Environmental Science', gridWidth: 3840, gridHeight: 2160, displayOrder: 4, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'mars', name: 'Mars', description: 'Applied Technology', gridWidth: 3840, gridHeight: 2160, displayOrder: 5, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'jupiter', name: 'Jupiter', description: 'Social Science', gridWidth: 3840, gridHeight: 2160, displayOrder: 6, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'saturn', name: 'Saturn', description: 'Astronomy & Cosmology', gridWidth: 3840, gridHeight: 2160, displayOrder: 7, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'uranus', name: 'Uranus', description: 'Chemistry', gridWidth: 3840, gridHeight: 2160, displayOrder: 8, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
    { id: 'neptune', name: 'Neptune', description: 'Biology', gridWidth: 3840, gridHeight: 2160, displayOrder: 9, layerRange: 'L4-L8', minLayer: 4, maxLayer: 8, isActive: true },
]

const DEFAULT_MAP = new Map(DEFAULT_HUBS.map((h) => [h.id, h]))
const KNOWN_IDS = new Set(DEFAULT_HUBS.map((h) => h.id))

/** `'L4-L8'` -> `{ minLayer: 4, maxLayer: 8 }`; defensive default on an unexpected format. */
function parseLayerRange(raw) {
    const match = /^L(\d+)-L(\d+)$/.exec(String(raw || '').trim())
    if (!match) return { minLayer: 4, maxLayer: 8 }
    const minLayer = parseInt(match[1], 10)
    const maxLayer = parseInt(match[2], 10)
    if (!Number.isFinite(minLayer) || !Number.isFinite(maxLayer)) return { minLayer: 4, maxLayer: 8 }
    return { minLayer, maxLayer }
}

/** Moved from archiveInstanceStorage.js — same behavior, checks this module's id list. */
export function normalizeHubId(raw) {
    let id = String(raw || 'earth').trim().toLowerCase()
    if (id === 'beacon') id = 'star'
    return KNOWN_IDS.has(id) ? id : 'earth'
}

let hubsCache = null // null = not yet hydrated; Map<id, HubRecord> once hydrated (or defaulted on failure)
let hydratingPromise = null

function hydrateRegistry() {
    if (hydratingPromise) return hydratingPromise
    hydratingPromise = Promise.all([
        supabase
            .from('planets')
            .select('id, name, slug, description, grid_width, grid_height, display_order, is_active')
            .order('display_order'),
        supabase.from('hubs').select('id, planet_id, layer_range'),
    ])
        .then(([planetsRes, hubsRes]) => {
            const planetsData = planetsRes?.data
            if (planetsRes?.error || !Array.isArray(planetsData) || planetsData.length === 0) {
                throw planetsRes?.error || new Error('planets query returned no rows')
            }
            const hubRowByPlanetId = new Map((hubsRes?.data || []).map((h) => [h.planet_id, h]))
            const merged = new Map()
            planetsData.forEach((p) => {
                const hubRow = hubRowByPlanetId.get(p.id)
                const layerRange = hubRow?.layer_range || 'L4-L8'
                const { minLayer, maxLayer } = parseLayerRange(layerRange)
                merged.set(p.id, {
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    gridWidth: p.grid_width,
                    gridHeight: p.grid_height,
                    displayOrder: p.display_order,
                    layerRange,
                    minLayer,
                    maxLayer,
                    isActive: p.is_active !== false,
                })
            })
            hubsCache = merged
            window.dispatchEvent(new Event('solar-hubs-updated'))
        })
        .catch(() => {
            if (hubsCache === null) hubsCache = new Map(DEFAULT_MAP)
        })
        .finally(() => {
            hydratingPromise = null
        })
    return hydratingPromise
}

function ensureHydrated() {
    if (hubsCache === null) hydrateRegistry()
}

/** ACTIVE hubs only, sorted by displayOrder — for listings/dropdowns. Synchronous. */
export function getHubRegistry() {
    ensureHydrated()
    const map = hubsCache || DEFAULT_MAP
    return Array.from(map.values())
        .filter((h) => h.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Resolves once a warm hub list is available — resolves immediately if
 * already hydrated, otherwise joins the in-flight (or newly triggered)
 * hydration cycle. For callers that were previously `await`-ing their own
 * `planets` query (e.g. planetOptions.js) and can tolerate one async hop.
 */
export function getHubRegistryAsync() {
    if (hubsCache !== null) return Promise.resolve(getHubRegistry())
    return hydrateRegistry().then(() => getHubRegistry())
}

/** ANY hub regardless of isActive — for direct route lookups. Normalizes input; falls back to 'earth'. Synchronous. */
export function getHub(rawHubId) {
    ensureHydrated()
    const id = normalizeHubId(rawHubId)
    const map = hubsCache || DEFAULT_MAP
    return map.get(id) || DEFAULT_MAP.get(id) || DEFAULT_MAP.get('earth')
}

/** `{ gridW, gridH, halfW, halfH }` — drop-in replacement for readGridDimensionsFromStorage(hubId). Synchronous. */
export function getGridDimensions(rawHubId) {
    const hub = getHub(rawHubId)
    const gridW = Number.isFinite(hub.gridWidth) && hub.gridWidth > 0 ? hub.gridWidth : 3840
    const gridH = Number.isFinite(hub.gridHeight) && hub.gridHeight > 0 ? hub.gridHeight : 2160
    return { gridW, gridH, halfW: Math.floor(gridW / 2), halfH: Math.floor(gridH / 2) }
}
