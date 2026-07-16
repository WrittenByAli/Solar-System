import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef, memo } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowLeft, BookOpen, Layers, Target, ZoomIn, ZoomOut, Crosshair,
  Shield, Zap, Database, Moon, Sun, Download, PenLine, Hand, TextCursor, Globe, Flag, Plus,
  Move, Navigation, ArrowUpDown,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import { buildMergedSectionEntries } from '../utils/archiveSectionEntries.js'
import { supabase } from '../utils/supabaseClient.js'
import fallbackData from '../data/researchData.json'
import SegmentHoverSurface from '../components/SegmentHoverSurface.jsx'
import {
  buildSortedSegments,
  estimateSegmentDifficulty,
  normalizeSegmentsEasiestFirst,
  resolveSegmentDifficulty,
  segmentDifficultyValue,
  segmentText,
} from '../utils/segmentDifficulty.js'
import {
  loadHubArchiveConfig,
} from '../utils/archiveInstanceStorage.js'
import {
  getGridDimensions,
  getHub,
  getHubRegistry,
  normalizeHubId,
} from '../utils/hubRegistry.js'
import { ARCHIVE_SOLAR_PUBLIC_URL } from '../config/archiveFrontend.js'
import {
  TOTAL_LAYERS,
  STATIC_UP_TO,
  CELL_PX,
  L7_SEGMENT_COUNT,
  L7_NARRATIVE_SEGMENT_COUNT,
  L8_SEGMENT_COUNT,
  L8_GRID_COLS,
  L8_FACT_SOURCE_SLOTS,
  L7_SEGMENT_NAV_COLS,
  L7_SEGMENT_NAV_TOTAL,
  L8_NARRATIVE_TILE_TOTAL,
  L8_FINAL_SEGMENT_INDEX,
  L8_CITED_SEGMENT_START_INDEX,
  LAYER_LABELS,
  SUBJECT_STRIDE_X,
  SUBJECT_STRIDE_Y,
  getNarrativeSubmitState,
  L56_NARRATIVE_GATE_MESSAGE,
  L56_NARRATIVE_GATE_SHORT,
  L7_NARRATIVE_GATE_MESSAGE,
  L7_NARRATIVE_GATE_SHORT,
  isL7NarrativeBandComplete,
} from '../utils/archiveLayerSpecs.js'
import { getStaticLatticeTile, getStaticFocusHint } from '../utils/staticLayerMap.js'
import ArchiveCompassView from '../components/ArchiveCompassView.jsx'
import ArchiveL1Atmosphere from '../components/ArchiveL1Atmosphere.jsx'
import ArchiveHubGlobe from '../components/ArchiveHubGlobe.jsx'
import '../styles/archive-l1-atmosphere.css'
import '../styles/archive-nav-responsive.css'
import '../styles/planet-intro.css'
import '../styles/archive-segment-gates.css'
import {
  getHubTaxonomy,
  getHubResearchSections,
  hasHubCompassTaxonomy,
  mergeStaticLayerMapForHub,
} from '../utils/hubTaxonomyRegistry.js'
import { getHubDisciplineCopy } from '../constants/hubDisciplineCopy.js'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData;

/*
 * SOLAR Archive -- configurable cell grid (default 3840×2160).
 *
 * Coordinate System:
 *   - Internal grid indices:  gx ∈ [0, gridW), gy ∈ [0, gridH)
 *   - Displayed coordinates:  lx = gx - halfW,  ly = gy - halfH
 *   - (0, 0) is at the exact center of the grid
 *   - Negative coords are top-left, positive are bottom-right
 *
 * Layer Pixel Sizes (x4 progression):
 *   L1=1, L2=4, L3=16, L4=64, L5=256, L6=1024, L7=4096, L8=16384
 *
 * Performance Model: "Fractional Tile Transform"
 *   1. Integer Viewport (sx, sy) determines which cells to render.
 *   2. Cells are positioned via integer index (c * cp).
 *   3. A parent container handles sub-pixel translation: -(viewX % 1) * cp.
 *   Result: Smooth 120 FPS panning with near-zero React diffing.
 */

/** viewX/viewY = top-left of viewport in grid units; this puts archive center (halfW, halfH) in the middle of the screen */
function clampedCenterViewXY(dims, layer, zoom, vpW, vpH) {
  const { gridW, gridH, halfW, halfH } = dims
  const cp = CELL_PX[layer] * zoom
  const w = Math.max(1, vpW)
  const h = Math.max(1, vpH)
  const maxX = Math.max(0, gridW - w / cp)
  const maxY = Math.max(0, gridH - h / cp)
  const x = Math.max(0, Math.min(maxX, halfW - (w / cp) / 2))
  const y = Math.max(0, Math.min(maxY, halfH - (h / cp) / 2))
  return { x, y }
}

function initialArchiveViewXYForRoute(routePlanetId) {
  const dims = getGridDimensions(normalizeHubId(routePlanetId))
  const vpW = typeof document !== 'undefined' ? Math.max(1, document.documentElement.clientWidth) : 1024
  const vpH = typeof document !== 'undefined' ? Math.max(1, window.innerHeight - 92) : 768
  return clampedCenterViewXY(dims, 1, 1.0, vpW, vpH)
}

function segmentNavStep(idx, dir, cols, total) {
  const safe = Math.max(0, Math.min(total - 1, idx))
  switch (dir) {
    case 'left': return safe > 0 ? safe - 1 : safe
    case 'right': return safe + 1 < total ? safe + 1 : safe
    case 'up': {
      const next = safe - cols
      return next >= 0 ? next : safe
    }
    case 'down': {
      const next = safe + cols
      return next < total ? next : safe
    }
    default: return safe
  }
}

/** Approximate pixel center of segment tile inside one archive cell (matches L7/L8 layout). */
function segmentPixelCenterInCell(layer, segmentIdx) {
  if (layer === 7) {
    const cp = CELL_PX[7]
    const COLS = L7_SEGMENT_NAV_COLS
    const NARR = L7_NARRATIVE_SEGMENT_COUNT
    const PAD = 80
    const GAP = 40
    const innerW = cp - 2 * PAD
    const FOOTER_COL_GAP = 40
    const NARR_TOP = 480
    const availH = 1900
    const ROWS = Math.ceil(NARR / COLS)
    const tileW = (innerW - (COLS - 1) * GAP) / COLS
    const tileH = (availH - (ROWS - 1) * GAP) / ROWS
    const narrativeBottom = NARR_TOP + ROWS * tileH + (ROWS - 1) * GAP
    const FOOTER_GAP_AFTER_NARR = 44
    const footerH = 420

    const safeIdx = Math.max(0, Math.min(L7_SEGMENT_NAV_TOTAL - 1, segmentIdx))
    if (safeIdx >= NARR) {
      const cy = narrativeBottom + FOOTER_GAP_AFTER_NARR + footerH / 2
      const leftW = (innerW - FOOTER_COL_GAP) / 2
      if (safeIdx === NARR) {
        return { cx: PAD + leftW / 2, cy }
      }
      return { cx: PAD + leftW + FOOTER_COL_GAP + leftW / 2, cy }
    }

    const idx = Math.max(0, Math.min(NARR - 1, safeIdx))
    const row = Math.floor(idx / COLS)
    const col = idx % COLS
    const cx = PAD + col * (tileW + GAP) + tileW / 2
    const cy = NARR_TOP + row * (tileH + GAP) + tileH / 2
    return { cx, cy }
  }
  if (layer === 8) {
    const cp = CELL_PX[8]
    const COLS = L8_GRID_COLS
    const TOTAL = L8_SEGMENT_COUNT
    const idx = Math.max(0, Math.min(TOTAL - 1, segmentIdx))
    const PAD = 320
    const GAP = 36
    const GRID_TOP = PAD + 3400
    const ROWS = Math.ceil(TOTAL / COLS)
    const innerW = cp - 2 * PAD
    const tileW = (innerW - (COLS - 1) * GAP) / COLS
    const bottomReserve = 900
    const availH = Math.max(1200, cp - GRID_TOP - PAD - bottomReserve)
    const tileH = (availH - (ROWS - 1) * GAP) / ROWS
    const row = Math.floor(idx / COLS)
    const col = idx % COLS
    const cx = PAD + col * (tileW + GAP) + tileW / 2
    const cy = GRID_TOP + row * (tileH + GAP) + tileH / 2
    return { cx, cy }
  }
  const cp = CELL_PX[layer] || 1024
  return { cx: cp / 2, cy: cp / 2 }
}

function clampViewCenterOnCellPixel(gx, gy, px, py, layer, zoom, vpW, vpH, clampFn) {
  const cp = CELL_PX[layer]
  const scale = cp * zoom
  const vx = gx + px / cp - vpW / (2 * scale)
  const vy = gy + py / cp - vpH / (2 * scale)
  return clampFn(vx, vy)
}

/** Map D-pad (ChevronUp = +Y / row-up) to segment-nav; signs match planet pan: +Y → planet up, −X → planet left. */
function padDeltaToSegmentDir(dx, dy) {
  if (dx === 0 && dy === 1) return 'up'
  if (dx === 0 && dy === -1) return 'down'
  if (dx === 1 && dy === 0) return 'left'
  if (dx === -1 && dy === 0) return 'right'
  return null
}

/** Grid units per D-pad tap/hold for L1-L6 -- L1 cell size is 1px so ±1 is invisible; match keyboard (~4% viewport). */
function panPadStepGridUnits(layer, zoom, vpW, vpH) {
  const cp = CELL_PX[layer] * zoom
  if (!Number.isFinite(cp) || cp <= 0) return 1
  const fx = Math.max(1, Math.round((vpW / cp) * 0.04))
  const fy = Math.max(1, Math.round((vpH / cp) * 0.04))
  return Math.max(fx, fy)
}

// Formats a signed integer to a zero-padded 4-digit string with sign prefix
// e.g. pad4(-5) → "-0005", pad4(12) → "0012"
function pad4(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return sign + String(abs).padStart(4, '0')
}

/** L8 uses a 16384px canvas with ~16px body copy — needs higher zoom than the old 0.25 cap. */
const L8_DEFAULT_ZOOM = 0.55
const L8_MAX_ZOOM = 2.0

/** Zoom that frames roughly one L8 narrative column for readable text. */
function l8ReadableZoom(vpW) {
  const tileFrac = 0.032
  const fit = (vpW * 0.88) / (CELL_PX[8] * tileFrac)
  return Math.max(L8_DEFAULT_ZOOM, Math.min(L8_MAX_ZOOM, fit))
}

/** Per-layer zoom limits so text always stays readable on screen. */
function getZoomLimits(layer) {
  switch (layer) {
    case 2: return { min: 0.5,  max: 8.0  }
    case 3: return { min: 0.3,  max: 6.0  }
    case 4: return { min: 0.4,  max: 4.0  }
    case 5: return { min: 0.2,  max: 3.0  }
    case 6: return { min: 0.15, max: 1.5  }
    case 7: return { min: 0.10, max: 1.5  }
    case 8: return { min: 0.02, max: L8_MAX_ZOOM }
    default: return { min: 0.1, max: 10.0 }
  }
}

/** Parse "lx,ly" display coords (e.g. 0,0 or 100,-1 or -0005,0012) → grid gx,gy */
function parseCoordinateSearchInput(raw, dims) {
  const { halfW, halfH, gridW, gridH } = dims
  const t = raw.trim()
  const m = t.match(/^(-?\d+)\s*,\s*(-?\d+)$/)
  if (!m) return null
  const lx = parseInt(m[1], 10)
  const ly = parseInt(m[2], 10)
  if (!Number.isFinite(lx) || !Number.isFinite(ly)) return null
  const gx = lx + halfW
  const gy = halfH - ly
  if (gx < 0 || gy < 0 || gx >= gridW || gy >= gridH) return null
  return { lx, ly, gx, gy }
}

/** Every populated coordinate on the planet grid, sorted for catalog lists */
function buildGridFactsCatalog(sectionEntries, dims) {
  const { halfW, halfH } = dims
  const rows = []
  if (!sectionEntries || typeof sectionEntries !== 'object') return rows
  Object.entries(sectionEntries).forEach(([key, entry]) => {
    const parts = key.split(',')
    const gx = parseInt(parts[0], 10)
    const gy = parseInt(parts[1], 10)
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) return
    const lx = gx - halfW
    const ly = halfH - gy
    const title = String(entry?.title || '').trim() || 'Untitled entry'
    const summary = String(entry?.shortSummary || '').replace(/\s+/g, ' ').trim().slice(0, 320)
    rows.push({ key, lx, ly, title, summary })
  })
  rows.sort((a, b) => (a.ly !== b.ly ? a.ly - b.ly : a.lx !== b.lx ? a.lx - b.lx : a.title.localeCompare(b.title)))
  return rows
}

/** L8: structured fact + primary source rows (fills to L8_FACT_SOURCE_SLOTS) */
function buildDeepFactSourceSlots(sectionEntries, dims) {
  const slots = []
  const catalog = buildGridFactsCatalog(sectionEntries, dims)

  const push = (coordLabel, title, fact, sourceLabel, sourceHref) => {
    if (slots.length >= L8_FACT_SOURCE_SLOTS) return
    slots.push({
      coordLabel,
      title: title || 'Archive node',
      fact: String(fact || '').replace(/\s+/g, ' ').trim().slice(0, 480),
      sourceLabel: sourceLabel || '',
      sourceHref: sourceHref || '',
    })
  }

  for (const row of catalog) {
    if (slots.length >= L8_FACT_SOURCE_SLOTS) break
    const entry = sectionEntries[row.key]
    if (!entry) continue
    const fullText = entry.content || entry.shortSummary || ''
    const easiest = Array.isArray(entry.segments) && entry.segments.length > 0
      ? segmentText(entry.segments[0])
      : ''
    const firstSentence = (easiest || fullText.split(/[.!?]\s+/)[0] || fullText).trim().slice(0, 440)
    const atts = entry.attachments || []
    const a0 = atts[0]
    push(
      `${pad4(row.lx)},${pad4(row.ly)}`,
      row.title,
      firstSentence || row.summary || row.title,
      a0?.label || (a0?.url || a0?.href ? 'Linked file' : ''),
      a0?.url || a0?.href || '',
    )
  }

  let ci = 0
  while (slots.length < L8_FACT_SOURCE_SLOTS && ci < catalog.length) {
    const row = catalog[ci++]
    const entry = sectionEntries[row.key]
    const atts = entry?.attachments || []
    for (let j = 1; j < atts.length && slots.length < L8_FACT_SOURCE_SLOTS; j++) {
      const a = atts[j]
      push(
        `${pad4(row.lx)},${pad4(row.ly)}`,
        `${row.title} · source ${j + 1}`,
        (entry.shortSummary || '').slice(0, 300).trim() || row.summary.slice(0, 300),
        a.label || 'Attachment',
        a.url || a.href || '',
      )
    }
  }

  let reserve = 1
  while (slots.length < L8_FACT_SOURCE_SLOTS) {
    push(
      '--',
      `Citation reserve ${reserve++}`,
      'Reserved for peer-reviewed references, dataset DOIs, lab notebooks, or instrument traces keyed to this hub.',
      '',
      '',
    )
  }
  return slots.slice(0, L8_FACT_SOURCE_SLOTS)
}

/** Cited-fact tiles backed by a real grid coordinate (not “Citation reserve”). */
function countL8CitationSlotsFilled(slots) {
  if (!Array.isArray(slots)) return 0
  let n = 0
  for (let i = 0; i < Math.min(L8_FACT_SOURCE_SLOTS, slots.length); i++) {
    const s = slots[i]
    if (s?.coordLabel && String(s.coordLabel).trim() !== '--') n++
  }
  return n
}

/**
 * Occupancy of the segment tile grid for HUD (L7: this cell's narrative grid only.
 * L8: planet citation tier + this cell's narrative band + final slot when entry has body).
 */
function computeSegmentGridFill(layer, cellData, citationSlots) {
  const nSeg = Array.isArray(cellData?.segments) ? cellData.segments.length : 0
  const hasBody = !!(cellData?.content && String(cellData.content).trim())

  if (layer === 7) {
    const total = L7_NARRATIVE_SEGMENT_COUNT
    const used = nSeg === 0 ? 0 : Math.min(total, nSeg)
    return {
      pct: Math.round((used / total) * 100),
      used,
      total,
      empty: total - used,
    }
  }

  if (layer === 8) {
    const citedFilled = countL8CitationSlotsFilled(citationSlots)
    const narrSlots = L8_NARRATIVE_TILE_TOTAL
    const narrUsed = nSeg === 0 ? 0 : Math.min(narrSlots, nSeg)
    const finalUsed = nSeg > 0 || hasBody ? 1 : 0
    const used = citedFilled + narrUsed + finalUsed
    const total = L8_SEGMENT_COUNT
    return {
      pct: Math.round((used / total) * 100),
      used,
      total,
      empty: Math.max(0, total - used),
      citedFilled,
      narrUsed,
      narrSlots,
      finalUsed,
    }
  }

  return null
}

// Attachment URLs are user-submitted (archive_entries.attachments is an
// unconstrained jsonb column — client-side validation in SubmitArchive.jsx
// only checks http(s)/file-derived data: URLs, but that's UX only and is
// bypassable by posting directly to the Supabase REST API). This is the
// render-time trust boundary: only an explicit scheme allowlist is safe.
// `javascript:`/`vbscript:` URLs are NOT caught by naive `data:|blob:|https?:`
// prefix checks passing through `new URL()` unscathed (a colon-containing
// string with a valid scheme is treated as absolute regardless of base) —
// confirmed empirically. A crafted javascript: href, once an entry clears
// review (reviewers never render attachments, so this wouldn't be
// eyeballed) executes in the browser of every signed-in viewer who clicks
// it. `data:` is restricted to images only — even though modern Chrome
// blocks top-level navigation to data:text/html from a link, this must not
// rely on that browser mitigation.
// data: is scoped to raster image mime types SubmitArchive.jsx's upload
// input accepts (png/jpeg/gif/webp) + application/pdf — never to arbitrary
// data: mime types like text/html. image/svg+xml is deliberately EXCLUDED:
// unlike raster formats, SVG is XML that can embed a live <script>, and this
// attachment's url is also used as a direct <a href target="_blank"> link
// (not just an <img> src) elsewhere in this file — navigating a browser tab
// straight to a data:image/svg+xml URI executes any embedded script in that
// tab (confirmed: <img>-embedding alone doesn't run SVG script, but this
// direct-navigation path does). The corresponding upload input no longer
// offers .svg/image/svg+xml as pickable types either.
const SAFE_ATTACHMENT_URL_RE = /^(https?:|data:(image\/(?!svg)|application\/pdf)|blob:)/i

function resolveAttachmentUrl(url) {
  if (!url || typeof url !== 'string') return null
  const u = url.trim()
  if (SAFE_ATTACHMENT_URL_RE.test(u)) return u
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null // any other URL scheme (javascript:, vbscript:, file:, …) — reject outright
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const path = u.startsWith('/') ? u.slice(1) : u
  try {
    const resolved = new URL(path, normalizedBase)
    return SAFE_ATTACHMENT_URL_RE.test(resolved.href) || resolved.origin === window.location.origin
      ? resolved.href
      : null
  } catch {
    return null
  }
}

function isCrossOriginHttp(href) {
  if (typeof window === 'undefined' || !/^https?:\/\//i.test(href)) return false
  try {
    return new URL(href).origin !== window.location.origin
  } catch {
    return false
  }
}

function isRenderableImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.trim().toLowerCase()
  if (u.startsWith('data:image/svg')) return false // see SAFE_ATTACHMENT_URL_RE above
  if (u.startsWith('data:image/') || u.startsWith('blob:')) return true
  const noQuery = u.split('?')[0]
  return /\.(png|jpe?g|gif|webp)$/i.test(noQuery)
}

function AttachmentLinks({ attachments, col, isDark, title = 'Files', variant = 'default' }) {
  // resolveAttachmentUrl returns null for unsafe schemes (javascript:, etc.)
  // — drop those entirely rather than render a link with no safe href.
  const list = (attachments || [])
    .filter((a) => a && (a.url || a.href))
    .map((a) => ({ ...a, resolvedHref: resolveAttachmentUrl(a.url || a.href) }))
    .filter((a) => a.resolvedHref !== null)
  if (!list.length) return null
  const accent = isDark ? '#7dd3fc' : '#0369a1'
  const sizes = { compact: { title: 9, li: 9 }, default: { title: 10, li: 11 }, large: { title: 20, li: 18 } }
  const s = sizes[variant] || sizes.default
  return (
    <div style={{ marginTop: variant === 'compact' ? 6 : 14 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: s.title, fontWeight: 800, color: col, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Download size={Math.max(12, s.title + 4)} style={{ opacity: 0.85 }} aria-hidden />
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: variant === 'large' ? 22 : 16, fontSize: s.li, lineHeight: 1.55 }}>
        {list.map((a, i) => {
          const raw = a.url || a.href
          const href = a.resolvedHref
          const kindTag = a.kind ? `[${String(a.kind)}] ` : ''
          const label = kindTag + (a.label || a.filename || (typeof raw === 'string' && !raw.startsWith('data:') ? raw.split('/').pop() : 'File'))
          const external = isCrossOriginHttp(href)
          const isData = href.startsWith('data:')
          const wantDownload = a.download === true || a.download === '' || (typeof a.download === 'string' && a.download.length > 0)
          const downloadName = typeof a.download === 'string' && a.download ? a.download : (a.filename || a.label || 'download')
          const useDownloadAttr = !external && (wantDownload || (isData && a.download !== false && !isRenderableImageUrl(raw)))
          return (
            <li key={i}>
              <a
                href={href}
                style={{ color: accent, fontWeight: 600 }}
                {...(external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : useDownloadAttr
                    ? { download: downloadName }
                    : {})}
              >
                {label}
              </a>
              {external && <span style={{ color: '#64748b', fontSize: Math.max(8, s.li - 2), marginLeft: 6 }}>(new tab)</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Inline thumbnails for image / sketch / graph URLs */
function AttachmentFigures({ attachments, col, isDark, variant = 'default' }) {
  const visual = (attachments || []).filter((a) => {
    const raw = a?.url || a?.href
    return raw && isRenderableImageUrl(raw)
  })
  if (!visual.length) return null
  const gap = variant === 'large' ? 16 : 8
  const maxH = variant === 'large' ? 200 : 56
  const maxW = variant === 'large' ? '100%' : '45%'
  return (
    <div
      style={{
        marginTop: variant === 'compact' ? 8 : 12,
        display: 'flex',
        flexWrap: 'wrap',
        gap,
        alignItems: 'flex-start',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {visual.map((a, i) => {
        const href = resolveAttachmentUrl(a.url || a.href)
        if (href === null) return null // unsafe scheme — isRenderableImageUrl should already exclude these, but never render a null src
        const cap = [a.kind, a.label || `Figure ${i + 1}`].filter(Boolean).join(' · ')
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={cap}
            style={{
              display: 'block',
              maxWidth: maxW,
              border: `1px solid ${col}44`,
              borderRadius: 8,
              overflow: 'hidden',
              background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(248,250,252,0.95)',
            }}
          >
            <img
              src={href}
              alt={a.label || ''}
              style={{ display: 'block', width: '100%', height: 'auto', maxHeight: maxH, objectFit: 'contain' }}
            />
          </a>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════
   REUSABLE UI COMPONENTS
══════════════════════════════════════════════ */
function MetaPanel({ label, value, icon: Icon, color, isDark }) {
  return (
    <div style={{ padding: 12, border: `1px solid ${color}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
      {Icon && <Icon size={14} style={{ color }} />}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 9, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>{value}</span>
      </div>
    </div>
  )
}

function AlternatePerspectivesLinks({ items, col, isDark }) {
  if (!items?.length) return null
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${col}22`, flexShrink: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: col, marginBottom: 4 }}>
        SAME SUBJECT · OTHER SCIENTIFIC VIEW
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#64748b' : '#475569', marginBottom: 10, lineHeight: 1.45 }}>
        These hubs treat overlapping themes through their own lens -- jump to the matching archive cell grid for that domain.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((ap, i) => (
          <Link
            key={i}
            to={`/archive/${String(ap.hubId || '').toLowerCase()}`}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isDark ? '#67e8f9' : '#0284c7',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {ap.label || ap.hubId}
          </Link>
        ))}
      </div>
    </div>
  )
}

function NarrativeGateMessage({ message, shortMessage, isDark, compact }) {
  const short = shortMessage || message
  return (
    <div
      className={`archive-segment-gate ${compact ? 'archive-segment-gate--hud' : ''} ${isDark ? '' : 'archive-segment-gate--light'}`}
      role="status"
      title={compact && short !== message ? message : undefined}
    >
      {compact ? (
        <>
          <span className="archive-segment-gate__short">{short}</span>
          <span className="archive-segment-gate__full">{message}</span>
        </>
      ) : (
        message
      )}
    </div>
  )
}

/** Next sentence slot -- opens Submit with layer + slot (L8 blocked in specs until L7 band is full). */
function SegmentSubmitAddLink({ planetId, lx, ly, archiveLayer, nextSlot, entryId, col, isDark, compact }) {
  const params = new URLSearchParams({
    planet: String(planetId || '').toLowerCase(),
    coordX: String(lx),
    coordY: String(ly),
    archiveLayer: String(archiveLayer),
    nextSegmentSlot: String(nextSlot),
  })
  if (entryId) params.set('updatesEntryId', String(entryId))
  const fs = compact ? 9 : 12
  const iconSz = compact ? 11 : 15
  return (
    <Link
      to={`/submit?${params.toString()}`}
      onClick={(e) => e.stopPropagation()}
      title={`Add narrative sentence -- slot ${nextSlot} of ${archiveLayer === 7 ? L7_NARRATIVE_SEGMENT_COUNT : L8_NARRATIVE_TILE_TOTAL}`}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: fs,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textDecoration: 'none',
        padding: compact ? '2px 8px' : '4px 12px',
        borderRadius: 8,
        border: `1px solid ${col}55`,
        color: col,
        background: isDark ? `${col}14` : `${col}10`,
      }}
    >
      <Plus size={iconSz} strokeWidth={2.5} aria-hidden />
      Add
    </Link>
  )
}

/** Deep-links to /submit to add a missing L5 summary or L6 detail to an existing entry. */
function AddMissingDepthLink({ planetId, lx, ly, archiveLayer, entryId, col, isDark }) {
  const params = new URLSearchParams({
    planet: String(planetId || '').toLowerCase(),
    coordX: String(lx),
    coordY: String(ly),
    archiveLayer: String(archiveLayer),
  })
  if (entryId) params.set('updatesEntryId', String(entryId))
  return (
    <Link
      to={`/submit?${params.toString()}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textDecoration: 'none',
        padding: '2px 8px',
        borderRadius: 8,
        border: `1px solid ${col}55`,
        color: col,
        background: isDark ? `${col}14` : `${col}10`,
      }}
    >
      <Plus size={11} strokeWidth={2.5} aria-hidden />
      Add L{archiveLayer} {archiveLayer === 5 ? 'summary' : 'detail'}
    </Link>
  )
}

/** Opens submit flow pre-filled for segment moderation reports (L6-L8). */
function SegmentReportLink({
  planetId,
  lx,
  ly,
  archiveLayer,
  segmentIndex,
  segmentLabel,
  excerpt,
  isDark,
  compact,
}) {
  const params = new URLSearchParams({
    intent: 'segmentReport',
    planet: String(planetId || '').toLowerCase(),
    coordX: String(lx),
    coordY: String(ly),
    archiveLayer: String(archiveLayer),
    segmentIndex: String(segmentIndex),
  })
  if (segmentLabel) params.set('segmentLabel', String(segmentLabel).slice(0, 120))
  const ex = String(excerpt || '').replace(/\s+/g, ' ').trim()
  if (ex) params.set('excerpt', ex.slice(0, 300))
  const fs = compact ? 9 : 13
  const icon = compact ? 11 : 15
  const pad = compact ? '2px 8px' : '4px 12px'
  return (
    <Link
      to={`/submit?${params.toString()}`}
      onClick={(e) => e.stopPropagation()}
      title="Report this segment for moderator review"
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: fs,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textDecoration: 'none',
        padding: pad,
        borderRadius: 8,
        border: `1px solid ${isDark ? 'rgba(248,113,113,0.5)' : 'rgba(220,38,38,0.4)'}`,
        color: isDark ? '#fca5a5' : '#b91c1c',
        background: isDark ? 'rgba(127,29,29,0.28)' : 'rgba(254,226,226,0.95)',
      }}
    >
      <Flag size={icon} strokeWidth={2.5} aria-hidden />
      Report
    </Link>
  )
}

/* ══════════════════════════════════════════════
   CELL LAYOUTS (L4-L8)
   lx/ly = display coordinates (centered, signed)
══════════════════════════════════════════════ */

// L4: 64px - Zone View (title + coords -- matches deeper layers' subject hierarchy)
const L4Content = memo(function L4Content({ lx, ly, data, col, isDark, compassSelected }) {
  const sum = String(data?.shortSummary || '').trim()
  const title =
    String(data?.title || '').trim() ||
    (sum ? `${sum.slice(0, 72)}${sum.length > 72 ? '…' : ''}` : '')
  const highlighted = compassSelected && !!data
  return (
    <div style={{
      padding: '3px 3px 2px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      boxSizing: 'border-box',
      ...(highlighted ? {
        background: `${col}18`,
        borderRadius: 3,
        boxShadow: `inset -2px -2px 0 0 ${col}44, 0 0 6px ${col}33`,
        transform: 'translate(-1px, -1px)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      } : {}),
    }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {title ? (
          <div
            title={title}
            style={{
              fontSize: title.length > 72 ? 5.2 : title.length > 48 ? 5.8 : 6.5,
              fontWeight: 800,
              color: highlighted ? (isDark ? '#fff' : '#0f172a') : (isDark ? '#f8fafc' : '#0f172a'),
              lineHeight: 1.08,
              display: 'block',
              maxHeight: 55,
              overflow: 'visible',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              textShadow: highlighted ? `0 0 8px ${col}88` : 'none',
            }}
          >
            {title}
          </div>
        ) : null}
      </div>
      <div style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 6,
        color: isDark ? `${col}99` : `${col}bb`,
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {pad4(lx)},{pad4(ly)}
      </div>
    </div>
  )
})

// L5: 256px - Summary
const L5Content = memo(function L5Content({ lx, ly, data, col, isDark, planetId }) {
  const hasAtt = (data?.attachments || []).length > 0
  const hasSummary = !!(data?.shortSummary && String(data.shortSummary).trim())
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, color: col, marginBottom: 8, fontWeight: 800 }}>{pad4(lx)},{pad4(ly)} · SUMMARY</div>
      <div style={{
        fontWeight: 800, fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a',
        marginBottom: 6, lineHeight: 1.25, flexShrink: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', wordBreak: 'break-word',
      }}>{data?.title || 'Pending Entry'}</div>
      <p style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.5, flex: 1, overflow: 'hidden', minHeight: 0, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical',
      }}>{data?.shortSummary || 'Waiting for contribution...'}</p>
      {!hasSummary && data?.title && (
        <AddMissingDepthLink planetId={planetId} lx={lx} ly={ly} archiveLayer={5} entryId={data?.id} col={col} isDark={isDark} />
      )}
      <AlternatePerspectivesLinks items={data?.alternatePerspectives} col={col} isDark={isDark} />
      {hasAtt && (
        <div style={{ marginTop: 'auto', paddingTop: 6, flexShrink: 0 }}>
          <AttachmentFigures attachments={data.attachments} col={col} isDark={isDark} variant="compact" />
          <AttachmentLinks attachments={data.attachments} col={col} isDark={isDark} title="Files" variant="compact" />
        </div>
      )}
    </div>
  )
})

/** Empty L7/L8 tiles: dotted frame + corner crosses -- no placeholder prose. */
function EmptySegmentSlotFrame({ col, isDark, minHeight = 100 }) {
  const edge = isDark ? `${col}55` : `${col}42`
  const cornerCol = isDark ? `${col}aa` : `${col}88`
  const corners = [
    { top: 6, left: 8 },
    { top: 6, right: 8 },
    { bottom: 6, left: 8 },
    { bottom: 6, right: 8 },
  ]
  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        minHeight,
        minWidth: 0,
        border: `2px dotted ${edge}`,
        borderRadius: 10,
        background: isDark ? 'rgba(0,0,0,0.14)' : 'rgba(248,250,252,0.55)',
        boxSizing: 'border-box',
      }}
    >
      {corners.map((pos, idx) => (
        <span
          key={idx}
          style={{
            position: 'absolute',
            fontSize: 12,
            fontWeight: 900,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: cornerCol,
            lineHeight: 1,
            pointerEvents: 'none',
            ...pos,
          }}
        >
          +
        </span>
      ))}
    </div>
  )
}

function SegmentDifficultyBadge({ difficulty, isDark, fontSize = 9 }) {
  if (difficulty == null) return null
  const label = `${difficulty}/5`
  return (
    <span
      title="Estimated comprehension difficulty for this segment (1 = easiest)"
      style={{
        fontSize,
        fontWeight: 800,
        letterSpacing: '0.04em',
        color: isDark ? '#fde68a' : '#b45309',
        background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.2)',
        border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(180,83,9,0.35)'}`,
        borderRadius: 6,
        padding: '2px 8px',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

// L6: 1024px -- segments ordered easiest → hardest, each with difficulty badge
const L6Content = memo(function L6Content({ lx, ly, data, col, isDark, planetId }) {
  const coordLabel = `${pad4(lx)},${pad4(ly)}`
  const orderedSegments = useMemo(() => {
    const entryDiff = data?.consensusDifficulty ?? data?.difficulty ?? null
    let raw = []
    if (Array.isArray(data?.segments) && data.segments.length > 0) {
      raw = data.segments
    } else {
      const full = String(data?.content || '').trim()
      if (!full) raw = []
      else {
        const strings = (full.match(/[^.!?]+[.!?]*/g) || [full]).map((s) => s.trim()).filter(Boolean)
        raw = strings.length ? buildSortedSegments(strings, entryDiff) : []
      }
    }
    return normalizeSegmentsEasiestFirst(raw, entryDiff)
  }, [data?.segments, data?.content, data?.difficulty, data?.consensusDifficulty])

  return (
    <div style={{ width: 1024, height: 1024, display: 'flex', flexDirection: 'column', border: `1px solid ${col}22`, background: isDark ? 'rgba(4,2,12,0.98)' : 'rgba(255,255,255,0.98)' }}>
      <div style={{ display: 'flex', height: 260, borderBottom: `1px solid ${col}22`, flexShrink: 0 }}>
        <div style={{ width: 220, padding: 22, borderRight: `1px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(240,248,255,0.5)' }}>
          <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, color: col, marginBottom: 16 }}>STORAGE UNIT INF-6</div>
          <MetaPanel label="X COORD" value={pad4(lx)} color={col} isDark={isDark} />
          <div style={{ height: 8 }} />
          <MetaPanel label="Y COORD" value={pad4(ly)} color={col} isDark={isDark} />
        </div>
        <div style={{ flex: 1, padding: 26, overflow: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 12, letterSpacing: '0.1em' }}>ARCHIVE OVERVIEW</div>
          {data?.shortSummary && <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.8 }}>{data.shortSummary}</div>}
          <AlternatePerspectivesLinks items={data?.alternatePerspectives} col={col} isDark={isDark} />
          <AttachmentFigures attachments={data?.attachments} col={col} isDark={isDark} variant="default" />
          <AttachmentLinks attachments={data?.attachments} col={col} isDark={isDark} title="DOWNLOADS" variant="default" />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderTop: `1px solid ${col}18` }}>
        <div style={{ padding: '14px 28px 10px', flexShrink: 0, fontSize: 10, fontWeight: 900, color: col, letterSpacing: '0.12em' }}>
          SEGMENTS · EASIEST → HARDEST ({orderedSegments.length || '--'})
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 28px 24px' }}>
          {orderedSegments.length === 0 ? (
            data?.detail?.trim() ? (
              <SegmentHoverSurface
                coordLabel={coordLabel}
                difficulty={estimateSegmentDifficulty(data.detail)}
                accentColor={col}
                isDark={isDark}
                style={{ cursor: 'default' }}
              >
                <div style={{ fontSize: 12, lineHeight: 1.85, color: isDark ? '#94a3b8' : '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col }}>FULL TEXT</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(data.detail)} isDark={isDark} fontSize={10} />
                      <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={6} segmentIndex="full" segmentLabel="FULL TEXT · single block" excerpt={data.detail} col={col} isDark={isDark} compact />
                    </div>
                  </div>
                  {data.detail}
                </div>
              </SegmentHoverSurface>
            ) : (
              <div style={{ padding: '24px 0', color: isDark ? '#64748b' : '#475569', fontSize: 11, fontStyle: 'italic' }}>
                No segments submitted yet.
                {data?.title && (
                  <div>
                    <AddMissingDepthLink planetId={planetId} lx={lx} ly={ly} archiveLayer={6} entryId={data?.id} col={col} isDark={isDark} />
                  </div>
                )}
              </div>
            )
          ) : (
            orderedSegments.map((seg, idx) => (
              <SegmentHoverSurface
                key={idx}
                coordLabel={coordLabel}
                difficulty={resolveSegmentDifficulty(seg)}
                accentColor={col}
                isDark={isDark}
                style={{
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.08)'}`,
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: col }}>#{idx + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <SegmentDifficultyBadge difficulty={segmentDifficultyValue(seg)} isDark={isDark} fontSize={10} />
                    <SegmentReportLink
                      planetId={planetId}
                      lx={lx}
                      ly={ly}
                      archiveLayer={6}
                      segmentIndex={String(idx + 1)}
                      segmentLabel={`L6 segment #${idx + 1}`}
                      excerpt={segmentText(seg)}
                      col={col}
                      isDark={isDark}
                      compact
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.75, color: isDark ? '#94a3b8' : '#1e293b' }}>{segmentText(seg)}</div>
              </SegmentHoverSurface>
            ))
          )}
        </div>
      </div>
    </div>
  )
})

// L7: 4096px - Intermediate
const L7_CITED_PREVIEW_MAX = 8

const L7Content = memo(function L7Content({ lx, ly, data, col, isDark, gridFactsCatalog, deepFactSources, planetId }) {
  const catalog = gridFactsCatalog || []
  const citations = Array.isArray(deepFactSources) ? deepFactSources : []
  const citedPreview = citations.slice(0, L7_CITED_PREVIEW_MAX)

  const entryDiff = data?.consensusDifficulty ?? data?.difficulty ?? null
  const orderedSegments = useMemo(
    () => normalizeSegmentsEasiestFirst(Array.isArray(data?.segments) ? data.segments : [], entryDiff),
    [data?.segments, entryDiff],
  )

  const renderGridReferences = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minHeight: 0, flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: col }}>SEGMENT {L7_SEGMENT_COUNT} · GRID REFERENCES</div>
      <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
        {catalog.length === 0 ? (
          <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#475569', lineHeight: 1.7 }}>
            No cross-grid references indexed for this hub yet.
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, lineHeight: 1.5, color: isDark ? '#94a3b8' : '#475569' }}>
            {catalog.map((row) => (
              <li key={row.key} style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', color: col, fontWeight: 700 }}>
                  {pad4(row.lx)},{pad4(row.ly)}
                </span>
                {' · '}
                <strong style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{row.title}</strong>
                {row.summary ? (
                  <div style={{ marginTop: 4, fontSize: 9, opacity: 0.92 }}>{row.summary}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const narrativeSegCount = orderedSegments.length
  const coordLabel = `${pad4(lx)},${pad4(ly)}`

  return (
    <div style={{ width: 4096, height: 4096, display: 'flex', flexDirection: 'column', background: isDark ? '#050412' : '#f8fafc', padding: 80 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30, marginBottom: 80 }}>
        <MetaPanel label="PRIMARY SCALE" value="4,096 PX" icon={Database} color={col} isDark={isDark} />
        <MetaPanel label="DATA INTEGRITY" value="NOMINAL (99.8%)" icon={Shield} color={col} isDark={isDark} />
        <MetaPanel label="LATENCY" value="2.4 MS" icon={Zap} color={col} isDark={isDark} />
        <MetaPanel label="X,Y ORIGIN" value={`${pad4(lx)},${pad4(ly)}`} icon={Target} color={col} isDark={isDark} />
      </div>
      {(data?.attachments || []).length > 0 && (
        <div style={{ marginBottom: 48, paddingBottom: 36, borderBottom: `1px solid ${col}33` }} onClick={(e) => e.stopPropagation()}>
          <AttachmentFigures attachments={data.attachments} col={col} isDark={isDark} variant="large" />
          <AttachmentLinks attachments={data.attachments} col={col} isDark={isDark} title="DOWNLOADS" variant="large" />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 44, borderTop: `1px solid ${col}33`, paddingTop: 60, overflow: 'hidden', minHeight: 0 }}>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: isDark ? '#64748b' : '#475569' }}>
          <strong style={{ color: col }}>Narrative tiles</strong>
          {' '}repeat sentences in <strong>difficulty order</strong> (easiest → hardest). Labels show rank within this entry; badges show comprehension difficulty (1-5).
          {' '}Segments <strong style={{ color: col }}>{L7_SEGMENT_COUNT - 1}-{L7_SEGMENT_COUNT}</strong> are <strong>cited facts</strong> and <strong>grid references</strong> (not filled from your submission text).
        </p>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 40, overflow: 'hidden', minHeight: 0 }}>
          {Array.from({ length: L7_SEGMENT_COUNT - 2 }).map((_, i) => {
            const seg = i < orderedSegments.length ? orderedSegments[i] : null
            if (!seg) {
              /* L5 = shortSummary, L6 = detailedSummary / detail / description */
              const hasL5 = !!(data?.shortSummary && String(data.shortSummary).trim())
              const hasL6 = !!(
                (data?.detailedSummary && String(data.detailedSummary).trim()) ||
                (data?.detail && String(data.detail).trim()) ||
                (data?.description && String(data.description).trim())
              )
              const l5l6Ready = hasL5 && hasL6
              const isNextSlot = i === narrativeSegCount && narrativeSegCount < L7_NARRATIVE_SEGMENT_COUNT
              const showAddHere  = isNextSlot && l5l6Ready
              const showL56Gate  = isNextSlot && !l5l6Ready
              return (
                <SegmentHoverSurface
                  key={i}
                  coordLabel={coordLabel}
                  difficulty={null}
                  accentColor={col}
                  isDark={isDark}
                  style={{ display: 'flex', flexDirection: 'column', gap: 15, overflow: 'hidden', cursor: 'default', minHeight: 0 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: col }}>TILE {i + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {showAddHere ? (
                        <SegmentSubmitAddLink
                          planetId={planetId}
                          lx={lx}
                          ly={ly}
                          archiveLayer={7}
                          nextSlot={i + 1}
                          entryId={data?.id}
                          col={col}
                          isDark={isDark}
                          compact
                        />
                      ) : null}
                      <SegmentReportLink
                        planetId={planetId}
                        lx={lx}
                        ly={ly}
                        archiveLayer={7}
                        segmentIndex={String(i + 1)}
                        segmentLabel={`L7 TILE ${i + 1} (empty)`}
                        excerpt=""
                        col={col}
                        isDark={isDark}
                        compact
                      />
                    </div>
                  </div>
                  <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={140} />
                  {showL56Gate && (
                    <div style={{ fontSize: 10, lineHeight: 1.5, color: isDark ? '#64748b' : '#475569', fontWeight: 600 }}>
                      Add L5 (summary) and L6 (detail) content at this coordinate before authoring narrative tiles.
                      Easiest segments (difficulty 1) fill L7 first; harder segments automatically advance to L8 once L7 is complete.
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {!hasL5 && <AddMissingDepthLink planetId={planetId} lx={lx} ly={ly} archiveLayer={5} entryId={data?.id} col={col} isDark={isDark} />}
                        {!hasL6 && <AddMissingDepthLink planetId={planetId} lx={lx} ly={ly} archiveLayer={6} entryId={data?.id} col={col} isDark={isDark} />}
                      </div>
                    </div>
                  )}
                </SegmentHoverSurface>
              )
            }
            const body = segmentText(seg)
            const diff = segmentDifficultyValue(seg)
            const rankInOrder = i + 1
            return (
              <SegmentHoverSurface
                key={i}
                coordLabel={coordLabel}
                difficulty={resolveSegmentDifficulty(seg)}
                accentColor={col}
                isDark={isDark}
                style={{ display: 'flex', flexDirection: 'column', gap: 15, overflow: 'hidden', cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: col }}>
                    RANK {rankInOrder}/{narrativeSegCount}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <SegmentDifficultyBadge difficulty={diff} isDark={isDark} />
                    <SegmentReportLink
                      planetId={planetId}
                      lx={lx}
                      ly={ly}
                      archiveLayer={7}
                      segmentIndex={String(i + 1)}
                      segmentLabel={`L7 narrative tile · rank ${rankInOrder}`}
                      excerpt={body}
                      col={col}
                      isDark={isDark}
                      compact
                    />
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: isDark ? '#64748b' : '#475569', lineHeight: 1.8,
                  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 18, overflow: 'hidden'
                }}
                >
                  {body}
                </div>
              </SegmentHoverSurface>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, flexShrink: 0, minHeight: 420, maxHeight: '42%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', borderTop: `1px solid ${col}22`, paddingTop: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: col }}>SEGMENT {L7_SEGMENT_COUNT - 1} · CITED FACTS</div>
            <div style={{ flex: 1, overflow: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {citedPreview.length === 0 ? (
                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#475569', lineHeight: 1.7 }}>
                  Cited fact slots populate from hub references and attachments (preview shows up to {L7_CITED_PREVIEW_MAX}).
                </div>
              ) : (
                citedPreview.map((slot, ci) => {
                  const prevN = ci + 1
                  const isReserve = !slot || String(slot.coordLabel || '').trim() === '--'
                  if (isReserve) {
                    return (
                      <div
                        key={`l7c-${ci}`}
                        style={{
                          border: `1px solid ${col}28`,
                          borderRadius: 8,
                          padding: 12,
                          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(248,250,252,0.88)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: col }}>CITED {prevN}</span>
                          <SegmentReportLink
                            planetId={planetId}
                            lx={lx}
                            ly={ly}
                            archiveLayer={7}
                            segmentIndex={`l7-cited-preview-${prevN}-empty`}
                            segmentLabel={`L7 cited fact preview ${prevN} (empty)`}
                            excerpt=""
                            col={col}
                            isDark={isDark}
                            compact
                          />
                        </div>
                        <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={72} />
                      </div>
                    )
                  }
                  const href = slot.sourceHref ? resolveAttachmentUrl(slot.sourceHref) : ''
                  const hasLink = href && href !== '#'
                  const external = hasLink && isCrossOriginHttp(href)
                  const accent = isDark ? '#7dd3fc' : '#0369a1'
                  return (
                    <div
                      key={`l7c-${ci}`}
                      style={{
                        border: `1px solid ${col}28`,
                        borderRadius: 8,
                        padding: 12,
                        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(248,250,252,0.95)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: col }}>CITED {prevN}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(slot.fact)} isDark={isDark} fontSize={10} />
                          <SegmentReportLink
                            planetId={planetId}
                            lx={lx}
                            ly={ly}
                            archiveLayer={7}
                            segmentIndex={`l7-cited-preview-${prevN}`}
                            segmentLabel={`L7 cited fact preview ${prevN}`}
                            excerpt={[slot.title, slot.fact].filter(Boolean).join(' -- ')}
                            col={col}
                            isDark={isDark}
                            compact
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', color: col, opacity: 0.95, marginTop: 6 }}>{slot.coordLabel}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', marginTop: 4, lineHeight: 1.25 }}>{slot.title}</div>
                      <p style={{
                        margin: '8px 0 0',
                        fontSize: 10,
                        color: isDark ? '#94a3b8' : '#475569',
                        lineHeight: 1.55,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 4,
                        overflow: 'hidden',
                      }}
                      >
                        {slot.fact}
                      </p>
                      <div style={{ fontSize: 9, fontWeight: 900, color: col, letterSpacing: '0.08em', marginTop: 10 }}>SOURCE</div>
                      {hasLink ? (
                        <a
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          style={{ fontSize: 10, fontWeight: 600, color: accent, wordBreak: 'break-word' }}
                        >
                          {slot.sourceLabel || href}
                        </a>
                      ) : (
                        <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#475569' }}>{slot.sourceLabel || '--'}</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', borderTop: `1px solid ${col}22`, paddingTop: 28 }}>
            {renderGridReferences()}
          </div>
        </div>
      </div>
    </div>
  )
})

// Lightweight tile wrapper for L8 — replaces SegmentHoverSurface to avoid 2700 stateful instances
function L8Tile({ children, style }) {
  return <div style={{ cursor: 'default', overflow: 'hidden', minWidth: 0, ...style }}>{children}</div>
}

// L8: 16384px - Deep Full
const L8Content = memo(function L8Content({ lx, ly, data, col, isDark, deepFactSources, planetId, visYMin = 0, visYMax = Infinity }) {
  const citations = deepFactSources || []
  const entryDiff = data?.consensusDifficulty ?? data?.difficulty ?? null
  const orderedNarrativeSegs = useMemo(
    () => normalizeSegmentsEasiestFirst(Array.isArray(data?.segments) ? data.segments : [], entryDiff),
    [data?.segments, entryDiff],
  )
  const narrativeSegCount = orderedNarrativeSegs.length

  // Row windowing constants for the narrative grid
  const APPROX_HEADER_H = 1800  // padding + meta panels + intro text (px above the grid)
  const APPROX_ROW_H    = 900   // minHeight(700) + gap(36) + overhead
  const TOTAL_NARR_ROWS = Math.ceil((L8_NARRATIVE_TILE_TOTAL + 1) / L8_GRID_COLS) // +1 for final slot
  const firstVisRow = Math.max(0, Math.floor((visYMin - APPROX_HEADER_H) / APPROX_ROW_H) - 1)
  const lastVisRow  = Math.min(TOTAL_NARR_ROWS - 1, Math.ceil((visYMax - APPROX_HEADER_H) / APPROX_ROW_H) + 1)
  const skipBefore  = firstVisRow
  const skipAfter   = Math.max(0, TOTAL_NARR_ROWS - 1 - lastVisRow)

  return (
    <div style={{ width: 16384, height: 16384, display: 'flex', flexDirection: 'column', background: isDark ? '#020208' : '#ffffff', padding: 320, contain: 'layout style paint' }}>
      {/* 4x scaled MetaPanels to perfectly match L7's design array */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 120, marginBottom: 320 }}>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Database size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIMARY SCALE</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>16,384 PX</span>
          </div>
        </div>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Shield size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATA INTEGRITY</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>FULL DEPTH</span>
          </div>
        </div>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Zap size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COMPUTATION</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>QUANTUM EXT.</span>
          </div>
        </div>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Target size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>X,Y ORIGIN</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>{pad4(lx)},{pad4(ly)}</span>
          </div>
        </div>
      </div>
      {(data?.attachments || []).length > 0 && (
        <div style={{ marginBottom: 200, paddingBottom: 120, borderBottom: `2px solid ${col}33` }} onClick={(e) => e.stopPropagation()}>
          <AttachmentFigures attachments={data.attachments} col={col} isDark={isDark} variant="large" />
          <AttachmentLinks attachments={data.attachments} col={col} isDark={isDark} title="DOWNLOADS" variant="large" />
        </div>
      )}
      <p style={{
        margin: '0 0 80px',
        fontSize: 36,
        lineHeight: 1.45,
        color: isDark ? '#64748b' : '#475569',
        maxWidth: 14800,
      }}
      >
        <strong style={{ color: col }}>Narrative columns</strong>
        {' '}repeat sentences in <strong>difficulty order</strong> (easiest → hardest). The <strong style={{ color: col }}>final</strong> slot stitches the full-depth narrative block.
      </p>

      {/* ── Narrative + Final grid — row-windowed for performance ── */}
      <div style={{ borderTop: `4px solid ${col}33`, paddingTop: 120, paddingBottom: 120 }}>
        {skipBefore > 0 && <div style={{ height: skipBefore * APPROX_ROW_H }} />}
        {Array.from({ length: Math.max(0, lastVisRow - firstVisRow + 1) }, (_, ri) => {
          const row = firstVisRow + ri
          const rowStart = row * L8_GRID_COLS
          const rowEnd = Math.min(rowStart + L8_GRID_COLS, L8_CITED_SEGMENT_START_INDEX)
          return (
            <div key={row} style={{ display: 'grid', gridTemplateColumns: `repeat(${L8_GRID_COLS}, 1fr)`, gap: 36, marginBottom: 36 }}>
              {Array.from({ length: rowEnd - rowStart }, (_, ci) => {
                const i = rowStart + ci
                if (i < L8_NARRATIVE_TILE_TOTAL) {
                  const nar = i
                  const narSeg = nar < orderedNarrativeSegs.length ? orderedNarrativeSegs[nar] : null
                  if (!narSeg) {
                    const l7Done = isL7NarrativeBandComplete(data)
                    const showAddHere = nar === narrativeSegCount && narrativeSegCount < L8_NARRATIVE_TILE_TOTAL && l7Done
                    const showL7Gate = nar === narrativeSegCount && narrativeSegCount < L8_NARRATIVE_TILE_TOTAL && !l7Done
                    return (
                      <L8Tile key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 20, fontWeight: 900, color: col }}>SLOT {i + 1}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            {showAddHere && <SegmentSubmitAddLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} nextSlot={nar + 1} entryId={data?.id} col={col} isDark={isDark} compact />}
                            <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`narr-${i + 1}-empty`} segmentLabel={`L8 narrative slot ${i + 1} (empty)`} excerpt="" col={col} isDark={isDark} compact />
                          </div>
                        </div>
                        <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={700} />
                        {showL7Gate && <div style={{ fontSize: 14, lineHeight: 1.5, color: isDark ? '#a8a29e' : '#57534e', fontWeight: 600 }}>Complete all {L7_NARRATIVE_SEGMENT_COUNT} Layer&nbsp;7 narrative tiles for this coordinate before drafting Layer&nbsp;8 sentences.</div>}
                      </L8Tile>
                    )
                  }
                  return (
                    <L8Tile key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: col }}>RANK {nar + 1}/{narrativeSegCount}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <SegmentDifficultyBadge difficulty={segmentDifficultyValue(narSeg)} isDark={isDark} fontSize={15} />
                          <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`narr-${i + 1}`} segmentLabel={`L8 narrative · rank ${nar + 1}`} excerpt={segmentText(narSeg)} col={col} isDark={isDark} compact />
                        </div>
                      </div>
                      <div style={{ fontSize: 16, color: isDark ? '#64748b' : '#475569', lineHeight: 1.65, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 44, overflow: 'hidden', minHeight: 600 }}>{segmentText(narSeg)}</div>
                    </L8Tile>
                  )
                }
                if (i === L8_FINAL_SEGMENT_INDEX) {
                  const allSegs = orderedNarrativeSegs
                  if (allSegs.length === 0) {
                    const hasBody = !!(data?.content && String(data.content).trim())
                    if (!hasBody) {
                      return (
                        <L8Tile key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 20, fontWeight: 900, color: col }}>FINAL SLOT · FULL TEXT</span>
                            <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`final-${L8_FINAL_SEGMENT_INDEX + 1}-empty`} segmentLabel="L8 final slot (empty · no body)" excerpt="" col={col} isDark={isDark} compact />
                          </div>
                          <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={900} />
                        </L8Tile>
                      )
                    }
                    const blob = data.content
                    return (
                      <L8Tile key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 20, fontWeight: 900, color: col }}>FINAL SLOT · FULL TEXT</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(blob)} isDark={isDark} fontSize={15} />
                            <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`final-${L8_FINAL_SEGMENT_INDEX + 1}-full`} segmentLabel="L8 final slot · full text block" excerpt={blob} col={col} isDark={isDark} compact />
                          </div>
                        </div>
                        <div style={{ fontSize: 16, color: isDark ? '#64748b' : '#475569', lineHeight: 1.65, overflow: 'auto', flex: 1, minHeight: 0 }}>{blob}</div>
                      </L8Tile>
                    )
                  }
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden', minWidth: 0, minHeight: 0, cursor: 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: col }}>ALL SEGMENTS · EASIEST → HARDEST ({allSegs.length})</span>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
                        {allSegs.map((seg, si) => (
                          <L8Tile key={si} style={{ paddingBottom: 24, borderBottom: `2px solid ${isDark ? 'rgba(79,195,247,0.15)' : `${col}33`}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                              <span style={{ fontSize: 17, fontWeight: 900, color: col }}>#{si + 1}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <SegmentDifficultyBadge difficulty={segmentDifficultyValue(seg)} isDark={isDark} fontSize={15} />
                                <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`final-aggregate-${si + 1}`} segmentLabel={`L8 final slot · aggregate list · #${si + 1}`} excerpt={segmentText(seg)} col={col} isDark={isDark} compact />
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: isDark ? '#64748b' : '#475569' }}>{segmentText(seg)}</p>
                          </L8Tile>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>
          )
        })}
        {skipAfter > 0 && <div style={{ height: skipAfter * APPROX_ROW_H }} />}
      </div>

      {/* ── Cited Facts & Sources ── */}
      <div style={{ marginTop: 160, paddingTop: 100, borderTop: `6px solid ${col}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 48, marginBottom: 100, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <Database size={52} style={{ color: col, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 44, fontWeight: 900, color: col, letterSpacing: '0.05em', lineHeight: 1 }}>CITED FACTS & SOURCES</div>
              <div style={{ fontSize: 28, color: isDark ? '#64748b' : '#475569', marginTop: 12 }}>{L8_FACT_SOURCE_SLOTS} citation slots · primary references for this coordinate</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 40 }}>
          {Array.from({ length: L8_FACT_SOURCE_SLOTS }).map((_, citedIdx) => {
            const slot = citations[citedIdx]
            const isReserve = !slot || String(slot.coordLabel || '').trim() === '--'
            const tileStyle = { display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minWidth: 0, border: `1px solid ${col}28`, borderRadius: 8, padding: 14, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(248,250,252,0.88)' }
            if (isReserve) {
              return (
                <L8Tile key={`cited-${citedIdx}`} style={tileStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: col }}>CITED {citedIdx + 1}</div>
                    <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`cited-${citedIdx + 1}-empty`} segmentLabel={`L8 cited fact slot ${citedIdx + 1} (empty)`} excerpt="" col={col} isDark={isDark} compact />
                  </div>
                  <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={500} />
                </L8Tile>
              )
            }
            const href = slot.sourceHref ? resolveAttachmentUrl(slot.sourceHref) : ''
            const hasLink = href && href !== '#'
            const external = hasLink && isCrossOriginHttp(href)
            const accent = isDark ? '#7dd3fc' : '#0369a1'
            return (
              <L8Tile key={`cited-${citedIdx}`} style={{ ...tileStyle, background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(248,250,252,0.95)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: col }}>CITED {citedIdx + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(slot.fact)} isDark={isDark} fontSize={13} />
                    <SegmentReportLink planetId={planetId} lx={lx} ly={ly} archiveLayer={8} segmentIndex={`cited-${citedIdx + 1}`} segmentLabel={`L8 cited fact ${citedIdx + 1}`} excerpt={[slot.title, slot.fact].filter(Boolean).join(' -- ')} col={col} isDark={isDark} compact />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: col, opacity: 0.95 }}>{slot.coordLabel}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.25 }}>{slot.title}</div>
                <p style={{ margin: 0, fontSize: 13, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.65, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 8, overflow: 'hidden' }}>{slot.fact}</p>
                <div style={{ fontSize: 12, fontWeight: 900, color: col, letterSpacing: '0.08em', marginTop: 'auto' }}>SOURCE</div>
                {hasLink
                  ? <a href={href} onClick={(e) => e.stopPropagation()} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ fontSize: 12, fontWeight: 600, color: accent, wordBreak: 'break-word' }}>{slot.sourceLabel || href}</a>
                  : <span style={{ fontSize: 12, color: isDark ? '#64748b' : '#475569' }}>{slot.sourceLabel || '--'}</span>}
              </L8Tile>
            )
          })}
        </div>
      </div>
    </div>
  )
})

/* ── Unified + button for adjacent empty cells L4–L8 ── */
function EmptyAddButton({ col, isDark, layer }) {
  // Size and font scale with layer cell size
  const cfg = {
    4: { sz: 14, fs: 9,  bw: 1.5, top: 3, right: 3, centered: false },
    5: { sz: 42, fs: 22, bw: 2,   centered: true },
    6: { sz: 112, fs: 54, bw: 3, centered: true },
    7: { sz: 260, fs: 124, bw: 5, centered: true },
    8: { sz: 420, fs: 190, bw: 7, centered: true },
  }
  const { sz, fs, bw, centered, top, right } = cfg[layer] || cfg[5]
  const pos = centered
    ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    : { top, right }
  return (
    <div style={{ position: 'absolute', zIndex: 50, pointerEvents: 'none', ...pos }}>
      {/* Outer glow ring */}
      <div style={{
        position: 'absolute',
        inset: -sz * 0.18,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${col}22 0%, transparent 70%)`,
        filter: `blur(${sz * 0.15}px)`,
      }} />
      {/* Main circle */}
      <div style={{
        position: 'relative',
        width: sz,
        height: sz,
        borderRadius: '50%',
        border: `${bw}px solid ${col}dd`,
        background: isDark
          ? `radial-gradient(circle at 38% 32%, ${col}30 0%, ${col}0c 60%, transparent 100%)`
          : `radial-gradient(circle at 38% 32%, ${col}22 0%, ${col}08 60%, transparent 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: col,
        fontSize: fs,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: [
          `0 0 ${sz * 0.55}px ${col}44`,
          `0 0 ${sz * 0.22}px ${col}77`,
          `inset 0 0 ${sz * 0.35}px ${col}18`,
          `inset 0 1px 0 ${col}44`,
        ].join(', '),
        letterSpacing: '-0.02em',
        textShadow: `0 0 ${sz * 0.4}px ${col}, 0 0 ${sz * 0.15}px #fff8`,
        pointerEvents: 'none',
      }}>
        +
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   OPTIMIZED GRID CELL
   gx/gy = internal absolute indices
   lx/ly = displayed centered coordinates
══════════════════════════════════════════════ */
const GridCell = memo(function GridCell({
  gx, gy, lx, ly, cpx, cpy, cp, layer, data, col, isDark, navigate, planetId,
  gridFactsCatalog, deepFactSources, compassSelected, isAdjacentToFilled,
  visYMin, visYMax, onDrillFilled,
}) {
  const isEmpty = !data

  const cellStyle = {
    position: 'absolute',
    transform: `translate(${cpx}px, ${cpy}px)`,
    width: cp, height: cp,
    boxSizing: 'border-box',
    overflow: 'hidden',
    border: `1px solid ${isEmpty
      ? (isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.08)')
      : (isDark ? `${col}33` : `${col}44`)}`,
    background: isEmpty
      ? (isDark ? 'rgba(7,5,15,0.4)' : 'rgba(240,245,250,0.4)')
      : (isDark ? '#06040e' : '#ffffff'),
    // layer >= 4: matches handleCellClick's actual guard (layer < 4 || layer > 8)
    // — L4 empty cells were clickable but never showed a pointer cursor.
    cursor: (isEmpty && layer >= 4 && layer <= 8) ? 'pointer' : 'default',
  }

  const handleCellClick = useCallback(() => {
    if (!isEmpty) {
      if (layer < TOTAL_LAYERS) onDrillFilled?.(gx, gy, layer + 1)
      return
    }
    if (layer < 4 || layer > 8) return
    if (!isAdjacentToFilled) return  // all layers L4-L8: silently block non-adjacent
    const url = `/submit?planet=${planetId}&coordX=${lx}&coordY=${ly}&archiveLayer=${layer}`
    navigate(url)
  }, [isEmpty, layer, isAdjacentToFilled, navigate, planetId, lx, ly, gx, gy, onDrillFilled])

  return (
    <div
      style={cellStyle}
      onClick={handleCellClick}
    >
      {/* + button: only on adjacent empty cells, L4–L8 */}
      {isEmpty && layer >= 4 && layer <= 8 && !!isAdjacentToFilled && (
        <EmptyAddButton col={col} isDark={isDark} layer={layer} />
      )}
      {layer === 4 && <L4Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} compassSelected={compassSelected} />}
      {layer === 5 && <L5Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} planetId={planetId} />}
      {layer === 6 && !isEmpty && <L6Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} planetId={planetId} />}
      {layer === 7 && !isEmpty && <L7Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} gridFactsCatalog={gridFactsCatalog} deepFactSources={deepFactSources} planetId={planetId} />}
      {layer === 8 && !isEmpty && <L8Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} deepFactSources={deepFactSources} planetId={planetId} visYMin={visYMin} visYMax={visYMax} />}
    </div>
  )
})

/* ══════════════════════════════════════════════
   INTERACTIVE GRID (FRACTIONAL TRANSFORM)
══════════════════════════════════════════════ */
function InteractiveGrid({
  layer, viewX, viewY, vpW, vpH, planet, isDark, navigate, sectionEntries, zoom, gridDims, hubId,
  compassDomainId, compassSubfieldId, onDrillFilled,
}) {
  const cp = CELL_PX[layer]
  const col = planet.color
  const sx = Math.floor(viewX)
  const sy = Math.floor(viewY)
  const fx = viewX % 1
  const fy = viewY % 1
  const cols = Math.ceil(vpW / (cp * zoom)) + 1
  const rows = Math.ceil(vpH / (cp * zoom)) + 1

  const compassSelected = !!(compassDomainId || compassSubfieldId)

  const gridFactsCatalog = useMemo(() => buildGridFactsCatalog(sectionEntries, gridDims), [sectionEntries, gridDims])
  const deepFactSources = useMemo(() => buildDeepFactSourceSlots(sectionEntries, gridDims), [sectionEntries, gridDims])

  /* Compute set of EMPTY cells adjacent to at least one filled cell (for L5-L8 + button) */
  const filledCellSet = useMemo(() => {
    const set = new Set()
    Object.keys(sectionEntries).forEach((key) => {
      if (sectionEntries[key]) set.add(key)
    })
    return set
  }, [sectionEntries])

  const adjacentToFilledSet = useMemo(() => {
    if (layer < 4) return null
    const { gridW, gridH } = gridDims
    const adj = new Set()
    filledCellSet.forEach((key) => {
      const parts = key.split(',')
      const fx = parseInt(parts[0], 10)
      const fy = parseInt(parts[1], 10)
      ;[[fx - 1, fy], [fx + 1, fy], [fx, fy - 1], [fx, fy + 1]].forEach(([nx, ny]) => {
        if (nx >= 0 && ny >= 0 && nx < gridW && ny < gridH) adj.add(`${nx},${ny}`)
      })
    })
    return adj
  }, [layer, filledCellSet, gridDims])

  const cells = useMemo(() => {
    const arr = []
    const { gridW, gridH } = gridDims
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = sx + c
        const gy = sy + r
        if (gx >= 0 && gy >= 0 && gx < gridW && gy < gridH) {
          arr.push({ gx, gy, cpx: c * cp, cpy: r * cp })
        }
      }
    }
    return arr
  }, [sx, sy, cols, rows, cp, gridDims])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Grid line background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: isDark
          ? `linear-gradient(rgba(79,195,247,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.08) 1px, transparent 1px)`
          : `linear-gradient(rgba(2,132,199,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(2,132,199,0.06) 1px, transparent 1px)`,
        backgroundSize: `${cp * zoom}px ${cp * zoom}px`,
        backgroundPosition: `${-fx * cp * zoom}px ${-fy * cp * zoom}px`,
      }} />

      {/* Cell transform group */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        transform: `scale(${zoom}) translate(${-fx * cp}px, ${-fy * cp}px)`,
        transformOrigin: 'top left',
        willChange: 'transform',
      }}>
        {cells.map(({ gx, gy, cpx, cpy }) => {
          // For L8: compute visible Y range within the cell to allow windowed rendering
          let visYMin = 0, visYMax = Infinity
          if (layer === 8) {
            const BUFFER = 2400
            const cellLocalOffset = (viewY - gy) * cp
            visYMin = Math.max(0, cellLocalOffset - BUFFER)
            visYMax = cellLocalOffset + vpH / zoom + BUFFER
          }
          return (
            <GridCell
              key={`${gx},${gy}`}
              gx={gx} gy={gy}
              lx={gx - gridDims.halfW} ly={gridDims.halfH - gy}
              cpx={cpx} cpy={cpy}
              cp={cp}
              layer={layer}
              data={sectionEntries[`${gx},${gy}`]}
              col={col}
              isDark={isDark}
              navigate={navigate}
              planetId={hubId}
              gridFactsCatalog={gridFactsCatalog}
              deepFactSources={deepFactSources}
              compassSelected={compassSelected}
              isAdjacentToFilled={adjacentToFilledSet ? adjacentToFilledSet.has(`${gx},${gy}`) && !filledCellSet.has(`${gx},${gy}`) : true}
              visYMin={visYMin}
              visYMax={visYMax}
              onDrillFilled={onDrillFilled}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PLANET INTRO OVERLAY
══════════════════════════════════════════════ */
function PlanetIntro({ planet, isDark, onEnter, gridDims, archiveCfg }) {
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(false)
  if (gone) return null
  const col = planet.color
  const enter = () => { setOut(true); setTimeout(() => { setGone(true); onEnter() }, 650) }
  const hostTitle = (archiveCfg?.instanceTitle || '').trim()
  const gridLabel = gridDims ? `${gridDims.gridW} × ${gridDims.gridH}` : ''
  const focusAreas = (planet.sections || []).slice(0, 5).map((s) => s.title).filter(Boolean)
  const sectionCount = (planet.sections || []).length

  const titleGradient = `linear-gradient(135deg, ${col}, ${isDark ? '#fff' : '#0f172a'})`

  return (
    <div
      className={`planet-intro${out ? ' planet-intro--exiting' : ''}`}
      style={{
        background: isDark
          ? 'radial-gradient(ellipse at 50% 40%, #0a0819 0%, #020408 100%)'
          : 'radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f1f5f9 100%)',
        pointerEvents: out ? 'none' : 'all',
      }}
    >
      <div
        className="planet-intro__glow"
        style={{ background: `radial-gradient(circle, ${col} 0%, transparent 70%)` }}
        aria-hidden
      />

      <div className="planet-intro__panel">
        <div
          className="planet-intro__badge"
          style={{ border: `1px solid ${col}44`, background: `${col}14`, color: col }}
        >
          <BookOpen size={12} aria-hidden /> LAYER 1 &middot; ARCHIVE FRONT
        </div>

        {hostTitle && (
          <div className="planet-intro__host-title" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
            {hostTitle}
          </div>
        )}

        <div
          className="planet-intro__orb"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${col}ee, ${col}55)`,
            boxShadow: `0 0 40px ${col}, 0 0 80px ${col}55, inset 0 0 24px rgba(0,0,0,0.4)`,
            animation: 'pulseOrb 3s ease-in-out infinite',
          }}
          aria-hidden
        />

        <h1
          className="planet-intro__title"
          style={{
            background: titleGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {planet.planet}
        </h1>

        <div className="planet-intro__body">
          <div className="planet-intro__domain" style={{ color: col }}>
            {planet.domain.toUpperCase()}
          </div>
          <p className="planet-intro__intro" style={{ color: isDark ? '#94a3b8' : '#334155' }}>
            {planet.intro}
          </p>
          {gridLabel && (
            <p className="planet-intro__meta" style={{ color: isDark ? '#64748b' : '#475569' }}>
              Coordinate grid &middot; {gridLabel} cells
              {sectionCount ? ` · ${sectionCount} indexed topics` : ''} &mdash; size comes from your uploaded image (Start archive).
            </p>
          )}
          {focusAreas.length > 0 && (
            <div className="planet-intro__focus" style={{ '--planet-color': col }}>
              <div className="planet-intro__focus-label" style={{ color: col }}>Focus areas</div>
              <div className="planet-intro__focus-list">
                {focusAreas.map((area) => (
                  <span key={area} className="planet-intro__focus-pill">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="planet-intro__themes" style={{ color: isDark ? '#64748b' : '#475569' }}>
            Shared themes appear across hubs &mdash; when you zoom to deeper layers, entries can link to the same subject through another hub&apos;s scientific lens.
          </p>
        </div>

        <nav className="planet-intro__nav" aria-label="Archive navigation">
          <Link to="/" style={{ color: isDark ? '#475569' : '#64748b' }}>Home</Link>
          <Link to="/map" style={{ color: isDark ? '#67e8f9' : '#0284c7' }}>Other domains (map)</Link>
          <Link to="/create-archive" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>Configure grid image</Link>
        </nav>

        <p className="planet-intro__federation" style={{ color: isDark ? '#64748b' : '#475569' }}>
          Public discovery at{' '}
          <a href={ARCHIVE_SOLAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer" style={{ color: col, fontWeight: 700 }}>
            archive.solar
          </a>{' '}
          is planned as a federation directory (this build stays frontend-only).
        </p>

        <button
          type="button"
          onClick={enter}
          className="planet-intro__enter archive-enter-btn"
          style={{
            borderColor: col,
            color: isDark ? '#fff' : '#0f172a',
            boxShadow: `0 0 20px ${col}44`,
          }}
        >
          ENTER ARCHIVE
        </button>
      </div>
    </div>
  )
}

function SubjectLatticeOverlay({
  layer,
  viewX,
  viewY,
  zoom,
  vpSize,
  sectionEntries,
  col,
  isDark,
  onDrillSubfield,
  planetId,
  focusSubjectCell,
  foundationSubfieldId,
  hidePanel,
  onLatticeTileActivate,
}) {
  if (hidePanel) return null
  if (layer !== 2 && layer !== 3) return null
  const subdiv = 4
  const cp = CELL_PX[layer] * zoom
  const gw = vpSize.w / cp
  const gh = vpSize.h / cp
  const cw = gw / subdiv
  const ch = gh / subdiv

  const titleInCell = (i, j) => {
    const x0 = Math.floor(viewX + j * cw)
    const x1 = Math.ceil(viewX + (j + 1) * cw)
    const y0 = Math.floor(viewY + i * ch)
    const y1 = Math.ceil(viewY + (i + 1) * ch)
    for (const [key, data] of Object.entries(sectionEntries || {})) {
      if (!data?.title) continue
      const [gs, gt] = key.split(',')
      const gx = parseInt(gs, 10)
      const gy = parseInt(gt, 10)
      if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue
      if (gx >= x0 && gx < x1 && gy >= y0 && gy < y1) return String(data.title).trim().slice(0, 28)
    }
    return ''
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        bottom: 120,
        zIndex: 120,
        width: 'min(300px, 86vw)',
        pointerEvents: 'auto',
        borderRadius: 12,
        border: `1px solid ${col}55`,
        background: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        padding: 10,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 9, fontWeight: 900, color: col, letterSpacing: '0.08em', marginBottom: 6 }}>
        SUBJECT LATTICE · L{layer} ({subdiv}×{subdiv})
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 10, lineHeight: 1.45, color: isDark ? '#475569' : '#64748b' }}>
        Each tile is a viewport fraction at this zoom. Click to center it and drill to L{layer + 1}. Entry titles appear when a cell overlaps seeded coordinates.
        Optional: set <code style={{ fontSize: 9 }}>window.SOLAR_STATIC_LAYER_MAP</code> (see <code style={{ fontSize: 9 }}>src/utils/staticLayerMap.js</code>) to supply titles and precise focus coordinates without rebuilding.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${subdiv}, minmax(0, 1fr))`,
          gap: 4,
        }}
      >
        {Array.from({ length: subdiv * subdiv }, (_, k) => {
          const i = Math.floor(k / subdiv)
          const j = k % subdiv
          const staticTile = planetId
            ? getStaticLatticeTile(planetId, layer, i, j, layer === 3 ? foundationSubfieldId : null)
            : null
          const t =
            (staticTile?.title && String(staticTile.title).trim()) ||
            (staticTile?.subtitle && String(staticTile.subtitle).trim()) ||
            titleInCell(i, j)
          return (
            <button
              key={k}
              type="button"
              title={t || `Region ${i + 1},${j + 1} → L${layer + 1}`}
              onClick={() => {
                if (staticTile?.subfieldId && typeof onLatticeTileActivate === 'function') {
                  onLatticeTileActivate(staticTile.subfieldId)
                }
                const hint = planetId
                  ? getStaticFocusHint(planetId, layer, i, j, layer === 3 ? foundationSubfieldId : null)
                  : null
                if (
                  hint &&
                  Number.isFinite(hint.focusGx) &&
                  Number.isFinite(hint.focusGy) &&
                  typeof focusSubjectCell === 'function'
                ) {
                  const tgt =
                    hint.drillLayer != null &&
                    hint.drillLayer >= 1 &&
                    hint.drillLayer <= TOTAL_LAYERS
                      ? hint.drillLayer
                      : Math.min(TOTAL_LAYERS, layer + 1)
                  focusSubjectCell(hint.focusGx, hint.focusGy, tgt)
                  return
                }
                onDrillSubfield(i, j, subdiv)
              }}
              style={{
                minHeight: 44,
                padding: 4,
                borderRadius: 8,
                border: `1px solid ${col}40`,
                background: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(248,250,252,0.96)',
                color: col,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'center',
                gap: 2,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 900, fontFamily: 'Inter, system-ui, sans-serif' }}>{i + 1},{j + 1}</span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: isDark ? '#cbd5e1' : '#334155',
                  lineHeight: 1.25,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {t || '--'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   STATIC BACKGROUND (L1-L3) + INTERACTIVE PLANET
══════════════════════════════════════════════ */
function StaticBg({ layer, viewX, viewY, isDark, color, zoom, planet, gridDims }) {
  const planetId = planet?.id?.toLowerCase()
  const cp = CELL_PX[layer] * zoom
  const trX = -viewX * cp
  const trY = -viewY * cp
  const customImg = window.SOLAR_LAYER_CONFIG?.[planetId]?.[layer] || planet?.layerImages?.[layer]

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: layer === 1 ? (isDark ? '#000' : '#ffffff') : 'transparent' }}>
      <div style={{
        position: 'absolute', left: trX, top: trY,
        width: gridDims.gridW * cp, height: gridDims.gridH * cp,
        background: layer === 1 ? 'transparent' : (isDark ? '#070512' : '#ffffff'),
        backgroundImage: customImg
          ? `url(${customImg})`
          : (layer === 1 ? 'none' : (isDark
            ? 'linear-gradient(rgba(79,195,247,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.2) 1px, transparent 1px)'
            : 'linear-gradient(rgba(2,132,199,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(2,132,199,0.15) 1px, transparent 1px)')),
        backgroundSize: customImg ? '100% 100%' : `${cp}px ${cp}px`,
      }}>
        {!customImg && layer !== 1 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: `${cp * 0.5}px solid ${color}2a`, boxSizing: 'border-box', boxShadow: `inset 0 0 60px ${color}14` }} />
        )}
        {/* planet sphere removed from L1 — no orb in the grid view */}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SEARCH BAR
   sectionEntries = merged JSON + localStorage for current planet only.
   Match title, tags, summary, padded coords, or exact "lx,ly" display coords.
══════════════════════════════════════════════ */
function SearchBar({
  col, isDark, sectionEntries, layer,
  setViewX, setViewY, setLayer, setZoom, setFocusedCell, vpSize,
  gridDims,
}) {
  const [term, setTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!term.trim()) {
      setResults([])
      return
    }
    const lw = term.toLowerCase().trim()
    const compactCoordLw = lw.replace(/\s/g, '')
    const byKey = new Map()

    const parsed = parseCoordinateSearchInput(term, gridDims)
    if (parsed) {
      const key = `${parsed.gx},${parsed.gy}`
      const data = sectionEntries[key]
      byKey.set(key, {
        gx: parsed.gx,
        gy: parsed.gy,
        lx: parsed.lx,
        ly: parsed.ly,
        title: data?.title || 'Empty cell',
        subtitle: data?.title ? 'Coordinate jump' : 'No entry at this cell',
      })
    }

    if (sectionEntries && typeof sectionEntries === 'object') {
      Object.entries(sectionEntries).forEach(([key, data]) => {
        if (!data) return
        const [gxStr, gyStr] = key.split(',')
        const gx = parseInt(gxStr, 10)
        const gy = parseInt(gyStr, 10)
        if (!Number.isFinite(gx) || !Number.isFinite(gy)) return
        const lx = gx - gridDims.halfW
        const ly = gridDims.halfH - gy
        const coordStr = `${pad4(lx)},${pad4(ly)}`
        const coordCompact = coordStr.replace(/\s/g, '')
        const tagStr = (data.tags || []).join(' ').toLowerCase()
        const match =
          (data.title && data.title.toLowerCase().includes(lw)) ||
          (data.shortSummary && data.shortSummary.toLowerCase().includes(lw)) ||
          (tagStr && tagStr.includes(lw)) ||
          coordCompact.includes(compactCoordLw)
        if (match) {
          byKey.set(key, {
            gx, gy, lx, ly,
            title: data.title || 'Entry',
            subtitle: '',
          })
        }
      })
    }

    setResults(Array.from(byKey.values()).slice(0, 50))
  }, [term, sectionEntries, gridDims])

  const handleSelect = (r) => {
    const targetLayer = layer >= 5 && layer <= 8 ? layer : 6
    const cp = CELL_PX[targetLayer]
    let fitZoom = Math.max(0.15, Math.min(1.0, (vpSize.w * 0.9) / cp))
    if (targetLayer === 7) fitZoom = 0.60
    if (targetLayer === 8) fitZoom = l8ReadableZoom(vpSize.w)

    setLayer(targetLayer)
    setZoom(fitZoom)

    const offsetX = (vpSize.w / (cp * fitZoom)) / 2
    const offsetY = (vpSize.h / (cp * fitZoom)) / 2
    setViewX((r.gx + 0.5) - offsetX)
    setViewY((r.gy + 0.5) - offsetY)

    setFocusedCell({ x: r.gx, y: r.gy })
    setTerm('')
    setIsOpen(false)
  }

  return (
    <div
      className={`archive-search-hud${isDark ? '' : ' archive-search-hud--light'}`}
      style={{ '--search-accent': col }}
    >
      <input
        className="archive-search-hud__input"
        value={term}
        onChange={(e) => { setTerm(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="Search title, tags, coords…"
        title="Display coordinates lx,ly (e.g. 0,0 or 100,130). On L5-L8, search jumps at your current layer."
        style={{
          background: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.92)',
          color: isDark ? '#f8fafc' : '#0f172a',
        }}
      />
      {isOpen && results.length > 0 && (
        <div
          className="archive-search-hud__dropdown"
          style={{
            background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${col}33`,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((r, i) => (
            <button
              key={`${r.gx},${r.gy}-${i}`}
              type="button"
              onClick={() => handleSelect(r)}
              style={{
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%', border: 'none', background: 'transparent',
                borderBottom: i < results.length - 1 ? `1px solid ${col}11` : 'none',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif', color: col, fontWeight: 800, marginBottom: 2 }}>
                {pad4(r.lx)},{pad4(r.ly)}
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.4 }}>{r.title}</div>
              {r.subtitle && (
                <div style={{ fontSize: 9, color: isDark ? '#64748b' : '#475569', marginTop: 4 }}>{r.subtitle}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   LAYER TRANSITION OVERLAY (L3 → L4)
══════════════════════════════════════════════ */
const LayerTransitionOverlay = memo(function LayerTransitionOverlay({ col, fromLayer, toLayer, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  const particles = useMemo(() =>
    Array.from({ length: 52 }, (_, i) => ({
      id: i,
      angle: (i / 52) * 360 + (i % 4) * 7,
      dist: 100 + (i % 8) * 45,
      size: 1 + (i % 3) * 0.7,
      delay: (i % 14) * 0.035,
      dur: 0.65 + (i % 7) * 0.12,
    })),
  [])

  const rings = [160, 260, 360, 470, 580, 700]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99992,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 48%, rgba(6,2,16,0.98) 0%, #000 100%)',
      animation: 'ltOverlayAnim 2.0s ease forwards',
      pointerEvents: 'all',
    }}>
      {/* Zooming perspective grid */}
      <div style={{
        position: 'absolute', inset: '-50%',
        backgroundImage: `linear-gradient(${col}18 1px, transparent 1px), linear-gradient(90deg, ${col}18 1px, transparent 1px)`,
        backgroundSize: '72px 72px',
        transformOrigin: 'center center',
        animation: 'ltGridZoom 2.0s cubic-bezier(0.3, 0, 0.7, 1) forwards',
      }} />

      {/* Radial vignette over grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 15%, rgba(0,0,0,0.88) 75%)`,
      }} />

      {/* Expanding rings */}
      {rings.map((size, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: '50%',
          border: `1px solid ${col}`,
          opacity: 0,
          animation: `ltRingExpand 1.4s cubic-bezier(0.15, 0.8, 0.35, 1) ${i * 0.08}s forwards`,
        }} />
      ))}

      {/* Second wave of rings (slightly delayed, smaller) */}
      {[100, 190, 290].map((size, i) => (
        <div key={`r2-${i}`} style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: '50%',
          border: `1px solid ${col}55`,
          opacity: 0,
          animation: `ltRingExpand 1.1s cubic-bezier(0.15, 0.8, 0.35, 1) ${0.55 + i * 0.1}s forwards`,
        }} />
      ))}

      {/* Particles flying outward */}
      {particles.map((p) => (
        <div key={p.id} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: col,
          marginTop: -p.size / 2, marginLeft: -p.size / 2,
          boxShadow: `0 0 ${p.size * 4}px ${col}`,
          opacity: 0,
          '--lt-angle': `${p.angle}deg`,
          '--lt-dist': `${p.dist}px`,
          animation: `ltParticle ${p.dur}s ease-out ${0.18 + p.delay}s forwards`,
        }} />
      ))}

      {/* Central glowing core */}
      <div style={{
        position: 'absolute',
        width: 16, height: 16,
        borderRadius: '50%',
        background: `radial-gradient(circle, #fff 0%, ${col} 60%)`,
        boxShadow: `0 0 24px ${col}, 0 0 60px ${col}88, 0 0 120px ${col}44`,
        animation: 'ltCoreGlow 2.0s ease forwards',
      }} />

      {/* Targeting reticle SVG */}
      <svg viewBox="0 0 140 140" style={{
        position: 'absolute', width: 140, height: 140,
        opacity: 0, animation: 'ltFadeHold 2.0s ease 0.3s forwards',
      }}>
        <circle cx="70" cy="70" r="58" fill="none" stroke={col} strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="10 5" />
        <circle cx="70" cy="70" r="38" fill="none" stroke={col} strokeWidth="0.4" strokeOpacity="0.2" />
        <line x1="70" y1="4"  x2="70" y2="28" stroke={col} strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="70" y1="112" x2="70" y2="136" stroke={col} strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="4"  y1="70" x2="28" y2="70" stroke={col} strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="112" y1="70" x2="136" y2="70" stroke={col} strokeWidth="1.2" strokeOpacity="0.8" />
        <circle cx="70" cy="70" r="5" fill="none" stroke={col} strokeWidth="1.5" />
        <circle cx="70" cy="70" r="1.5" fill={col} />
      </svg>

      {/* HUD corner brackets */}
      {[
        { pos: { top: 28, left: 28 },     r: '0deg'   },
        { pos: { top: 28, right: 28 },    r: '90deg'  },
        { pos: { bottom: 28, right: 28 }, r: '180deg' },
        { pos: { bottom: 28, left: 28 },  r: '270deg' },
      ].map(({ pos, r }, i) => (
        <svg key={i} viewBox="0 0 32 32" style={{
          position: 'absolute', ...pos, width: 32, height: 32,
          '--lt-r': r,
          opacity: 0, animation: `ltBracketIn 0.45s cubic-bezier(0.2, 1, 0.3, 1) ${0.2 + i * 0.07}s forwards`,
        }}>
          <path d="M2 20 L2 2 L20 2" fill="none" stroke={col} strokeWidth="1.8" strokeOpacity="0.7" strokeLinecap="square" />
        </svg>
      ))}

      {/* Horizontal scanline sweeping down */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${col}55 15%, ${col} 50%, ${col}55 85%, transparent 100%)`,
        boxShadow: `0 0 10px ${col}, 0 0 3px #fff`,
        animation: 'ltScanline 1.2s linear 0.25s forwards',
        opacity: 0,
      }} />

      {/* Main text group */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        textAlign: 'center',
      }}>
        {/* Layer route chip */}
        <div style={{
          fontSize: 9, letterSpacing: '0.5em', fontWeight: 800,
          color: `${col}bb`, fontFamily: 'monospace', textTransform: 'uppercase',
          opacity: 0, animation: 'ltTextSlideUp 0.5s ease 0.38s forwards',
        }}>
          L{fromLayer} &nbsp;→&nbsp; L{toLayer}
        </div>

        {/* Giant layer title */}
        <div style={{
          fontSize: 88, fontWeight: 900, lineHeight: 0.9,
          fontFamily: "'Impact', 'Arial Black', 'Arial Narrow', sans-serif",
          letterSpacing: '0.06em',
          color: '#fff',
          textShadow: `0 0 50px ${col}99, 0 0 100px ${col}44, 0 2px 0 rgba(0,0,0,0.8)`,
          opacity: 0, animation: 'ltTitleReveal 0.65s cubic-bezier(0.1, 0.9, 0.2, 1) 0.46s forwards',
        }}>
          L{toLayer}
        </div>

        {/* Layer name label */}
        <div style={{
          fontSize: 13, letterSpacing: '0.38em', fontWeight: 700,
          color: '#fff', fontFamily: 'monospace', textTransform: 'uppercase',
          textShadow: `0 0 20px ${col}`,
          opacity: 0, animation: 'ltTextSlideUp 0.5s ease 0.54s forwards',
        }}>
          {(LAYER_LABELS[toLayer]?.split('·')[1]?.trim() || `Layer ${toLayer}`).toUpperCase()}
        </div>

        {/* Horizontal rule */}
        <div style={{
          width: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${col}, transparent)`,
          opacity: 0, animation: 'ltLineWiden 0.55s ease 0.6s forwards',
        }} />

        {/* Subtitle */}
        <div style={{
          fontSize: 9, letterSpacing: '0.45em', fontWeight: 700,
          color: `${col}99`, fontFamily: 'monospace', textTransform: 'uppercase',
          opacity: 0, animation: 'ltTextSlideUp 0.5s ease 0.72s forwards',
        }}>
          {CELL_PX[toLayer]} × {CELL_PX[toLayer]} px &nbsp;·&nbsp; ENTERING ARCHIVE
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 18, width: 200, height: 2,
          background: `${col}1a`, borderRadius: 1,
          overflow: 'hidden',
          opacity: 0, animation: 'ltFadeHold 2.0s ease 0.7s forwards',
        }}>
          <div style={{
            height: '100%', width: '0%', borderRadius: 1,
            background: `linear-gradient(90deg, ${col}88 0%, ${col} 100%)`,
            boxShadow: `0 0 8px ${col}`,
            animation: 'ltProgressFill 1.1s cubic-bezier(0.4, 0, 0.2, 1) 0.75s forwards',
          }} />
        </div>
      </div>
    </div>
  )
})

/* ══════════════════════════════════════════════
   MAIN ARCHIVE GRID
══════════════════════════════════════════════ */
export default function ArchiveGrid() {
  const { planetId: routePlanetId } = useParams()
  const hubId = normalizeHubId(routePlanetId)
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const vpRef = useRef(null)
  const panClampSnapshotRef = useRef({ x: 0, y: 0 })

  const [gridDims, setGridDims] = useState(() => getGridDimensions(hubId))
  const { gridW, gridH, halfW, halfH } = gridDims
  const [hubsTick, setHubsTick] = useState(0)

  useEffect(() => {
    setGridDims(getGridDimensions(hubId))
  }, [hubId])

  useEffect(() => {
    const sync = () => {
      setGridDims(getGridDimensions(hubId))
      setHubsTick((t) => t + 1)
    }
    window.addEventListener('solar-hubs-updated', sync)
    return () => {
      window.removeEventListener('solar-hubs-updated', sync)
    }
  }, [hubId])

  const [showGrid, setShowGrid] = useState(false)
  const [layer, setLayer]       = useState(1)
  const [zoom, setZoom]         = useState(1.0)
  const [planetResetTrigger, setPlanetResetTrigger] = useState(0)
  /* callback ref filled by ArchiveHubGlobe — used to pan the planet at L1 */
  const planetMoverRef = useRef(null)
  const [viewX, setViewX]       = useState(() => initialArchiveViewXYForRoute(routePlanetId).x)
  const [viewY, setViewY]       = useState(() => initialArchiveViewXYForRoute(routePlanetId).y)
  const [focusedCell, setFocusedCell] = useState(null)
  const [vpSize, setVpSize] = useState({ w: document.documentElement.clientWidth, h: window.innerHeight - 92 })
  const [submissionMergeTick, setSubmissionMergeTick] = useState(0)
  /** 4:4:4 compass -- active domain (L3) and subfield highlight */
  const [compassDomainId, setCompassDomainId] = useState(null)
  const [compassSubfieldId, setCompassSubfieldId] = useState(null)
  const panAnimRef = useRef(null)
  const [layerTrans, setLayerTrans] = useState(null) // { from, to }

  const animatePanTo = useCallback((targetX, targetY, duration = 650) => {
    if (panAnimRef.current) cancelAnimationFrame(panAnimRef.current)
    const startTime = performance.now()
    const startX = viewXYRef.current.x
    const startY = viewXYRef.current.y
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const e = easeOutCubic(t)
      setViewX(startX + (targetX - startX) * e)
      setViewY(startY + (targetY - startY) * e)
      if (t < 1) {
        panAnimRef.current = requestAnimationFrame(tick)
      } else {
        panAnimRef.current = null
      }
    }
    panAnimRef.current = requestAnimationFrame(tick)
  }, [])

  const hubTaxonomy = useMemo(() => getHubTaxonomy(hubId), [hubId])
  const hasCompassTaxonomy = !!hubTaxonomy
  /** pan = drag / touch moves grid; select = text selection & copy (no drag-pan on viewport) */
  const [viewportInteractMode, setViewportInteractMode] = useState('pan')
  /**
   * D-pad / arrow-key direction scheme (drag and wheel stay grab-the-map in both):
   *  'view'   (default) — arrows move your viewport across the archive (map-app standard)
   *  'planet'           — arrows push the planet/grid content in the arrow direction (legacy)
   */
  const [panScheme, setPanScheme] = useState(() => {
    try {
      return localStorage.getItem('solar-archive-pan-scheme') === 'planet' ? 'planet' : 'view'
    } catch {
      return 'view'
    }
  })
  const togglePanScheme = useCallback(() => {
    setPanScheme((prev) => {
      const next = prev === 'view' ? 'planet' : 'view'
      try { localStorage.setItem('solar-archive-pan-scheme', next) } catch { /* ignore */ }
      return next
    })
  }, [])
  /**
   * Drag / touch / trackpad-pan direction:
   *  'natural'  (default) — grid follows your pointer (drag down → grid moves down)
   *  'inverted'           — view follows your pointer (drag down → view moves down, grid up)
   */
  const [dragScheme, setDragScheme] = useState(() => {
    try {
      return localStorage.getItem('solar-archive-drag-scheme') === 'inverted' ? 'inverted' : 'natural'
    } catch {
      return 'natural'
    }
  })
  const toggleDragScheme = useCallback(() => {
    setDragScheme((prev) => {
      const next = prev === 'natural' ? 'inverted' : 'natural'
      try { localStorage.setItem('solar-archive-drag-scheme', next) } catch { /* ignore */ }
      return next
    })
  }, [])
  const drag = useRef({ active: false, sx: 0, sy: 0, svx: 0, svy: 0 })
  const touch = useRef({
    active: false, isPinch: false, moved: false,
    startX: 0, startY: 0, startVX: 0, startVY: 0,
    startDist: 0, startZoom: 1,
    lastVX: 0, lastVY: 0, lastZoom: 1,
  })
  /** Keeps latest view for drag/wheel without stale closures; updated every render */
  const viewXYRef = useRef({ x: 0, y: 0 })
  viewXYRef.current = { x: viewX, y: viewY }

  useEffect(() => {
    const bump = () => setSubmissionMergeTick((t) => t + 1)
    window.addEventListener('solar-archive-submissions-updated', bump)
    const onStorage = (ev) => {
      if (ev.key === 'submittedArchiveEntries') bump()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('solar-archive-submissions-updated', bump)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const archiveCfg = useMemo(() => loadHubArchiveConfig(hubId), [hubId])

  const planet = useMemo(() => {
    const id = hubId
    const base =
      researchData.planets.find((p) => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id) ||
      researchData.planets[0]
    const sections = getHubResearchSections(id)
    const taxonomy = getHubTaxonomy(id)
    const copy = getHubDisciplineCopy(id)
    const hubRecord = getHub(id)
    const domain = taxonomy?.discipline || hubRecord?.description || base.domain
    const intro = copy?.intro || base.intro
    const shortDomain = base.shortDomain
    if (sections?.length) {
      return { ...base, sections, domain, intro, shortDomain }
    }
    return { ...base, domain, intro, shortDomain }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hubsTick re-syncs once late Supabase hydration lands
  }, [hubId, hubsTick])

  // Supabase: approved entries for this hub fetched on mount / hub change
  const [dbEntries, setDbEntries] = useState({})
  useEffect(() => {
    let active = true
    supabase
      .from('archive_entries')
      .select('*')
      .eq('planet_id', hubId)
      .eq('status', 'approved')
      .is('updates_entry_id', null) // deepening drafts merge into their base entry; never shown standalone
      .then(({ data }) => {
        if (!active || !Array.isArray(data)) return
        const map = {}
        data.forEach((e) => {
          const gx = e.coord_x + halfW
          const gy = halfH - e.coord_y
          const fullText = e.content || e.short_summary || ''
          const segStrings =
            fullText.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) || [fullText]
          map[`${gx},${gy}`] = {
            id: e.id,
            title: e.title,
            content: fullText,
            // `detail` (not `content`) is the L6+ signal cellHasL6/hasL6 check for —
            // `content` above falls back to the summary for display, so it can be
            // truthy even when no real L6 detail was ever submitted.
            detail: e.content || '',
            shortSummary: e.short_summary || fullText.slice(0, 400),
            segments: buildSortedSegments(segStrings, e.difficulty ?? null),
            attachments: Array.isArray(e.attachments) ? e.attachments : [],
            tags: Array.isArray(e.tags) ? e.tags : [],
            alternatePerspectives: Array.isArray(e.alternate_perspectives)
              ? e.alternate_perspectives
              : [],
            foundationMeta: null,
          }
        })
        setDbEntries(map)
      })
    return () => { active = false }
  }, [hubId, halfW, halfH])

  // Build section lookup keyed by absolute grid index "gx,gy"
  // Supabase entries (dbEntries) are merged on top of the static data.
  const sectionEntries = useMemo(
    () => ({ ...buildMergedSectionEntries(planet, halfW, halfH), ...dbEntries }),
    // submissionMergeTick is not read inside — it deliberately invalidates the
    // memo after a localStorage submission merge, which the inputs can't see.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planet, submissionMergeTick, halfW, halfH, dbEntries],
  )

  // On planet change or grid resize: reset to layer 1, zoom 1, center planet / grid origin on screen
  useEffect(() => {
    setLayer(1)
    setZoom(1.0)
    setFocusedCell(null)
    setCompassDomainId(null)
    setCompassSubfieldId(null)
    compassTopicCellRef.current = null
    const el = vpRef.current
    const r = el?.getBoundingClientRect?.()
    const vpW = Math.max(1, r?.width ?? document.documentElement.clientWidth)
    const vpH = Math.max(1, r?.height ?? (window.innerHeight - 92))
    const { x: vx, y: vy } = clampedCenterViewXY({ gridW, gridH, halfW, halfH }, 1, 1.0, vpW, vpH)
    viewXYRef.current = { x: vx, y: vy }
    setViewX(vx)
    setViewY(vy)
    setShowGrid(false)
  }, [hubId, gridW, gridH, halfW, halfH])

  useEffect(() => {
    if (hasHubCompassTaxonomy(hubId)) {
      mergeStaticLayerMapForHub(hubId, halfW, halfH)
    }
  }, [hubId, halfW, halfH])

  const moveInterval = useRef(null)

  useEffect(() => () => {
    const t = moveInterval.current
    if (t != null) {
      clearTimeout(t)
      clearInterval(t)
      moveInterval.current = null
    }
  }, [])

  const segmentNavCellRef = useRef('')
  /** Invalidate cell cache on L7↔L8 so segment-0 snap runs (different pixel layout per layer). */
  const segmentNavLayerRef = useRef(null)
  const [segmentNavIndex, setSegmentNavIndex] = useState(0)

  // Clamp viewX/viewY to valid range for the given layer/zoom
  const clamp = useCallback((x, y, l, z) => {
    const cp = CELL_PX[l] * z
    const maxX = Math.max(0, gridW - vpSize.w / cp)
    const maxY = Math.max(0, gridH - vpSize.h / cp)
    return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) }
  }, [vpSize, gridW, gridH])

  /** Ref mirrors so pointer/wheel handlers do not re-subscribe every pan frame (was breaking L1 drag). */
  const clampRef = useRef(clamp)
  clampRef.current = clamp
  const layerRef = useRef(layer)
  layerRef.current = layer
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const vpSizeRef = useRef(vpSize)
  vpSizeRef.current = vpSize
  const viewportInteractModeRef = useRef(viewportInteractMode)
  viewportInteractModeRef.current = viewportInteractMode
  const panSchemeRef = useRef(panScheme)
  panSchemeRef.current = panScheme
  const dragSchemeRef = useRef(dragScheme)
  dragSchemeRef.current = dragScheme
  /** Grid cell of the last topic clicked on the L3 compass — the deep-layer (L6+) reading anchor. */
  const compassTopicCellRef = useRef(null)
  /** +1 grid-follows-pointer, −1 view-follows-pointer; applied to drag/touch/wheel pan deltas */
  const dragDirRef = useRef(1)
  dragDirRef.current = dragScheme === 'inverted' ? -1 : 1

  /**
   * Viewport top-left (grid units) so the current compass selection's cells
   * land in the screen corner matching where the user clicked:
   *  - subfield selected → corner = the subfield's own l3Slot (tl/tr/bl/br),
   *    so picking the bottom-right panel on L3 puts its cells bottom-right on L4+;
   *  - domain only → corner = the domain's compass quadrant.
   * Works for any grid layer (L4–L6; cell size comes from `nl`), which chains
   * the position through +Z: L4 depends on L3, L5 on L4, L6 on L5.
   * Pass explicit ids to bypass not-yet-committed React state (topic clicks).
   * Returns { x, y, bbox } or null when nothing is selected.
   */
  const compassAnchorViewXY = useCallback((nl, zoomLevel, domainIdArg, subfieldIdArg) => {
    if (!hubTaxonomy) return null
    const sfId = subfieldIdArg !== undefined ? subfieldIdArg : compassSubfieldId
    const domId = domainIdArg !== undefined ? domainIdArg : compassDomainId
    const subfield = sfId ? hubTaxonomy.subfields.find((s) => s.id === sfId) : null
    const domain = hubTaxonomy.domains.find((d) => d.id === (subfield?.domainId || domId))
    if (!domain) return null
    let left, top, cells
    if (subfield) {
      left = subfield.l3Slot === 'tl' || subfield.l3Slot === 'bl'
      top = subfield.l3Slot === 'tl' || subfield.l3Slot === 'tr'
      cells = hubTaxonomy.leaves
        .filter((l) => l.subfieldId === subfield.id)
        .map((l) => ({ gx: l.lx + halfW, gy: halfH - l.ly }))
    } else {
      left = domain.quadrant.includes('left')
      top = domain.quadrant.includes('top')
      cells = hubTaxonomy.leaves
        .filter((l) => domain.subfields.some((sf) => sf.id === l.subfieldId))
        .map((l) => ({ gx: l.lx + halfW, gy: halfH - l.ly }))
      // include DB entries (seeds/user rows) sitting in this quadrant of the
      // compass neighbourhood (±8 packed units, scaled to the subject lattice)
      for (const key of Object.keys(sectionEntries)) {
        if (!sectionEntries[key]) continue
        const [gx, gy] = key.split(',').map(Number)
        const lx = gx - halfW
        const ly = halfH - gy
        if (Math.abs(lx) > 8 * SUBJECT_STRIDE_X || Math.abs(ly) > 8 * SUBJECT_STRIDE_Y) continue
        if ((lx < 0) === left && (ly > 0) === top) cells.push({ gx, gy })
      }
    }
    if (!cells.length) return null
    const bbox = {
      minGx: Math.min(...cells.map((c) => c.gx)),
      maxGx: Math.max(...cells.map((c) => c.gx)),
      minGy: Math.min(...cells.map((c) => c.gy)),
      maxGy: Math.max(...cells.map((c) => c.gy)),
    }
    const cp = CELL_PX[nl] * zoomLevel
    const cols = vpSize.w / cp
    const rows = vpSize.h / cp
    // keep the corner gap visually similar across layers (~90px), never > 1.5 cells
    const M = Math.min(1.5, 90 / cp)
    const fitsW = bbox.maxGx + 1 - bbox.minGx + 2 * M <= cols
    const fitsH = bbox.maxGy + 1 - bbox.minGy + 2 * M <= rows
    let vx, vy
    if (fitsW && fitsH) {
      // Centre the block inside its screen quadrant (not squeezed into the
      // corner): position reads clearly, neighbours stay visible as context.
      const fx = left ? 0.27 : 0.73
      const fy = top ? 0.30 : 0.70
      vx = (bbox.minGx + bbox.maxGx + 1) / 2 - fx * cols
      vy = (bbox.minGy + bbox.maxGy + 1) / 2 - fy * rows
    } else {
      // Block larger than the viewport (L6+): the corner metaphor is exhausted —
      // open at the reading position instead: the clicked topic's cell if we
      // have one, else the block's first cell, top-left aligned.
      const t = compassTopicCellRef.current
      const anchor =
        t && t.gx >= bbox.minGx && t.gx <= bbox.maxGx && t.gy >= bbox.minGy && t.gy <= bbox.maxGy
          ? t
          : { gx: bbox.minGx, gy: bbox.minGy }
      vx = anchor.gx - M
      vy = anchor.gy - M
    }
    return { ...clamp(vx, vy, nl, zoomLevel), bbox }
  }, [hubTaxonomy, compassDomainId, compassSubfieldId, sectionEntries, halfW, halfH, vpSize, clamp])

  // When compass selection changes while already on L4, pan so the selected
  // cells sit in the screen corner matching where they were picked.
  useEffect(() => {
    if (layer !== 4) return
    if (!compassDomainId && !compassSubfieldId) return
    const q = compassAnchorViewXY(4, zoom)
    if (q) { animatePanTo(q.x, q.y, 650); return }
    // Fallback (hub without compass taxonomy): first filled cell top-left
    const entries = Object.keys(sectionEntries)
      .filter((k) => !!sectionEntries[k])
      .map((k) => k.split(',').map(Number))
      .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    if (entries.length === 0) return
    const [firstGx, firstGy] = entries[0]
    const { x, y } = clamp(firstGx - 1, firstGy - 1, 4, zoom)
    animatePanTo(x, y, 650)
  }, [compassDomainId, compassSubfieldId, layer]) // eslint-disable-line react-hooks/exhaustive-deps

  /** When viewport centers on a different archive cell on L7/L8, snap to segment tile 0 there. */
  useEffect(() => {
    if (layer !== 7 && layer !== 8) {
      segmentNavCellRef.current = ''
      segmentNavLayerRef.current = layer
      return
    }
    if (segmentNavLayerRef.current !== layer) {
      segmentNavCellRef.current = ''
      segmentNavLayerRef.current = layer
    }
    const cp = CELL_PX[layer] * zoom
    const gx = Math.floor(viewX + vpSize.w / (2 * cp))
    const gy = Math.floor(viewY + vpSize.h / (2 * cp))
    const key = `${gx},${gy}`
    if (segmentNavCellRef.current === key) return
    segmentNavCellRef.current = key
    setSegmentNavIndex(0)
    const { cx, cy } = segmentPixelCenterInCell(layer, 0)
    const { x, y } = clampViewCenterOnCellPixel(gx, gy, cx, cy, layer, zoom, vpSize.w, vpSize.h, (vx, vy) => clamp(vx, vy, layer, zoom))
    setViewX(x)
    setViewY(y)
  }, [layer, viewX, viewY, zoom, vpSize.w, vpSize.h, clamp])

  const applySegmentNav = useCallback((dir) => {
    if (layer !== 7 && layer !== 8) return
    setFocusedCell(null)
    const cp = CELL_PX[layer] * zoom
    const vx = viewXYRef.current.x
    const vy = viewXYRef.current.y
    const gx = Math.floor(vx + vpSize.w / (2 * cp))
    const gy = Math.floor(vy + vpSize.h / (2 * cp))
    const cols = layer === 7 ? L7_SEGMENT_NAV_COLS : L8_GRID_COLS
    const total = layer === 7 ? L7_SEGMENT_NAV_TOTAL : L8_SEGMENT_COUNT
    setSegmentNavIndex((prev) => {
      const next = segmentNavStep(prev, dir, cols, total)
      const { cx, cy } = segmentPixelCenterInCell(layer, next)
      const { x, y } = clampViewCenterOnCellPixel(gx, gy, cx, cy, layer, zoom, vpSize.w, vpSize.h, (vx, vy) => clamp(vx, vy, layer, zoom))
      setViewX(x)
      setViewY(y)
      return next
    })
  }, [layer, zoom, vpSize.w, vpSize.h, clamp])

  const move = useCallback((dx, dy) => {
    setFocusedCell(null)
    const { x: vx, y: vy } = viewXYRef.current
    const { x, y } = clampRef.current(vx + dx, vy + dy, layerRef.current, zoomRef.current)
    viewXYRef.current = { x, y }
    setViewX(x)
    setViewY(y)
  }, [])

  const stopMoving = useCallback(() => {
    const t = moveInterval.current
    if (t != null) {
      clearTimeout(t)
      clearInterval(t)
      moveInterval.current = null
    }
  }, [])

  const startMoving = useCallback((dx, dy) => {
    stopMoving()
    if (layer === 7 || layer === 8) {
      const dir = padDeltaToSegmentDir(dx, dy)
      if (!dir) return
      applySegmentNav(dir)
      moveInterval.current = window.setTimeout(() => {
        moveInterval.current = window.setInterval(() => applySegmentNav(dir), 130)
      }, 380)
      return
    }
    /* D-pad moves content in the arrow direction (+Y up, +X right on screen). */
    /* at L1 — move the planet globe instead of the invisible grid */
    if (layer === 1 && planetMoverRef.current) {
      const STEP = 14
      planetMoverRef.current(-dx * STEP, -dy * STEP)
      moveInterval.current = window.setTimeout(() => {
        moveInterval.current = window.setInterval(() => {
          planetMoverRef.current?.(-dx * STEP, -dy * STEP)
        }, 55)
      }, 280)
      return
    }
    const step = panPadStepGridUnits(layer, zoom, vpSize.w, vpSize.h)
    move(dx * step, dy * step) // Initial move
    moveInterval.current = window.setTimeout(() => {
      moveInterval.current = window.setInterval(() => {
        move(dx * step, dy * step)
      }, 60) // 60ms for smooth continuous movement
    }, 300) // Wait 300ms before starting continuous movement
  }, [layer, move, stopMoving, applySegmentNav, zoom, vpSize.w, vpSize.h])

  /** D-pad: reliable tap + hold-repeat on L7/L8 (pointerdown advances one segment per click). */
  const handlePadPointerDown = useCallback((e, dx, dy) => {
    if (!showGrid) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    startMoving(dx, dy)
  }, [showGrid, startMoving])

  const handlePadPointerEnd = useCallback(() => {
    stopMoving()
  }, [stopMoving])

  // If the page unmounts mid-hold (e.g. keyboard navigation away while a
  // D-pad button is pressed) the hold-repeat interval would outlive the
  // component — stop it with everything else.
  useEffect(() => stopMoving, [stopMoving])

  // Measure the real viewport box so pan limits match what you see (full drag range on screen).
  useLayoutEffect(() => {
    const el = vpRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setVpSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  useLayoutEffect(() => {
    const { x, y } = clamp(panClampSnapshotRef.current.x, panClampSnapshotRef.current.y, layer, zoom)
    setViewX(x)
    setViewY(y)
  }, [vpSize.w, vpSize.h, layer, zoom, clamp])

  // Switch layer: preserve current viewport center position
  // so the user stays at the same grid coordinate when drilling deeper
  const switchLayer = useCallback((nl) => {
    nl = Math.max(1, Math.min(TOTAL_LAYERS, nl))

    // Calculate ALL target state now (before async fade delay, so closures stay valid)
    const oldCp = CELL_PX[layer] * zoom
    const centerGX = viewX + (vpSize.w / 2) / oldCp
    const centerGY = viewY + (vpSize.h / 2) / oldCp

    let defaultZoom = 1.0
    if (nl === 7) defaultZoom = 0.60
    if (nl === 8) defaultZoom = L8_DEFAULT_ZOOM
    // Arriving on L4 with a subfield picked: zoom in so the 2×2 topic block
    // is prominent in its quadrant instead of a 128px speck.
    if (nl === 4 && compassSubfieldId && hasCompassTaxonomy) defaultZoom = 1.8

    const cp = CELL_PX[nl] * defaultZoom
    const offsetX = (vpSize.w / cp) / 2
    const offsetY = (vpSize.h / cp) / 2

    let targetX, targetY
    if (nl >= 4 && nl <= 6 && (compassDomainId || compassSubfieldId)) {
      // Keep the selected cells anchored to their compass corner through the
      // zoom chain (L3→L4→L5→L6) — but only when arriving from the compass or
      // when the anchored block is currently on screen; if the user panned
      // away, plain centre-preserving zoom is less disorienting.
      const q = compassAnchorViewXY(nl, defaultZoom)
      if (q) {
        const cameFromCompass = layer <= 3
        const vpMinGx = viewX
        const vpMaxGx = viewX + vpSize.w / oldCp
        const vpMinGy = viewY
        const vpMaxGy = viewY + vpSize.h / oldCp
        const blockOnScreen =
          q.bbox.maxGx + 1 > vpMinGx && q.bbox.minGx < vpMaxGx &&
          q.bbox.maxGy + 1 > vpMinGy && q.bbox.minGy < vpMaxGy
        if (cameFromCompass || blockOnScreen) {
          targetX = q.x; targetY = q.y
        }
      } else if (nl === 4) {
        const entries = Object.keys(sectionEntries)
          .filter((k) => !!sectionEntries[k])
          .map((k) => k.split(',').map(Number))
          .sort((a, b) => a[1] - b[1] || a[0] - b[0])
        if (entries.length > 0) {
          const [firstGx, firstGy] = entries[0]
          const clamped = clamp(firstGx - 1, firstGy - 1, nl, defaultZoom)
          targetX = clamped.x; targetY = clamped.y
        }
      }
    }
    if (targetX === undefined) {
      if (focusedCell) {
        const clamped = clamp(focusedCell.x - offsetX, focusedCell.y - offsetY, nl, defaultZoom)
        targetX = clamped.x; targetY = clamped.y
      } else {
        const clamped = clamp(centerGX - offsetX, centerGY - offsetY, nl, defaultZoom)
        targetX = clamped.x; targetY = clamped.y
      }
    }

    // Cancel any ongoing pan animation
    if (panAnimRef.current) { cancelAnimationFrame(panAnimRef.current); panAnimRef.current = null }

    // Show cinematic overlay; apply all state changes immediately (hidden beneath overlay)
    const fromLayer = layer
    setLayer(nl)
    setZoom(defaultZoom)
    setViewX(targetX)
    setViewY(targetY)
    setLayerTrans({ from: fromLayer, to: nl })
  }, [clamp, focusedCell, vpSize, viewX, viewY, layer, zoom, compassDomainId, compassSubfieldId, hasCompassTaxonomy, sectionEntries, compassAnchorViewXY])

  /** Center viewport on absolute grid cell (gx, gy) at layer nl -- used by L2/L3 static map and drill. */
  const focusSubjectCell = useCallback(
    (gx, gy, nl) => {
      const fromLayer = layerRef.current
      let nl2 = Math.max(1, Math.min(TOTAL_LAYERS, nl))
      let defaultZoom = 1.0
      if (nl2 === 7) defaultZoom = 0.60
      if (nl2 === 8) defaultZoom = L8_DEFAULT_ZOOM
      setFocusedCell(null)
      setLayer(nl2)
      setZoom(defaultZoom)
      const ncp = CELL_PX[nl2] * defaultZoom
      const offsetX = vpSize.w / (2 * ncp)
      const offsetY = vpSize.h / (2 * ncp)
      const { x, y } = clamp(gx - offsetX, gy - offsetY, nl2, defaultZoom)
      setViewX(x)
      setViewY(y)
      if (fromLayer !== nl2) setLayerTrans({ from: fromLayer, to: nl2 })
    },
    [clamp, vpSize.w, vpSize.h],
  )

  /**
   * L3 topic click: open L4 with the topic's subfield block anchored to the
   * subfield's own compass corner (explicit ids — React state for the
   * selection hasn't committed yet when this runs).
   */
  const openTopicFromCompass = useCallback((leaf, subfield) => {
    const fromLayer = layerRef.current
    const TOPIC_ZOOM = 1.8 // match switchLayer's subfield-selected L4 zoom
    compassTopicCellRef.current = { gx: leaf.lx + halfW, gy: halfH - leaf.ly }
    const q = compassAnchorViewXY(4, TOPIC_ZOOM, subfield.domainId, subfield.id)
    setFocusedCell(null)
    setLayer(4)
    setZoom(TOPIC_ZOOM)
    if (q) {
      setViewX(q.x)
      setViewY(q.y)
    } else {
      // hub without leaf cells — fall back to centering the topic cell
      const ncp = CELL_PX[4] * TOPIC_ZOOM
      const { x, y } = clamp(leaf.lx + halfW - vpSize.w / (2 * ncp), halfH - leaf.ly - vpSize.h / (2 * ncp), 4, TOPIC_ZOOM)
      setViewX(x)
      setViewY(y)
    }
    if (fromLayer !== 4) setLayerTrans({ from: fromLayer, to: 4 })
  }, [compassAnchorViewXY, clamp, halfW, halfH, vpSize])

  /**
   * L2/L3 "add subject": pick the first free cell orthogonally adjacent to the
   * selected domain's (or subfield's) topic cells and open /submit prefilled.
   * New subjects enter as L4 pending entries — the same 3-reviewer consensus
   * pipeline as every other submission.
   */
  const proposeSubjectSlot = useCallback((domainId, subfieldId) => {
    if (!hubTaxonomy) return
    const domain = hubTaxonomy.domains.find((d) => d.id === domainId)
    const leaves = subfieldId
      ? hubTaxonomy.leaves.filter((l) => l.subfieldId === subfieldId)
      : hubTaxonomy.leaves.filter((l) => domain?.subfields?.some((sf) => sf.id === l.subfieldId))
    const sorted = [...leaves].sort((a, b) => b.ly - a.ly || a.lx - b.lx)
    for (const leaf of sorted) {
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const lx = leaf.lx + dx
        const ly = leaf.ly + dy
        const gx = lx + halfW
        const gy = halfH - ly
        if (gx < 0 || gy < 0 || gx >= gridW || gy >= gridH) continue
        if (sectionEntries[`${gx},${gy}`]) continue
        navigate(`/submit?planet=${encodeURIComponent(hubId)}&coordX=${lx}&coordY=${ly}&archiveLayer=4`)
        return
      }
    }
    // every adjacent cell taken — let the form's slot picker offer the rest
    navigate(`/submit?planet=${encodeURIComponent(hubId)}&archiveLayer=4`)
  }, [hubTaxonomy, sectionEntries, halfW, halfH, gridW, gridH, hubId, navigate])

  /** L2/L3: center a viewport sub-tile and step one layer deeper (matches 4× lattice drill). */
  const drillSubfield = useCallback(
    (row, col, subdiv) => {
      const fromLayer = layer
      const cp = CELL_PX[layer] * zoom
      const gw = vpSize.w / cp
      const gh = vpSize.h / cp
      const cw = gw / subdiv
      const ch = gh / subdiv
      const centerGX = viewX + (col + 0.5) * cw
      const centerGY = viewY + (row + 0.5) * ch
      const nl = Math.min(TOTAL_LAYERS, layer + 1)
      let defaultZoom = 1.0
      if (nl === 7) defaultZoom = 0.60
      if (nl === 8) defaultZoom = L8_DEFAULT_ZOOM
      setFocusedCell(null)
      setLayer(nl)
      setZoom(defaultZoom)
      const ncp = CELL_PX[nl] * defaultZoom
      const offsetX = vpSize.w / (2 * ncp)
      const offsetY = vpSize.h / (2 * ncp)
      const { x, y } = clamp(centerGX - offsetX, centerGY - offsetY, nl, defaultZoom)
      setViewX(x)
      setViewY(y)
      setLayerTrans({ from: fromLayer, to: nl })
    },
    [layer, zoom, viewX, viewY, vpSize, clamp],
  )

  useEffect(() => {
    const el = vpRef.current
    drag.current.active = false
    touch.current.active = false
    touch.current.isPinch = false
    if (el) el.style.cursor = viewportInteractMode === 'pan' ? 'grab' : 'text'
  }, [viewportInteractMode])

  // Mouse wheel: zoom or pan
  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const onWheel = (e) => {
      if (e.target?.tagName === 'INPUT') return
      if (viewportInteractModeRef.current === 'select') return
      e.preventDefault()
      const isPinch = e.ctrlKey
      const ratio = e.deltaY < 0
        ? (isPinch ? 1.04 : 1.12)
        : (isPinch ? 1 / 1.04 : 1 / 1.12)
      if (isPinch || Math.abs(e.deltaY) > 40) {
        setFocusedCell(null)
        setZoom(prev => {
          const lay = layerRef.current
          const { min: zMin, max: zMax } = getZoomLimits(lay)
          const nZ = Math.max(zMin, Math.min(zMax, prev * ratio))
          const vp = vpSizeRef.current
          const { x: vx, y: vy } = viewXYRef.current
          // Zoom toward viewport center
          const cpX = vx + (vp.w / 2) / (CELL_PX[lay] * prev)
          const cpY = vy + (vp.h / 2) / (CELL_PX[lay] * prev)
          const nVx = cpX - (vp.w / 2) / (CELL_PX[lay] * nZ)
          const nVy = cpY - (vp.h / 2) / (CELL_PX[lay] * nZ)
          const { x, y } = clampRef.current(nVx, nVy, lay, nZ)
          viewXYRef.current = { x, y }
          setViewX(x)
          setViewY(y)
          return nZ
        })
      } else {
        setFocusedCell(null)
        const cp = CELL_PX[layerRef.current] * zoomRef.current
        // Match drag: wheel/trackpad pan follows the same direction scheme as dragging.
        const dir = dragDirRef.current
        move((dir * -e.deltaX) / cp, (dir * -e.deltaY) / cp)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [showGrid, move])

  // Mouse drag
  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const onDown = (e) => {
      if (viewportInteractModeRef.current === 'select') return
      if (e.button !== 0) return
      const { x: vx, y: vy } = viewXYRef.current
      if (panAnimRef.current) { cancelAnimationFrame(panAnimRef.current); panAnimRef.current = null }
      drag.current = { active: true, sx: e.clientX, sy: e.clientY, svx: vx, svy: vy }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!drag.current.active) return
      setFocusedCell(null)
      const cp = CELL_PX[layerRef.current] * zoomRef.current
      const dir = dragDirRef.current
      const dx = (dir * (drag.current.sx - e.clientX)) / cp
      const dy = (dir * (drag.current.sy - e.clientY)) / cp
      const { x, y } = clampRef.current(drag.current.svx + dx, drag.current.svy + dy, layerRef.current, zoomRef.current)
      viewXYRef.current = { x, y }
      setViewX(x)
      setViewY(y)
    }
    const onUp = () => {
      drag.current.active = false;
      if (el) el.style.cursor = 'grab';
    }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [showGrid])

  // Touch: single-finger pan + two-finger pinch-to-zoom
  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const ts = touch.current

    const getDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Finger wiggle tolerance before a single-finger touch counts as a pan
    // rather than a tap — below this, onTouchMove leaves the gesture alone
    // (no preventDefault) so touchend still synthesizes a normal click.
    const TAP_SLOP_PX = 8

    const onTouchStart = (e) => {
      if (viewportInteractModeRef.current === 'select') return
      // Don't intercept touches on interactive controls
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT'
        || e.target.closest('button') || e.target.closest('select')) return

      const touches = e.touches
      if (touches.length === 1) {
        // Do NOT preventDefault here: a still finger is indistinguishable from a
        // tap. Calling preventDefault on touchstart suppresses the browser's
        // synthetic click that would otherwise fire on touchend, which is what
        // was silently breaking tap-to-submit on empty grid cells on mobile —
        // the cell's onClick never ran. onTouchMove only starts panning (and
        // only then calls preventDefault) once the finger actually moves past
        // TAP_SLOP_PX, so a real drag still works exactly as before.
        const { x: vx, y: vy } = viewXYRef.current
        const z = zoomRef.current
        ts.active = true
        ts.isPinch = false
        ts.moved = false
        ts.startX = touches[0].clientX
        ts.startY = touches[0].clientY
        ts.startVX = vx
        ts.startVY = vy
        ts.lastVX = vx
        ts.lastVY = vy
        ts.lastZoom = z
      } else if (touches.length === 2) {
        e.preventDefault()
        ts.active = true
        ts.isPinch = true
        ts.moved = true
        ts.startDist = getDist(touches)
        ts.startZoom = ts.lastZoom !== undefined ? ts.lastZoom : zoomRef.current
        ts.startX = (touches[0].clientX + touches[1].clientX) / 2
        ts.startY = (touches[0].clientY + touches[1].clientY) / 2
        const { x: vx, y: vy } = viewXYRef.current
        ts.startVX = ts.lastVX !== undefined ? ts.lastVX : vx
        ts.startVY = ts.lastVY !== undefined ? ts.lastVY : vy
      }
    }

    const onTouchMove = (e) => {
      if (!ts.active) return
      if (viewportInteractModeRef.current === 'select') return

      const touches = e.touches
      const lay = layerRef.current

      if (ts.isPinch && touches.length >= 2) {
        e.preventDefault()
        // Pinch-to-zoom with simultaneous pan
        const dist = getDist(touches)
        const scale = dist / ts.startDist
        const { min: zMin, max: zMax } = getZoomLimits(lay)
        const nZ = Math.max(zMin, Math.min(zMax, ts.startZoom * scale))

        const midX = (touches[0].clientX + touches[1].clientX) / 2
        const midY = (touches[0].clientY + touches[1].clientY) / 2

        const cpOld = CELL_PX[lay] * ts.startZoom
        const cpNew = CELL_PX[lay] * nZ
        const rect = el.getBoundingClientRect()

        // Keep the grid point under the initial pinch center anchored to the current midpoint
        const nVX = ts.startVX + (ts.startX - rect.left) / cpOld - (midX - rect.left) / cpNew
        const nVY = ts.startVY + (ts.startY - rect.top) / cpOld - (midY - rect.top) / cpNew

        const { x, y } = clampRef.current(nVX, nVY, lay, nZ)
        viewXYRef.current = { x, y }
        setViewX(x)
        setViewY(y)
        setZoom(nZ)
        setFocusedCell(null)
        ts.lastVX = x
        ts.lastVY = y
        ts.lastZoom = nZ
      } else if (!ts.isPinch && touches.length === 1) {
        if (!ts.moved) {
          const dx0 = touches[0].clientX - ts.startX
          const dy0 = touches[0].clientY - ts.startY
          if (Math.hypot(dx0, dy0) < TAP_SLOP_PX) return // still a tap candidate
          ts.moved = true
        }
        e.preventDefault()
        // Single-finger pan
        const zPan = ts.lastZoom !== undefined ? ts.lastZoom : zoomRef.current
        const cp = CELL_PX[lay] * zPan
        const dir = dragDirRef.current
        const dx = (dir * (ts.startX - touches[0].clientX)) / cp
        const dy = (dir * (ts.startY - touches[0].clientY)) / cp
        const { x, y } = clampRef.current(ts.startVX + dx, ts.startVY + dy, lay, zPan)
        viewXYRef.current = { x, y }
        setViewX(x)
        setViewY(y)
        setFocusedCell(null)
        ts.lastVX = x
        ts.lastVY = y
      }
    }

    const onTouchEnd = (e) => {
      const touches = e.touches
      if (touches.length === 0) {
        ts.active = false
        ts.isPinch = false
      } else if (touches.length === 1 && ts.isPinch) {
        // Transitioned from 2 fingers to 1 -- switch to pan mode
        ts.isPinch = false
        ts.startX = touches[0].clientX
        ts.startY = touches[0].clientY
        ts.startVX = ts.lastVX
        ts.startVY = ts.lastVY
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [showGrid])

  // Keyboard navigation
  useEffect(() => {
    const fn = (e) => {
      if (e.target?.tagName === 'INPUT') return
      if (viewportInteractMode === 'select' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      if (layer === 7 || layer === 8) {
        switch (e.key) {
          case 'ArrowLeft': applySegmentNav('left'); break
          case 'ArrowRight': applySegmentNav('right'); break
          case 'ArrowUp': applySegmentNav('up'); break
          case 'ArrowDown': applySegmentNav('down'); break
          case '1': switchLayer(1); break
          case '2': switchLayer(2); break
          case '3': switchLayer(3); break
          case '4': switchLayer(4); break
          case '5': switchLayer(5); break
          case '6': switchLayer(6); break
          case '7': switchLayer(7); break
          case '8': switchLayer(8); break
          default: break
        }
        return
      }
      const cp = CELL_PX[layer] * zoom
      const step = Math.max(1, (vpSize.w / cp) * 0.1)
      // Same scheme as the D-pad: 'view' moves the viewport with the arrow,
      // 'planet' pushes the content in the arrow direction.
      const s = panScheme === 'view' ? -step : step
      switch (e.key) {
        case 'ArrowLeft':  move(s, 0); break
        case 'ArrowRight': move(-s, 0); break
        case 'ArrowUp':    move(0, s); break
        case 'ArrowDown':  move(0, -s); break
        case '1': switchLayer(1); break
        case '2': switchLayer(2); break
        case '3': switchLayer(3); break
        case '4': switchLayer(4); break
        case '5': switchLayer(5); break
        case '6': switchLayer(6); break
        case '7': switchLayer(7); break
        case '8': switchLayer(8); break
        default: break
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [layer, move, switchLayer, vpSize, zoom, applySegmentNav, viewportInteractMode, panScheme])

  const col = planet.color
  // Display coords: viewport corner (L1-L6); L7/L8 use archive cell under crosshair (see hudCenterCell).
  const dispX = Math.floor(viewX) - halfW
  const dispY = halfH - Math.floor(viewY)

  const isLarge = vpSize.w >= 1024
  const segNavMode = layer === 7 || layer === 8
  const segNavTotal = layer === 7 ? L7_SEGMENT_NAV_TOTAL : L8_SEGMENT_COUNT

  const deepFactSlotsForHud = useMemo(() => buildDeepFactSourceSlots(sectionEntries, gridDims), [sectionEntries, gridDims])

  const hudCenterCell = useMemo(() => {
    const cp = CELL_PX[layer] * zoom
    const gx = Math.min(gridW - 1, Math.max(0, Math.floor(viewX + vpSize.w / (2 * cp))))
    const gy = Math.min(gridH - 1, Math.max(0, Math.floor(viewY + vpSize.h / (2 * cp))))
    return {
      gx,
      gy,
      lx: gx - halfW,
      ly: halfH - gy,
    }
  }, [layer, viewX, viewY, zoom, vpSize.w, vpSize.h, gridW, gridH, halfW, halfH])

  const segmentGridFillStats = useMemo(() => {
    if (!segNavMode) return null
    const key = `${hudCenterCell.gx},${hudCenterCell.gy}`
    const cellData = sectionEntries[key]
    return computeSegmentGridFill(layer, cellData, deepFactSlotsForHud)
  }, [segNavMode, layer, hudCenterCell.gx, hudCenterCell.gy, sectionEntries, deepFactSlotsForHud])

  const narrativeSubmitState = useMemo(() => {
    if (!segNavMode) return { kind: 'none' }
    const key = `${hudCenterCell.gx},${hudCenterCell.gy}`
    return getNarrativeSubmitState(layer, sectionEntries[key])
  }, [segNavMode, layer, hudCenterCell.gx, hudCenterCell.gy, sectionEntries])

  const hudDispX = segNavMode ? hudCenterCell.lx : dispX
  const hudDispY = segNavMode ? hudCenterCell.ly : dispY

  const segmentGridHudTitle =
    layer === 8 && segmentGridFillStats
      ? `Cited facts ${segmentGridFillStats.citedFilled}/${L8_FACT_SOURCE_SLOTS} · Narrative tiles ${segmentGridFillStats.narrUsed}/${segmentGridFillStats.narrSlots} · Final slot ${segmentGridFillStats.finalUsed ? 'with entry body' : 'empty'} · Totals ${segmentGridFillStats.used}/${segmentGridFillStats.total} slots`
      : layer === 7 && segmentGridFillStats
        ? `${segmentGridFillStats.used} of ${segmentGridFillStats.total} narrative tiles map to entry sentences (${segmentGridFillStats.empty} lattice placeholders)`
        : ''

  panClampSnapshotRef.current = { x: viewX, y: viewY }

  const hudChipStyle = {
    background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.28)' : '0 2px 12px rgba(15,23,42,0.1)',
  }
  const controlButtonStyle = {
    width: 56,
    height: 56,
    borderRadius: 14,
    touchAction: 'manipulation',
    background: isDark
      ? `linear-gradient(145deg, rgba(15,23,42,0.92), ${col}22)`
      : `linear-gradient(145deg, rgba(255,255,255,0.96), ${col}20)`,
    border: 'none',
    color: isDark ? '#f8fafc' : '#0f172a',
    textShadow: isDark ? '0 1px 10px rgba(0,0,0,0.45)' : '0 1px 0 rgba(255,255,255,0.85)',
    boxShadow: isDark
      ? '0 12px 30px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 12px 28px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.9)',
    backdropFilter: 'blur(12px) saturate(1.25)',
  }

  const statusLine = segNavMode
    ? `${pad4(hudDispX)},${pad4(hudDispY)} · SEG ${segmentNavIndex + 1}/${segNavTotal}${
        segmentGridFillStats ? ` · ${segmentGridFillStats.pct}% full` : ''
      } · L${layer} — ${LAYER_LABELS[layer]}`
    : `${pad4(hudDispX)},${pad4(hudDispY)} · ${CELL_PX[layer]}×${CELL_PX[layer]} px · L${layer} — ${LAYER_LABELS[layer]}`

  return (
    <div
      className={`archive-root${segNavMode ? ' archive-root--seg-hud' : ''}`}
      style={{
        background: isDark ? '#06040C' : '#f8fafc',
        color: isDark ? '#f8fafc' : '#0f172a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* key={hubId}: remount per hub so the intro's internal "gone" state resets —
          without it, switching research lens leaves showGrid=false with no intro,
          i.e. a black screen with only the HUD in the DOM. */}
      <PlanetIntro key={hubId} planet={planet} isDark={isDark} onEnter={() => setShowGrid(true)} gridDims={gridDims} archiveCfg={archiveCfg} />

      <div style={{ 
        opacity: showGrid ? 1 : 0, 
        transition: 'opacity 0.5s ease 0.1s', 
        pointerEvents: showGrid ? 'all' : 'none', 
        display: 'flex', flexDirection: 'column', height: '100%', 
        position: 'relative', zIndex: 1 
      }}>
        
        {/* Responsive HUD: coords + tools; segment band on its own row when L7/L8 */}
        <nav className="archive-nav-overlay" aria-label="Archive navigation">
          <div className="archive-nav-overlay__row archive-nav-overlay__row--top">
            <div
              className="archive-nav-overlay__coords"
              title={`Archive grid: ${gridW}×${gridH} cells (shared across all research lenses)`}
            >
              <div className="archive-hud-chip archive-hud-chip--coords" style={hudChipStyle}>
                <span className="archive-hud-chip__pair">
                  <span className="archive-hud-chip__label" style={{ color: col }} title="Display X">X</span>
                  <span className="archive-hud-chip__value">{pad4(hudDispX)}</span>
                </span>
                <span className="archive-hud-chip__divider" style={{ background: col }} />
                <span className="archive-hud-chip__pair">
                  <span className="archive-hud-chip__label" style={{ color: col }} title="Display Y">Y</span>
                  <span className="archive-hud-chip__value">{pad4(hudDispY)}</span>
                </span>
                {segNavMode && (
                  <>
                    <span className="archive-hud-chip__divider" style={{ background: col }} />
                    <span className="archive-hud-chip__pair" title="Segment tile in this cell">
                      <span className="archive-hud-chip__label" style={{ color: col }}>SEG</span>
                      <span className="archive-hud-chip__value">{segmentNavIndex + 1}/{segNavTotal}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="archive-nav-overlay__tools">
              <button
                type="button"
                className="archive-hud-tool-btn"
                aria-label={dragScheme === 'natural'
                  ? 'Drag direction: grid follows your finger. Switch to inverted.'
                  : 'Drag direction: inverted. Switch back to grid follows your finger.'}
                aria-pressed={dragScheme === 'inverted'}
                title={dragScheme === 'natural'
                  ? 'Drag direction — NATURAL: drag down, grid moves down. Click to invert (drag down, view moves down).'
                  : 'Drag direction — INVERTED: drag down, view moves down. Click for natural (grid follows your finger).'}
                onClick={toggleDragScheme}
                style={{
                  ...hudChipStyle,
                  background: dragScheme === 'inverted' ? (isDark ? `${col}26` : `${col}18`) : hudChipStyle.background,
                  color: col,
                }}
              >
                <ArrowUpDown size={20} aria-hidden />
              </button>
              {isLarge && (
                <SearchBar
                  col={col}
                  isDark={isDark}
                  sectionEntries={sectionEntries}
                  layer={layer}
                  setViewX={setViewX}
                  setViewY={setViewY}
                  setLayer={setLayer}
                  setZoom={setZoom}
                  setFocusedCell={setFocusedCell}
                  vpSize={vpSize}
                  gridDims={gridDims}
                />
              )}
              <button
                type="button"
                className="archive-hud-tool-btn"
                aria-label={viewportInteractMode === 'pan' ? 'Switch to text selection mode' : 'Switch to pan and drag mode'}
                aria-pressed={viewportInteractMode === 'select'}
                title={
                  viewportInteractMode === 'pan'
                    ? 'Select & copy: pause drag-pan and wheel zoom on the map so you can highlight text.'
                    : 'Pan mode: drag or swipe the grid again; wheel zooms.'
                }
                onClick={() => setViewportInteractMode((m) => (m === 'pan' ? 'select' : 'pan'))}
                style={{
                  ...hudChipStyle,
                  background: viewportInteractMode === 'select' ? (isDark ? `${col}26` : `${col}18`) : hudChipStyle.background,
                  color: col,
                }}
              >
                {viewportInteractMode === 'pan' ? <Hand size={20} aria-hidden /> : <TextCursor size={20} aria-hidden />}
              </button>
              <button
                type="button"
                className="archive-hud-tool-btn"
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                onClick={toggleTheme}
                style={{ ...hudChipStyle, color: col }}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          {segNavMode && (segmentGridFillStats || narrativeSubmitState.kind !== 'none') ? (
            <div className="archive-nav-overlay__segment-row">
              <div className="archive-nav-overlay__segment-panel">
                <div className="archive-hud-segment-panel" style={hudChipStyle}>
                  {segmentGridFillStats ? (
                    <div className="archive-hud-segment-stats" title={segmentGridHudTitle} style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                      <span style={{ color: col, fontWeight: 900 }}>SEG GRID</span>
                      <span>{segmentGridFillStats.pct}%</span>
                      <span>· {segmentGridFillStats.empty} empty</span>
                      <span>· {segmentGridFillStats.used}/{segmentGridFillStats.total}</span>
                    </div>
                  ) : null}
                  {narrativeSubmitState.kind === 'ready' ? (
                    <button
                      type="button"
                      title={`Submit — next narrative sentence slot ${narrativeSubmitState.slot} of ${narrativeSubmitState.total}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(
                          `/submit?planet=${encodeURIComponent(hubId)}&coordX=${hudCenterCell.lx}&coordY=${hudCenterCell.ly}&archiveLayer=${layer}&nextSegmentSlot=${narrativeSubmitState.slot}`,
                        )
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 8,
                        border: `1px solid ${col}55`,
                        background: isDark ? `${col}16` : `${col}0e`,
                        color: col,
                        fontSize: 9,
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <PenLine size={12} strokeWidth={2.5} aria-hidden />
                      SUBMIT ({narrativeSubmitState.slot}/{narrativeSubmitState.total})
                    </button>
                  ) : narrativeSubmitState.kind === 'l56_gate' ? (
                    <NarrativeGateMessage
                      message={L56_NARRATIVE_GATE_MESSAGE}
                      shortMessage={L56_NARRATIVE_GATE_SHORT}
                      isDark={isDark}
                      compact
                    />
                  ) : narrativeSubmitState.kind === 'l7_gate' ? (
                    <NarrativeGateMessage
                      message={L7_NARRATIVE_GATE_MESSAGE}
                      shortMessage={L7_NARRATIVE_GATE_SHORT}
                      isDark={isDark}
                      compact
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </nav>

        <header
          className="archive-header"
          style={{
            background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(255,255,255,0.4)',
          }}
        >
          <button type="button" className="archive-back-btn" onClick={() => navigate('/map')} style={{ color: col }}>
            <ArrowLeft size={16} aria-hidden />
            <span className="archive-back-btn__label">EXIT</span>
          </button>

          <div className="archive-nav-toolbar">
            <label
              className="archive-lens-picker"
              title="One shared coordinate grid. Each lens loads a different research corpus at the same cell addresses."
              style={{ '--lens-color': col }}
            >
              <span className="archive-lens-picker__label" style={{ color: isDark ? '#64748b' : '#475569' }}>
                <span className="archive-lens-picker__label-long">RESEARCH LENS</span>
                <span className="archive-lens-picker__label-short">LENS</span>
              </span>
              <span className="archive-lens-picker__row">
                <Globe size={14} className="archive-lens-picker__icon" style={{ color: col, opacity: 0.85 }} aria-hidden />
                <select
                  className="archive-lens-select"
                  value={hubId}
                  aria-label="Switch research lens (shared grid)"
                  onChange={(e) => navigate(`/archive/${e.target.value}`)}
                  style={{
                    '--lens-color': col,
                    background: isDark
                      ? `linear-gradient(135deg, rgba(15,23,42,0.96), ${col}18)`
                      : `linear-gradient(135deg, rgba(255,255,255,0.98), ${col}16)`,
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: isDark ? `0 8px 24px ${col}18` : '0 8px 22px rgba(15,23,42,0.1)',
                  }}
                >
                  {getHubRegistry().map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </span>
            </label>

            <span className="archive-nav-toolbar__divider" style={{ background: `${col}22` }} aria-hidden />

            <div className="archive-nav-layers">
              <div className="archive-tabs-scroll" role="tablist" aria-label="Archive zoom layer">
                {Array.from({ length: TOTAL_LAYERS }, (_, i) => i + 1).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={layer === l}
                    className={`archive-layer-tab${layer === l ? ' archive-layer-tab--active' : ''}`}
                    onClick={() => switchLayer(l)}
                    title={LAYER_LABELS[l]}
                    style={{
                      background: layer === l ? `${col}15` : 'transparent',
                      color: layer === l ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#475569'),
                    }}
                  >
                    L{l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="archive-nav-status" title={statusLine} style={{ color: isDark ? '#475569' : '#64748b' }}>
            {statusLine}
          </div>
        </header>

        {/* Viewport */}
        <div
          ref={vpRef}
          className={`archive-viewport${viewportInteractMode === 'select' ? ' archive-viewport--select-copy' : ''}`}
          style={{
            flex: 1,
            position: 'relative',
            cursor: viewportInteractMode === 'pan' ? 'grab' : 'text',
            overflow: 'hidden',
            touchAction: viewportInteractMode === 'pan' ? 'none' : 'auto',
          }}
        >
          {layer <= STATIC_UP_TO ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: hasCompassTaxonomy && (layer === 2 || layer === 3) ? 0.2 : 1,
                  transition: 'opacity 0.4s',
                  pointerEvents: 'none',
                }}
              >
                <StaticBg layer={layer} viewX={viewX} viewY={viewY} isDark={isDark} color={col} zoom={zoom} planet={planet} gridDims={gridDims} />
              </div>
              {showGrid && layer === 1 && (
                <div className="archive-l1-stage" aria-hidden={false}>
                  <ArchiveL1Atmosphere hubId={hubId} accentColor={col} isDark={isDark} />
                  <ArchiveHubGlobe
                    hubId={hubId}
                    planet={planet}
                    accentColor={col}
                    vpSize={vpSize}
                    zoom={zoom}
                    resetTrigger={planetResetTrigger}
                    moverRef={planetMoverRef}
                  />
                </div>
              )}
              {hasCompassTaxonomy && (layer === 2 || layer === 3) && (
                <ArchiveCompassView
                  layer={layer}
                  taxonomy={hubTaxonomy}
                  isDark={isDark}
                  activeDomainId={compassDomainId}
                  activeSubfieldId={compassSubfieldId}
                  halfW={halfW}
                  halfH={halfH}
                  focusSubjectCell={focusSubjectCell}
                  onSelectDomain={(domainId) => {
                    compassTopicCellRef.current = null
                    setCompassDomainId(domainId)
                    setCompassSubfieldId(null)
                  }}
                  onSelectSubfield={(subfieldId) => {
                    compassTopicCellRef.current = null
                    setCompassSubfieldId(subfieldId)
                  }}
                  onDrillToL3={() => switchLayer(3)}
                  onBackToL2={() => {
                    setCompassDomainId(null)
                    setCompassSubfieldId(null)
                    setLayer(2)
                  }}
                  onExitToL1={() => switchLayer(1)}
                  onAdvanceToL4={() => switchLayer(4)}
                  onProposeSubject={proposeSubjectSlot}
                  onOpenTopic={openTopicFromCompass}
                />
              )}
              <SubjectLatticeOverlay
                layer={layer}
                viewX={viewX}
                viewY={viewY}
                zoom={zoom}
                vpSize={vpSize}
                sectionEntries={sectionEntries}
                col={col}
                isDark={isDark}
                onDrillSubfield={drillSubfield}
                planetId={hubId}
                focusSubjectCell={focusSubjectCell}
                foundationSubfieldId={compassSubfieldId}
                hidePanel={hasCompassTaxonomy && layer >= 1 && layer <= 3}
                onLatticeTileActivate={(subfieldId) => setCompassSubfieldId(subfieldId)}
              />
            </>
          ) : (
            <InteractiveGrid
              layer={layer} viewX={viewX} viewY={viewY} vpW={vpSize.w} vpH={vpSize.h}
              planet={planet} isDark={isDark} navigate={navigate} sectionEntries={sectionEntries}
              zoom={zoom} gridDims={gridDims} hubId={hubId}
              compassDomainId={compassDomainId} compassSubfieldId={compassSubfieldId}
              onDrillFilled={focusSubjectCell}
            />
          )}
          {!(hasCompassTaxonomy && (layer === 2 || layer === 3)) && (
            <div className="archive-crosshair" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 10
            }}>
              <Crosshair size={22} style={{ color: `${col}44` }} />
            </div>
          )}
        </div>

        {/* MOBILE OVERHAUL: Navigation "+" shape and search below */}
        <div className="archive-controls-overlay" style={{ 
          position: 'absolute',
          bottom: layer === 1 ? 'max(6px, env(safe-area-inset-bottom))' : 'max(18px, env(safe-area-inset-bottom))',
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 1000
        }}>
          
          {/* Navigation Controls: D-Pad & Zoom */}
          <div className="archive-controls-overlay__pad-row" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            
            {/* Z-Axis (Layer) Controls -- hidden on L2/L3 compass */}
            {!(hasCompassTaxonomy && (layer === 2 || layer === 3)) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="archive-pan-btn"
                style={controlButtonStyle}
                onClick={() => { setFocusedCell(null); if(layer < TOTAL_LAYERS) switchLayer(layer + 1); }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Layers size={18} /><span style={{ fontSize: 9, fontWeight: 900 }}>+Z</span>
                </div>
              </button>
              <button
                className="archive-pan-btn"
                style={controlButtonStyle}
                onClick={() => { setFocusedCell(null); if(layer > 1) switchLayer(layer - 1); }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 900 }}>-Z</span><Layers size={18} style={{ opacity: 0.5 }} />
                </div>
              </button>
            </div>
            )}

            {/* D-Pad (X, Y) -- hidden on L2/L3 where 4:4:4 compass is primary navigation */}
            {!(hasCompassTaxonomy && (layer === 2 || layer === 3)) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gridTemplateRows: 'repeat(3, 56px)', gap: 8 }}>
              <div />
              <button 
                className="archive-pan-btn" 
                style={controlButtonStyle} 
                type="button"
                title={segNavMode ? 'Previous segment row' : 'Pan +Y (planet toward top)'}
                onPointerDown={(e) => handlePadPointerDown(e, 0, 1)}
                onPointerUp={handlePadPointerEnd}
                onPointerCancel={handlePadPointerEnd}
                onPointerLeave={handlePadPointerEnd}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ChevronUp size={20} /><span style={{ fontSize: 8, fontWeight: 900 }}>{segNavMode ? '−ROW' : '+Y'}</span>
                </div>
              </button>
              <div />

              <button 
                className="archive-pan-btn" 
                style={controlButtonStyle} 
                type="button"
                title={segNavMode ? 'Previous segment column' : 'Pan −X (planet toward left)'}
                onPointerDown={(e) => handlePadPointerDown(e, 1, 0)}
                onPointerUp={handlePadPointerEnd}
                onPointerCancel={handlePadPointerEnd}
                onPointerLeave={handlePadPointerEnd}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ChevronLeft size={20} /><span style={{ fontSize: 8, fontWeight: 900 }}>{segNavMode ? '−COL' : '−X'}</span>
                </div>
              </button>
              
              <div /> {/* Empty center */}

              <button 
                className="archive-pan-btn" 
                style={controlButtonStyle} 
                type="button"
                title={segNavMode ? 'Next segment column' : 'Pan +X (planet toward right)'}
                onPointerDown={(e) => handlePadPointerDown(e, -1, 0)}
                onPointerUp={handlePadPointerEnd}
                onPointerCancel={handlePadPointerEnd}
                onPointerLeave={handlePadPointerEnd}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 8, fontWeight: 900 }}>{segNavMode ? '+COL' : '+X'}</span><ChevronRight size={20} />
                </div>
              </button>

              <div />
              <button 
                className="archive-pan-btn" 
                style={controlButtonStyle} 
                type="button"
                title={segNavMode ? 'Next segment row' : 'Pan −Y (planet toward bottom)'}
                onPointerDown={(e) => handlePadPointerDown(e, 0, -1)}
                onPointerUp={handlePadPointerEnd}
                onPointerCancel={handlePadPointerEnd}
                onPointerLeave={handlePadPointerEnd}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 8, fontWeight: 900 }}>{segNavMode ? '+ROW' : '−Y'}</span><ChevronDown size={20} />
                </div>
              </button>
              <div />
            </div>
            )}

            {/* Scale Zoom Controls -- hidden on L2/L3 compass */}
            {!(hasCompassTaxonomy && (layer === 2 || layer === 3)) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="archive-pan-btn"
                style={controlButtonStyle}
                onClick={() => {
                  setFocusedCell(null)
                  setZoom(prev => {
                    const { max: zMax } = getZoomLimits(layer)
                    const nZ = Math.min(zMax, prev * 1.25)
                    const cpX = viewX + (vpSize.w / 2) / (CELL_PX[layer] * prev)
                    const cpY = viewY + (vpSize.h / 2) / (CELL_PX[layer] * prev)
                    const { x, y } = clamp(cpX - (vpSize.w / 2) / (CELL_PX[layer] * nZ), cpY - (vpSize.h / 2) / (CELL_PX[layer] * nZ), layer, nZ)
                    setViewX(x); setViewY(y)
                    return nZ
                  })
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ZoomIn size={18} /><span style={{ fontSize: 8, fontWeight: 900 }}>+ZOOM</span>
                </div>
              </button>
              <button
                className="archive-pan-btn"
                style={controlButtonStyle}
                onClick={() => {
                  setFocusedCell(null)
                  setZoom(prev => {
                    const { min: zMin } = getZoomLimits(layer)
                    const nZ = Math.max(zMin, prev / 1.25)
                    const cpX = viewX + (vpSize.w / 2) / (CELL_PX[layer] * prev)
                    const cpY = viewY + (vpSize.h / 2) / (CELL_PX[layer] * prev)
                    const { x, y } = clamp(cpX - (vpSize.w / 2) / (CELL_PX[layer] * nZ), cpY - (vpSize.h / 2) / (CELL_PX[layer] * nZ), layer, nZ)
                    setViewX(x); setViewY(y)
                    return nZ
                  })
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ZoomOut size={18} /><span style={{ fontSize: 8, fontWeight: 900 }}>-ZOOM</span>
                </div>
              </button>
              <button
                className="archive-pan-btn"
                style={controlButtonStyle}
                type="button"
                title={panScheme === 'view'
                  ? 'Movement: arrows move your view across the archive. Click to switch — arrows move the map instead.'
                  : 'Movement: arrows move the map in the arrow direction. Click to switch — arrows move your view instead.'}
                onClick={togglePanScheme}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {panScheme === 'view' ? <Navigation size={18} /> : <Move size={18} />}
                  <span style={{ fontSize: 8, fontWeight: 900 }}>{panScheme === 'view' ? 'VIEW' : 'MAP'}</span>
                </div>
              </button>
            </div>
            )}

          </div>

          {/* Search Bar & Reset Row */}
          <div className="archive-controls-overlay__utility-row">
            {!isLarge && (
              <SearchBar 
                col={col} isDark={isDark}
                sectionEntries={sectionEntries}
                layer={layer}
                setViewX={setViewX} setViewY={setViewY}
                setLayer={setLayer} setZoom={setZoom}
                setFocusedCell={setFocusedCell}
                vpSize={vpSize}
                gridDims={gridDims}
              />
            )}
            <button
              className="archive-recenter-btn"
              style={{ 
                height: 46, padding: '0 24px', borderRadius: 23,
                display: 'flex', alignItems: 'center', gap: 8,
                background: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
                border: 'none', color: col, backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer'
              }}
              onClick={() => {
                setFocusedCell(null)
                setZoom(1.0)
                const { x: vx, y: vy } = clampedCenterViewXY({ gridW, gridH, halfW, halfH }, layer, 1.0, vpSize.w, vpSize.h)
                viewXYRef.current = { x: vx, y: vy }
                setViewX(vx)
                setViewY(vy)
                if (layer === 1) setPlanetResetTrigger(t => t + 1)
              }}
            >
              <Target size={18} /> <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.05em' }}>ORIGIN</span>
            </button>
          </div>

        </div>

      </div>
      <style>{`
        .archive-tabs-scroll::-webkit-scrollbar { display: none; }
        .archive-tabs-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulseOrb {
          0%, 100% { box-shadow: 0 0 40px ${col}, 0 0 80px ${col}55, inset 0 0 24px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 60px ${col}, 0 0 120px ${col}44, inset 0 0 24px rgba(0,0,0,0.4); }
        }
        @keyframes ltOverlayAnim {
          0%   { opacity: 1; }
          72%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ltGridZoom {
          0%   { transform: scale(1);   opacity: 0.25; }
          60%  { transform: scale(2.8); opacity: 0.18; }
          100% { transform: scale(5);   opacity: 0; }
        }
        @keyframes ltRingExpand {
          0%   { transform: scale(0.15); opacity: 0.9; }
          60%  { opacity: 0.4; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes ltParticle {
          0%   { opacity: 0;   transform: rotate(var(--lt-angle)) translateX(8px); }
          18%  { opacity: 1; }
          100% { opacity: 0;   transform: rotate(var(--lt-angle)) translateX(var(--lt-dist)); }
        }
        @keyframes ltCoreGlow {
          0%   { transform: scale(0.4); opacity: 0; }
          20%  { transform: scale(1.5); opacity: 1; }
          55%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ltFadeHold {
          0%   { opacity: 0; }
          15%  { opacity: 0.8; }
          72%  { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes ltBracketIn {
          from { opacity: 0; transform: rotate(var(--lt-r, 0deg)) scale(0.6); }
          to   { opacity: 0.85; transform: rotate(var(--lt-r, 0deg)) scale(1); }
        }
        @keyframes ltScanline {
          0%   { top: -2px; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes ltTextSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ltTitleReveal {
          from { opacity: 0; transform: translateY(20px) scale(0.92); letter-spacing: 0.18em; }
          to   { opacity: 1; transform: translateY(0)   scale(1);    letter-spacing: 0.06em; }
        }
        @keyframes ltLineWiden {
          from { width: 0;   opacity: 0; }
          to   { width: 220px; opacity: 0.7; }
        }
        @keyframes ltProgressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      {/* Layer transition cinematic overlay */}
      {layerTrans && (
        <LayerTransitionOverlay
          col={col}
          fromLayer={layerTrans.from}
          toLayer={layerTrans.to}
          onDone={() => setLayerTrans(null)}
        />
      )}
    </div>
  )
}

