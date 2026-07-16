/**
 * Saved layout + branding for a hostable archive instance.
 *
 * Backend: Supabase (`archive_instances`, `archive_registry`, `archive_library`).
 * The read functions (`loadHubArchiveConfig`, `readGridDimensionsFromStorage`,
 * `loadArchiveRegistry`, `loadArchiveLibrary`) stay SYNCHRONOUS — they return
 * from an in-memory cache and kick off a background Supabase hydration on a
 * cache miss, then dispatch the same `solar-archive-*-updated` window events
 * the call sites already listen to, so the UI re-reads once real data lands.
 * The write functions are async (upsert/insert to Supabase, optimistic cache
 * update, event dispatch). This keeps the hot render paths in ArchiveGrid /
 * MapView unchanged while moving the source of truth off localStorage.
 */
import { supabase } from './supabaseClient.js'
import { normalizeHubId } from './hubRegistry.js'

// Legacy localStorage keys — retained as exports for backward compatibility.
// Nothing writes to them anymore.
export const ARCHIVE_INSTANCE_LS = 'solarArchiveInstanceConfig'
export const ARCHIVE_BY_HUB_LS = 'solarArchiveByHub'
export const ARCHIVE_REGISTRY_LS = 'solarArchivePublishedRegistry'
export const ARCHIVE_LIBRARY_LS = 'solarArchiveLibrary'

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

// ── Hub instance config (archive_instances) ─────────────────────────────────

function rowToInstanceConfig(row) {
    const base = defaultArchiveInstance()
    if (!row) return base
    return {
        ...base,
        gridWidth: row.grid_width ?? base.gridWidth,
        gridHeight: row.grid_height ?? base.gridHeight,
        coverImageDataUrl: row.cover_image_data_url ?? '',
        instanceTitle: row.instance_title ?? '',
        slug: row.slug ?? '',
        category: row.category ?? 'general',
        contactUrl: row.contact_url ?? '',
        listedOnRegistry: row.listed_on_registry ?? false,
        updatedAt: row.updated_at ?? '',
    }
}

const hubConfigCache = new Map() // normalized hub id -> config object
const hubHydrating = new Set()

function hydrateHub(id) {
    if (hubHydrating.has(id)) return
    hubHydrating.add(id)
    supabase
        .from('archive_instances')
        .select('*')
        .eq('hub_id', id)
        .maybeSingle()
        .then(({ data }) => {
            hubConfigCache.set(id, data ? rowToInstanceConfig(data) : defaultArchiveInstance())
            if (data) window.dispatchEvent(new Event('solar-archive-instance-updated'))
        })
        .catch(() => { if (!hubConfigCache.has(id)) hubConfigCache.set(id, defaultArchiveInstance()) })
        .finally(() => { hubHydrating.delete(id) })
}

/**
 * Config for one map hub. Synchronous: returns the cached config (default on
 * a cold miss) and hydrates from Supabase in the background.
 */
export function loadHubArchiveConfig(hubId) {
    const id = normalizeHubId(hubId)
    if (hubConfigCache.has(id)) return { ...hubConfigCache.get(id) }
    hydrateHub(id)
    return defaultArchiveInstance()
}

/** Save grid + metadata for a specific hub (planet / Star foundation). Async. */
export async function saveHubArchiveConfig(hubId, patch) {
    const id = normalizeHubId(hubId)
    const prev = hubConfigCache.get(id) || defaultArchiveInstance()
    const next = {
        ...prev,
        ...patch,
        gridWidth: clampGridSide(patch.gridWidth ?? prev.gridWidth, prev.gridWidth),
        gridHeight: clampGridSide(patch.gridHeight ?? prev.gridHeight, prev.gridHeight),
        updatedAt: new Date().toISOString(),
    }
    hubConfigCache.set(id, next) // optimistic
    window.dispatchEvent(new Event('solar-archive-instance-updated'))
    const { error } = await supabase
        .from('archive_instances')
        .upsert({
            hub_id: id,
            grid_width: next.gridWidth,
            grid_height: next.gridHeight,
            cover_image_data_url: next.coverImageDataUrl || '',
            instance_title: next.instanceTitle || '',
            slug: next.slug || '',
            category: next.category || 'general',
            contact_url: next.contactUrl || '',
            listed_on_registry: !!next.listedOnRegistry,
            updated_at: next.updatedAt,
        }, { onConflict: 'hub_id' })
    if (error) {
        const err = new Error('Could not save archive settings to the server. Please try again.')
        err.cause = error
        throw err
    }
    return next
}

/** `{ gridW, gridH, halfW, halfH }` for ArchiveGrid for the active hub route. Synchronous. */
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

// ── Community directory registry (archive_registry) ─────────────────────────

function rowToRegistry(row) {
    return {
        slug: row.slug,
        title: row.title || '',
        hubPlanetId: row.hub_planet_id || '',
        category: row.category || 'general',
        gridWidth: row.grid_width ?? 3840,
        gridHeight: row.grid_height ?? 2160,
        coverThumb: row.cover_thumb || '',
        owner: row.owner || '',
        demoNote: row.demo_note || '',
        publishedAt: row.published_at || '',
    }
}

let registryCache = null // null = not yet hydrated
let registryHydrating = false

function hydrateRegistry() {
    if (registryHydrating) return
    registryHydrating = true
    supabase
        .from('archive_registry')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
            registryCache = (data || []).map(rowToRegistry)
            window.dispatchEvent(new Event('solar-archive-registry-updated'))
        })
        .catch(() => { registryCache = registryCache || [] })
        .finally(() => { registryHydrating = false })
}

/** Community directory rows. Synchronous — hydrates from Supabase on cold miss. */
export function loadArchiveRegistry() {
    if (registryCache === null) {
        hydrateRegistry()
        return []
    }
    return registryCache
}

export async function upsertArchiveRegistryEntry(entry) {
    const publishedAt = entry.publishedAt || new Date().toISOString()
    const payload = {
        slug: entry.slug,
        title: entry.title || '',
        hub_planet_id: entry.hubPlanetId || '',
        category: entry.category || 'general',
        grid_width: entry.gridWidth ?? 3840,
        grid_height: entry.gridHeight ?? 2160,
        cover_thumb: entry.coverThumb || '',
        owner: entry.owner || '',
        demo_note: entry.demoNote || '',
        published_at: publishedAt,
    }
    const mapped = rowToRegistry(payload)
    registryCache = [mapped, ...(registryCache || []).filter((x) => x.slug !== entry.slug)].slice(0, 200)
    window.dispatchEvent(new Event('solar-archive-registry-updated'))
    const { error } = await supabase.from('archive_registry').upsert(payload, { onConflict: 'slug' })
    if (error) {
        const err = new Error('Could not publish this archive to the directory.')
        err.cause = error
        throw err
    }
    return mapped
}

// ── Per-user saved archives library (archive_library) ───────────────────────

function rowToLibrary(row) {
    return {
        id: row.id,
        slug: row.slug || '',
        title: row.title || '',
        hubPlanetId: row.hub_planet_id || '',
        gridWidth: row.grid_width ?? 3840,
        gridHeight: row.grid_height ?? 2160,
        thumb: row.thumb || '',
        category: row.category || 'general',
        contactUrl: row.contact_url || '',
        listedOnRegistry: row.listed_on_registry ?? false,
        savedAt: row.saved_at || '',
    }
}

const libraryCache = new Map() // userId ('_anon' when signed-out) -> array
const libraryHydrating = new Set()

function hydrateLibrary(userId) {
    const key = userId || '_anon'
    if (libraryHydrating.has(key)) return
    libraryHydrating.add(key)
    let q = supabase.from('archive_library').select('*').order('saved_at', { ascending: false }).limit(80)
    q = userId ? q.eq('user_id', userId) : q.is('user_id', null)
    q
        .then(({ data }) => {
            libraryCache.set(key, (data || []).map(rowToLibrary))
            window.dispatchEvent(new Event('solar-archive-library-updated'))
        })
        .catch(() => { if (!libraryCache.has(key)) libraryCache.set(key, []) })
        .finally(() => { libraryHydrating.delete(key) })
}

/** Saved archives for a user. Synchronous — hydrates from Supabase on cold miss. */
export function loadArchiveLibrary(userId) {
    const key = userId || '_anon'
    if (libraryCache.has(key)) return libraryCache.get(key)
    hydrateLibrary(userId)
    return []
}

/** Append one archive record (each successful "Add archive" save). Async. */
export async function addArchiveToLibrary(entry, userId) {
    const key = userId || '_anon'
    const savedAt = entry.savedAt || new Date().toISOString()
    const payload = {
        user_id: userId || null,
        slug: entry.slug || '',
        title: entry.title || '',
        hub_planet_id: entry.hubPlanetId || '',
        grid_width: entry.gridWidth ?? 3840,
        grid_height: entry.gridHeight ?? 2160,
        thumb: entry.thumb || '',
        category: entry.category || 'general',
        contact_url: entry.contactUrl || '',
        listed_on_registry: !!entry.listedOnRegistry,
        saved_at: savedAt,
    }
    const { data, error } = await supabase.from('archive_library').insert(payload).select().maybeSingle()
    if (error) {
        const err = new Error('Could not save this archive to your library.')
        err.cause = error
        throw err
    }
    const mapped = data ? rowToLibrary(data) : rowToLibrary({ ...payload, id: `arc-${Date.now()}` })
    const prev = libraryCache.get(key) || []
    libraryCache.set(key, [mapped, ...prev.filter((x) => x.id !== mapped.id)].slice(0, 80))
    window.dispatchEvent(new Event('solar-archive-library-updated'))
    return mapped
}

// ── Image helpers (pure — no storage) ───────────────────────────────────────

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

export function imageFileToSquareBlob(file, size = 200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            const { naturalWidth: w, naturalHeight: h } = img
            if (!w || !h) {
                reject(new Error('Invalid image'))
                return
            }
            const side = Math.min(w, h)
            const sx = Math.round((w - side) / 2)
            const sy = Math.round((h - side) / 2)
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Canvas unsupported'))
                return
            }
            ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/jpeg', quality)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Could not load image'))
        }
        img.src = url
    })
}
