/**
 * Portable SOLAR archive bundle for download / self-hosting (frontend demo).
 * Import on any deployed build via /#/host-archive → "Import pack".
 */

import {
  addArchiveToLibrary,
  clampGridSide,
  loadHubArchiveConfig,
  saveHubArchiveConfig,
  slugifyArchiveSlug,
} from './archiveInstanceStorage.js'
import { normalizeHubId } from './hubRegistry.js'

export const ARCHIVE_PACK_KIND = 'solar-archive-pack'
export const ARCHIVE_PACK_VERSION = 1

/** @param {object} opts */
export function buildArchivePack(opts) {
  const hubPlanetId = normalizeHubId(opts.hubPlanetId)
  const gridWidth = clampGridSide(opts.gridWidth)
  const gridHeight = clampGridSide(opts.gridHeight)
  const instanceTitle = String(opts.instanceTitle || '').trim() || 'Hosted archive'
  const slug = slugifyArchiveSlug(opts.slug || instanceTitle || 'archive')
  return {
    version: ARCHIVE_PACK_VERSION,
    kind: ARCHIVE_PACK_KIND,
    hubPlanetId,
    gridWidth,
    gridHeight,
    rawWidth: opts.rawWidth != null ? Math.floor(Number(opts.rawWidth)) : null,
    rawHeight: opts.rawHeight != null ? Math.floor(Number(opts.rawHeight)) : null,
    wasClamped: !!opts.wasClamped,
    instanceTitle,
    slug,
    category: String(opts.category || 'general').slice(0, 32) || 'general',
    contactUrl: String(opts.contactUrl || '').trim().slice(0, 500),
    coverImageDataUrl: String(opts.coverImageDataUrl || ''),
    thumbDataUrl: String(opts.thumbDataUrl || ''),
    exportedAt: new Date().toISOString(),
    /** Human note for static hosts */
    clientNote:
      'Open the SOLAR Archive app on your server, go to Host archive → Import pack, and select this JSON file.',
  }
}

export function parseArchivePackJson(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON — choose a .json archive pack exported from this app.')
  }
  if (!data || typeof data !== 'object') throw new Error('Invalid pack file.')
  if (data.kind !== ARCHIVE_PACK_KIND) {
    throw new Error('This file is not a SOLAR archive pack (missing kind).')
  }
  if (Number(data.version) !== 1) {
    throw new Error(`Unsupported pack version: ${data.version}`)
  }
  const hubPlanetId = normalizeHubId(data.hubPlanetId || 'earth')
  const gridWidth = clampGridSide(data.gridWidth || 3840)
  const gridHeight = clampGridSide(data.gridHeight || 2160)
  const instanceTitle = String(data.instanceTitle || 'Imported archive').trim() || 'Imported archive'
  const slug = slugifyArchiveSlug(data.slug || instanceTitle)
  return {
    version: ARCHIVE_PACK_VERSION,
    kind: ARCHIVE_PACK_KIND,
    hubPlanetId,
    gridWidth,
    gridHeight,
    rawWidth: data.rawWidth,
    rawHeight: data.rawHeight,
    wasClamped: data.wasClamped,
    instanceTitle,
    slug,
    category: String(data.category || 'general'),
    contactUrl: String(data.contactUrl || ''),
    coverImageDataUrl: String(data.coverImageDataUrl || ''),
    thumbDataUrl: String(data.thumbDataUrl || ''),
    exportedAt: data.exportedAt || null,
  }
}

export function downloadArchivePackFile(pack, filenameBase = 'solar-archive') {
  const safe = String(filenameBase || 'solar-archive')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'solar-archive'
  const json = JSON.stringify(pack, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe}-pack.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Applies pack to Supabase for one hub + appends to the archive library. Async.
 * @param {ReturnType<typeof buildArchivePack>} pack
 */
export async function applyArchivePackToBrowser(pack, { username = 'guest', userId = null } = {}) {
  const hid = normalizeHubId(pack.hubPlanetId)
  const prev = loadHubArchiveConfig(hid)
  await saveHubArchiveConfig(hid, {
    gridWidth: pack.gridWidth,
    gridHeight: pack.gridHeight,
    coverImageDataUrl: pack.coverImageDataUrl || prev.coverImageDataUrl || '',
    instanceTitle: pack.instanceTitle,
    slug: slugifyArchiveSlug(pack.slug),
    category: pack.category || 'general',
    contactUrl: pack.contactUrl || '',
    listedOnRegistry: false,
  })
  const thumb = pack.thumbDataUrl || ''
  await addArchiveToLibrary({
    slug: slugifyArchiveSlug(pack.slug),
    title: pack.instanceTitle,
    category: pack.category || 'general',
    gridWidth: pack.gridWidth,
    gridHeight: pack.gridHeight,
    contactUrl: pack.contactUrl || '',
    thumb,
    owner: username || 'guest',
    listedOnRegistry: false,
    hubPlanetId: hid,
  }, userId)
  return { hubPlanetId: hid }
}
