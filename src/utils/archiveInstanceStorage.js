/** Saved layout + branding for a hostable archive instance (local demo — swap for API later). */
import { getHubDisciplineCopy } from '../constants/hubDisciplineCopy.js'

export const ARCHIVE_INSTANCE_LS = 'solarArchiveInstanceConfig'
/** Per map hub (`/archive/:planetId`) instance configs — overrides legacy single-config when present. */
export const ARCHIVE_BY_HUB_LS = 'solarArchiveByHub'
/** Community directory rows (local demo — federation target: https://archive.solar ) */
export const ARCHIVE_REGISTRY_LS = 'solarArchivePublishedRegistry'
/** Saved archives list for this browser (Start archive → Add) */
export const ARCHIVE_LIBRARY_LS = 'solarArchiveLibrary'

/** Map hubs — ids must match `/archive/:planetId` routes and MapView targets. */
const HUB_LOCATION_DEFS = [
    { id: 'star', label: 'North Star', fallbackSubtitle: 'Foundation archive · memoranda & canon' },
    { id: 'sun', label: 'Sun' },
    { id: 'mercury', label: 'Mercury' },
    { id: 'venus', label: 'Venus' },
    { id: 'earth', label: 'Earth' },
    { id: 'mars', label: 'Mars' },
    { id: 'jupiter', label: 'Jupiter' },
    { id: 'saturn', label: 'Saturn' },
    { id: 'uranus', label: 'Uranus' },
    { id: 'neptune', label: 'Neptune' },
]

export const ARCHIVE_HUB_LOCATIONS = HUB_LOCATION_DEFS.map(({ id, label, fallbackSubtitle }) => ({
    id,
    label,
    subtitle: getHubDisciplineCopy(id)?.domain || fallbackSubtitle || label,
}))

export function normalizeHubId(raw) {
    let id = String(raw || 'earth').trim().toLowerCase()
    if (id === 'beacon') id = 'star'
    const known = ARCHIVE_HUB_LOCATIONS.some((h) => h.id === id)
    return known ? id : 'earth'
}

function loadArchiveByHubMap() {
    try {
        const raw = localStorage.getItem(ARCHIVE_BY_HUB_LS)
        const obj = JSON.parse(raw || '{}')
        return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
    } catch {
        return {}
    }
}

function persistArchiveByHubMap(map) {
    localStorage.setItem(ARCHIVE_BY_HUB_LS, JSON.stringify(map))
}

export const GRID_SIDE_MIN = 8
/** Hard cap so the canvas stays responsive in-browser; huge images are scaled down in the UI with a notice. */
export const GRID_SIDE_MAX = 8192

export const REGISTRY_CATEGORIES = [
    { id: 'general', label: 'General archive' },
    { id: 'movies', label: 'Movies & cinema' },
    { id: 'books', label: 'Books & literature' },
    { id: 'research', label: 'Research & science' },
    { id: 'games', label: 'Games & worlds' },
]

export function clampGridSide(n, fallback = 3840) {
    const x = Math.floor(Number(n))
    const fb = Math.floor(Number(fallback))
    const base = Number.isFinite(x) ? x : (Number.isFinite(fb) ? fb : 3840)
    return Math.min(GRID_SIDE_MAX, Math.max(GRID_SIDE_MIN, base))
}

export function defaultArchiveInstance() {
    return {
        gridWidth: 3840,
        gridHeight: 2160,
        coverImageDataUrl: '',
        instanceTitle: '',
        slug: '',
        category: 'general',
        contactUrl: '',
        listedOnRegistry: false,
        updatedAt: '',
    }
}

export function loadArchiveInstanceConfig() {
    try {
        const raw = localStorage.getItem(ARCHIVE_INSTANCE_LS)
        if (!raw) return defaultArchiveInstance()
        return { ...defaultArchiveInstance(), ...JSON.parse(raw) }
    } catch {
        return defaultArchiveInstance()
    }
}

export function saveArchiveInstanceConfig(patch) {
    const prev = loadArchiveInstanceConfig()
    const next = {
        ...prev,
        ...patch,
        gridWidth: clampGridSide(patch.gridWidth ?? prev.gridWidth, prev.gridWidth),
        gridHeight: clampGridSide(patch.gridHeight ?? prev.gridHeight, prev.gridHeight),
        updatedAt: new Date().toISOString(),
    }
    try {
        localStorage.setItem(ARCHIVE_INSTANCE_LS, JSON.stringify(next))
    } catch (e) {
        const err = new Error(
            'Could not save — browser storage is full. Try a smaller image or clear site data.',
        )
        err.cause = e
        throw err
    }
    window.dispatchEvent(new Event('solar-archive-instance-updated'))
    return next
}

/**
 * Config for one map hub. Falls back to legacy `solarArchiveInstanceConfig` if this hub has no entry yet.
 */
export function loadHubArchiveConfig(hubId) {
    const id = normalizeHubId(hubId)
    const map = loadArchiveByHubMap()
    const base = defaultArchiveInstance()
    let stored = map[id] && typeof map[id] === 'object' ? map[id] : null
    if (!stored && id === 'star' && map.beacon && typeof map.beacon === 'object') {
        stored = map.beacon
    }
    if (stored) return { ...base, ...stored }
    const legacy = loadArchiveInstanceConfig()
    return { ...base, ...legacy }
}

/**
 * Save grid + metadata for a specific hub (planet / Star foundation).
 */
export function saveHubArchiveConfig(hubId, patch) {
    const id = normalizeHubId(hubId)
    const prev = loadHubArchiveConfig(id)
    const next = {
        ...prev,
        ...patch,
        gridWidth: clampGridSide(patch.gridWidth ?? prev.gridWidth, prev.gridWidth),
        gridHeight: clampGridSide(patch.gridHeight ?? prev.gridHeight, prev.gridHeight),
        updatedAt: new Date().toISOString(),
    }
    const map = loadArchiveByHubMap()
    map[id] = next
    try {
        persistArchiveByHubMap(map)
    } catch (e) {
        const err = new Error(
            'Could not save — browser storage is full. Try a smaller image or clear site data.',
        )
        err.cause = e
        throw err
    }
    window.dispatchEvent(new Event('solar-archive-instance-updated'))
    return next
}

export function loadArchiveLibrary() {
    try {
        const raw = localStorage.getItem(ARCHIVE_LIBRARY_LS)
        const arr = JSON.parse(raw || '[]')
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

/** Append one archive record (each successful “Add archive” save). */
export function addArchiveToLibrary(entry) {
    const list = loadArchiveLibrary().filter((x) => x.id !== entry.id)
    const row = {
        ...entry,
        id: entry.id || `arc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        savedAt: entry.savedAt || new Date().toISOString(),
    }
    list.unshift(row)
    try {
        localStorage.setItem(ARCHIVE_LIBRARY_LS, JSON.stringify(list.slice(0, 80)))
    } catch {
        const trimmed = list.slice(0, 15).map((r, i) =>
            i === 0 ? { ...r, thumb: '', coverNote: 'thumbnail omitted (storage full)' } : r,
        )
        localStorage.setItem(ARCHIVE_LIBRARY_LS, JSON.stringify(trimmed))
    }
    window.dispatchEvent(new Event('solar-archive-library-updated'))
    return row
}

/** `{ gridW, gridH, halfW, halfH }` for ArchiveGrid for the active hub route */
export function readGridDimensionsFromStorage(planetId = 'earth') {
    const c = loadHubArchiveConfig(planetId)
    const gridW = clampGridSide(c.gridWidth, 3840)
    const gridH = clampGridSide(c.gridHeight, 2160)
    return { gridW, gridH, halfW: Math.floor(gridW / 2), halfH: Math.floor(gridH / 2) }
}

export function slugifyArchiveSlug(raw) {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 48)
}

export function loadArchiveRegistry() {
    try {
        const raw = localStorage.getItem(ARCHIVE_REGISTRY_LS)
        const arr = JSON.parse(raw || '[]')
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

export function upsertArchiveRegistryEntry(entry) {
    const list = loadArchiveRegistry().filter((x) => x.slug !== entry.slug)
    list.unshift({
        ...entry,
        publishedAt: entry.publishedAt || new Date().toISOString(),
    })
    localStorage.setItem(ARCHIVE_REGISTRY_LS, JSON.stringify(list.slice(0, 200)))
    window.dispatchEvent(new Event('solar-archive-registry-updated'))
}

/**
 * Downscale image for storage + preview; returns data URL (JPEG).
 */
export function imageFileToCoverDataUrl(file, maxSide = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            let { naturalWidth: w, naturalHeight: h } = img
            if (!w || !h) {
                reject(new Error('Invalid image'))
                return
            }
            const scale = Math.min(1, maxSide / Math.max(w, h))
            const cw = Math.max(1, Math.round(w * scale))
            const ch = Math.max(1, Math.round(h * scale))
            const canvas = document.createElement('canvas')
            canvas.width = cw
            canvas.height = ch
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Canvas unsupported'))
                return
            }
            ctx.drawImage(img, 0, 0, cw, ch)
            try {
                resolve(canvas.toDataURL('image/jpeg', quality))
            } catch {
                reject(new Error('Could not encode image'))
            }
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Could not load image'))
        }
        img.src = url
    })
}
