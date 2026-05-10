import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef, memo } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import {
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowLeft, BookOpen, Layers, Target, ZoomIn, ZoomOut, Crosshair,
  Shield, Zap, Database, Moon, Sun, Download, PenLine, Hand, TextCursor, Globe, Flag,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import fallbackData from '../data/researchData.json'
import { getSubmissions, migrateSubmission } from '../utils/submissionStorage.js'
import SegmentHoverSurface from '../components/SegmentHoverSurface.jsx'
import {
  buildSortedSegments,
  estimateSegmentDifficulty,
  normalizeSegmentsEasiestFirst,
  resolveSegmentDifficulty,
  segmentDifficultyValue,
  segmentText,
  segmentsToStrings,
} from '../utils/segmentDifficulty.js'
import {
  readGridDimensionsFromStorage,
  ARCHIVE_INSTANCE_LS,
  ARCHIVE_BY_HUB_LS,
  loadHubArchiveConfig,
  ARCHIVE_HUB_LOCATIONS,
  normalizeHubId,
} from '../utils/archiveInstanceStorage.js'
import { ARCHIVE_SOLAR_PUBLIC_URL } from '../config/archiveFrontend.js'
import {
  TOTAL_LAYERS,
  STATIC_UP_TO,
  CELL_PX,
  L7_SEGMENT_COUNT,
  L8_SEGMENT_COUNT,
  L8_GRID_COLS,
  L8_FACT_SOURCE_SLOTS,
  L7_SEGMENT_NAV_COLS,
  L7_SEGMENT_NAV_TOTAL,
  LAYER_LABELS,
} from '../utils/archiveLayerSpecs.js'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData;

/*
 * SOLAR Archive — configurable cell grid (default 3840×2160).
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
  const dims = readGridDimensionsFromStorage(normalizeHubId(routePlanetId))
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
    const TOTAL = L7_SEGMENT_NAV_TOTAL
    const idx = Math.max(0, Math.min(TOTAL - 1, segmentIdx))
    const PAD = 80
    const GAP = 40
    const innerW = cp - 2 * PAD
    const tileW = (innerW - (COLS - 1) * GAP) / COLS
    const ROWS = Math.ceil(TOTAL / COLS)
    const NARR_TOP = 480
    const availH = 1900
    const tileH = (availH - (ROWS - 1) * GAP) / ROWS
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

/** Grid units per D-pad tap/hold for L1–L6 — L1 cell size is 1px so ±1 is invisible; match keyboard (~4% viewport). */
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

function placeholderText(len, seed = 0) {
  const bases = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore. ',
    'Data stream active. Signal strength nominal. Recursive patterns detected in sector 4. ',
    'The archive stores information on solar activities, planetary shifts, and historical data points. ',
    'Coordinate systems calibrated. Synchronizing with deep space archives. Storage unit healthy. '
  ]
  let out = ''
  while (out.length < len) out += bases[(out.length + seed) % bases.length]
  return out.slice(0, len)
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
      '—',
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
    if (s?.coordLabel && String(s.coordLabel).trim() !== '—') n++
  }
  return n
}

/** Next narrative sentence slot (1-based) for L7/L8 submit deep-link; null when narrative band is full. */
function nextNarrativeSegmentSubmitSlot(layer, cellData) {
  const nSeg = Array.isArray(cellData?.segments) ? cellData.segments.length : 0
  if (layer === 7) {
    if (nSeg >= L7_SEGMENT_NAV_TOTAL) return null
    return { slot: nSeg + 1, total: L7_SEGMENT_NAV_TOTAL }
  }
  if (layer === 8) {
    const narrSlots = L8_SEGMENT_COUNT - L8_FACT_SOURCE_SLOTS - 1
    if (nSeg >= narrSlots) return null
    return { slot: nSeg + 1, total: narrSlots }
  }
  return null
}

/**
 * Occupancy of the segment tile grid for HUD (L7: this cell’s narrative grid only.
 * L8: planet citation tier + this cell’s narrative band + final slot when entry has body).
 */
function computeSegmentGridFill(layer, cellData, citationSlots) {
  const nSeg = Array.isArray(cellData?.segments) ? cellData.segments.length : 0
  const hasBody = !!(cellData?.content && String(cellData.content).trim())

  if (layer === 7) {
    const total = L7_SEGMENT_NAV_TOTAL
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
    const narrSlots = L8_SEGMENT_COUNT - L8_FACT_SOURCE_SLOTS - 1
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

function resolveAttachmentUrl(url) {
  if (!url || typeof url !== 'string') return '#'
  const u = url.trim()
  if (/^(https?:|data:|blob:)/i.test(u)) return u
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const path = u.startsWith('/') ? u.slice(1) : u
  try {
    return new URL(path, normalizedBase).href
  } catch {
    return u
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
  if (u.startsWith('data:image/') || u.startsWith('blob:')) return true
  const noQuery = u.split('?')[0]
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(noQuery)
}

function AttachmentLinks({ attachments, col, isDark, title = 'Files', variant = 'default' }) {
  const list = (attachments || []).filter((a) => a && (a.url || a.href))
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
          const href = resolveAttachmentUrl(raw)
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
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{value}</span>
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
        These hubs treat overlapping themes through their own lens — jump to the matching archive cell grid for that domain.
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

/** Opens submit flow pre-filled for segment moderation reports (L6–L8). */
function SegmentReportLink({
  planetId,
  lx,
  ly,
  archiveLayer,
  segmentIndex,
  segmentLabel,
  excerpt,
  col,
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
   CELL LAYOUTS (L4–L8)
   lx/ly = display coordinates (centered, signed)
══════════════════════════════════════════════ */

// L4: 64px - Zone View (title + coords — matches deeper layers’ subject hierarchy)
const L4Content = memo(function L4Content({ lx, ly, data, col, isDark }) {
  const title = String(data?.title || '').trim()
  return (
    <div style={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      {title ? (
        <div
          title={title}
          style={{
            fontSize: 7,
            fontWeight: 800,
            color: isDark ? '#e2e8f0' : '#0f172a',
            lineHeight: 1.15,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
      ) : (
        <div style={{ fontSize: 7, fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8' }}>Empty zone</div>
      )}
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 7, color: isDark ? `${col}cc` : `${col}dd`, marginTop: 'auto' }}>
        {pad4(lx)},{pad4(ly)}
      </div>
    </div>
  )
})

// L5: 256px - Summary
const L5Content = memo(function L5Content({ lx, ly, data, col, isDark }) {
  const hasAtt = (data?.attachments || []).length > 0
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: col, marginBottom: 8, fontWeight: 800 }}>{pad4(lx)},{pad4(ly)} · SUMMARY</div>
      <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#e2e8f0' : '#0f172a', marginBottom: 8, lineHeight: 1.25 }}>{data?.title || 'Pending Entry'}</div>
      <p style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.6, flex: 1, overflow: 'hidden', minHeight: 0 }}>{data?.shortSummary || 'Waiting for contribution...'}</p>
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

/** Empty L7/L8 tiles: dotted frame + corner crosses — no placeholder prose. */
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
            fontFamily: '"JetBrains Mono", monospace',
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

// L6: 1024px — segments ordered easiest → hardest, each with difficulty badge
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
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: col, marginBottom: 16 }}>STORAGE UNIT INF-6</div>
          <MetaPanel label="X COORD" value={pad4(lx)} color={col} isDark={isDark} />
          <div style={{ height: 8 }} />
          <MetaPanel label="Y COORD" value={pad4(ly)} color={col} isDark={isDark} />
        </div>
        <div style={{ flex: 1, padding: 26, overflow: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 12, letterSpacing: '0.1em' }}>ARCHIVE OVERVIEW</div>
          <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.8 }}>{data?.shortSummary || placeholderText(400, lx + ly)}</div>
          <AlternatePerspectivesLinks items={data?.alternatePerspectives} col={col} isDark={isDark} />
          <AttachmentFigures attachments={data?.attachments} col={col} isDark={isDark} variant="default" />
          <AttachmentLinks attachments={data?.attachments} col={col} isDark={isDark} title="DOWNLOADS" variant="default" />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderTop: `1px solid ${col}18` }}>
        <div style={{ padding: '14px 28px 10px', flexShrink: 0, fontSize: 10, fontWeight: 900, color: col, letterSpacing: '0.12em' }}>
          SEGMENTS · EASIEST → HARDEST ({orderedSegments.length || '—'})
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 28px 24px' }}>
          {orderedSegments.length === 0 ? (
            <SegmentHoverSurface
              coordLabel={coordLabel}
              difficulty={
                data?.content?.trim()
                  ? estimateSegmentDifficulty(data.content)
                  : estimateSegmentDifficulty(placeholderText(1200, lx + ly))
              }
              accentColor={col}
              isDark={isDark}
              style={{ cursor: 'default' }}
            >
              <div style={{ fontSize: 12, lineHeight: 1.85, color: isDark ? '#94a3b8' : '#1e293b' }}>
              {data?.content?.trim() ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col }}>FULL TEXT</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(data.content)} isDark={isDark} fontSize={10} />
                      <SegmentReportLink
                        planetId={planetId}
                        lx={lx}
                        ly={ly}
                        archiveLayer={6}
                        segmentIndex="full"
                        segmentLabel="FULL TEXT · single block"
                        excerpt={data.content}
                        col={col}
                        isDark={isDark}
                        compact
                      />
                    </div>
                  </div>
                  {data.content}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <SegmentReportLink
                      planetId={planetId}
                      lx={lx}
                      ly={ly}
                      archiveLayer={6}
                      segmentIndex="placeholder"
                      segmentLabel="L6 · no segments (placeholder body)"
                      excerpt={placeholderText(400, lx + ly)}
                      col={col}
                      isDark={isDark}
                      compact
                    />
                  </div>
                  {placeholderText(1200, lx + ly)}
                </>
              )}
              </div>
            </SegmentHoverSurface>
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
const L7Content = memo(function L7Content({ lx, ly, data, col, isDark, gridFactsCatalog, planetId }) {
  const catalog = gridFactsCatalog || []
  const half = Math.ceil(catalog.length / 2)
  const catalogPart1 = catalog.slice(0, half)
  const catalogPart2 = catalog.slice(half)

  const entryDiff = data?.consensusDifficulty ?? data?.difficulty ?? null
  const orderedSegments = useMemo(
    () => normalizeSegmentsEasiestFirst(Array.isArray(data?.segments) ? data.segments : [], entryDiff),
    [data?.segments, entryDiff],
  )

  const renderFactsList = (items, partLabel) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minHeight: 0, flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: col }}>{partLabel}</div>
      <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#475569', lineHeight: 1.7 }}>
            No indexed archive facts on this planet grid yet.
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, lineHeight: 1.5, color: isDark ? '#94a3b8' : '#475569' }}>
            {items.map((row) => (
              <li key={row.key} style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', color: col, fontWeight: 700 }}>
                  {pad4(row.lx)},{pad4(row.ly)}
                </span>
                {' · '}
                <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{row.title}</strong>
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
          {' '}repeat sentences in <strong>difficulty order</strong> (easiest → hardest). Labels show rank within this entry; badges show comprehension difficulty (1–5).
        </p>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 40, overflow: 'hidden', minHeight: 0 }}>
          {Array.from({ length: L7_SEGMENT_COUNT - 2 }).map((_, i) => {
            const seg = i < orderedSegments.length ? orderedSegments[i] : null
            if (!seg) {
              return (
                <SegmentHoverSurface
                  key={i}
                  coordLabel={coordLabel}
                  difficulty={null}
                  accentColor={col}
                  isDark={isDark}
                  style={{ display: 'flex', flexDirection: 'column', gap: 15, overflow: 'hidden', cursor: 'default', minHeight: 0 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: col }}>TILE {i + 1}</span>
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
                  <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={140} />
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
            {renderFactsList(catalogPart1, `SEGMENT ${L7_SEGMENT_COUNT - 1} · GRID FACT INDEX (PART 1 / 2)`)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', borderTop: `1px solid ${col}22`, paddingTop: 28 }}>
            {renderFactsList(catalogPart2, `SEGMENT ${L7_SEGMENT_COUNT} · GRID FACT INDEX (PART 2 / 2)`)}
          </div>
        </div>
      </div>
    </div>
  )
})

// L8: 16384px - Deep Full
const L8Content = memo(function L8Content({ lx, ly, data, col, isDark, deepFactSources, planetId }) {
  const citations = deepFactSources || []
  const entryDiff = data?.consensusDifficulty ?? data?.difficulty ?? null
  const orderedNarrativeSegs = useMemo(
    () => normalizeSegmentsEasiestFirst(Array.isArray(data?.segments) ? data.segments : [], entryDiff),
    [data?.segments, entryDiff],
  )
  const narrativeSegCount = orderedNarrativeSegs.length
  const coordLabel = `${pad4(lx)},${pad4(ly)}`
  return (
    <div style={{ width: 16384, height: 16384, display: 'flex', flexDirection: 'column', background: isDark ? '#020208' : '#ffffff', padding: 320 }}>
      {/* 4x scaled MetaPanels to perfectly match L7's design array */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 120, marginBottom: 320 }}>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Database size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIMARY SCALE</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>16,384 PX</span>
          </div>
        </div>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Shield size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATA INTEGRITY</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>FULL DEPTH</span>
          </div>
        </div>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Zap size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COMPUTATION</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>QUANTUM EXT.</span>
          </div>
        </div>
        <div style={{ padding: 48, border: `4px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 40 }}>
          <Target size={56} style={{ color: col }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>X,Y ORIGIN</span>
            <span style={{ fontSize: 48, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{pad4(lx)},{pad4(ly)}</span>
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
        {' '}repeat sentences in <strong>difficulty order</strong> (easiest → hardest). The final slot lists every segment with its difficulty; cited-fact tiles stay at the front of the layer.
      </p>
      {/* 450 segments (30×15): slots 1–30 = cited fact + source; remainder = narrative */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${L8_GRID_COLS}, 1fr)`,
        gap: 36,
        borderTop: `4px solid ${col}33`,
        paddingTop: 120,
        overflow: 'hidden',
        paddingBottom: 80,
      }}
      >
        {Array.from({ length: L8_SEGMENT_COUNT }).map((_, i) => {
          const isLast = i === L8_SEGMENT_COUNT - 1
          const nar = i - L8_FACT_SOURCE_SLOTS

          if (i < L8_FACT_SOURCE_SLOTS) {
            const slot = citations[i]
            const isReserve = !slot || String(slot.coordLabel || '').trim() === '—'
            if (isReserve) {
              return (
                <SegmentHoverSurface
                  key={i}
                  coordLabel={coordLabel}
                  difficulty={null}
                  accentColor={col}
                  isDark={isDark}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    overflow: 'hidden',
                    minWidth: 0,
                    border: `1px solid ${col}28`,
                    borderRadius: 8,
                    padding: 14,
                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(248,250,252,0.88)',
                    cursor: 'default',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: col }}>CITED FACT {i + 1}</div>
                    <SegmentReportLink
                      planetId={planetId}
                      lx={lx}
                      ly={ly}
                      archiveLayer={8}
                      segmentIndex={`cited-${i + 1}-empty`}
                      segmentLabel={`L8 cited fact slot ${i + 1} (empty)`}
                      excerpt=""
                      col={col}
                      isDark={isDark}
                      compact
                    />
                  </div>
                  <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={130} />
                </SegmentHoverSurface>
              )
            }
            const href = slot.sourceHref ? resolveAttachmentUrl(slot.sourceHref) : ''
            const hasLink = href && href !== '#'
            const external = hasLink && isCrossOriginHttp(href)
            const accent = isDark ? '#7dd3fc' : '#0369a1'
            return (
              <SegmentHoverSurface
                key={i}
                coordLabel={slot.coordLabel || coordLabel}
                difficulty={estimateSegmentDifficulty(slot.fact)}
                accentColor={col}
                isDark={isDark}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  overflow: 'hidden',
                  minWidth: 0,
                  border: `1px solid ${col}28`,
                  borderRadius: 8,
                  padding: 14,
                  background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(248,250,252,0.95)',
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: col }}>CITED FACT {i + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(slot.fact)} isDark={isDark} fontSize={13} />
                    <SegmentReportLink
                      planetId={planetId}
                      lx={lx}
                      ly={ly}
                      archiveLayer={8}
                      segmentIndex={`cited-${i + 1}`}
                      segmentLabel={`L8 cited fact ${i + 1}`}
                      excerpt={[slot.title, slot.fact].filter(Boolean).join(' — ')}
                      col={col}
                      isDark={isDark}
                      compact
                    />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', color: col, opacity: 0.95 }}>{slot.coordLabel}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#e2e8f0' : '#0f172a', lineHeight: 1.25 }}>{slot.title}</div>
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: isDark ? '#94a3b8' : '#475569',
                  lineHeight: 1.65,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 8,
                  overflow: 'hidden',
                }}
                >
                  {slot.fact}
                </p>
                <div style={{ fontSize: 12, fontWeight: 900, color: col, letterSpacing: '0.08em', marginTop: 'auto' }}>SOURCE</div>
                {hasLink ? (
                  <a
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    style={{ fontSize: 12, fontWeight: 600, color: accent, wordBreak: 'break-word' }}
                  >
                    {slot.sourceLabel || href}
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: isDark ? '#64748b' : '#94a3b8' }}>{slot.sourceLabel || '—'}</span>
                )}
              </SegmentHoverSurface>
            )
          }

          if (isLast) {
            const allSegs = orderedNarrativeSegs
            if (allSegs.length === 0) {
              const hasBody = !!(data?.content && String(data.content).trim())
              if (!hasBody) {
                return (
                  <SegmentHoverSurface
                    key={i}
                    coordLabel={coordLabel}
                    difficulty={null}
                    accentColor={col}
                    isDark={isDark}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      overflow: 'hidden',
                      minWidth: 0,
                      minHeight: 0,
                      cursor: 'default',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: col }}>FINAL SLOT · FULL TEXT</span>
                      <SegmentReportLink
                        planetId={planetId}
                        lx={lx}
                        ly={ly}
                        archiveLayer={8}
                        segmentIndex={`final-${i + 1}-empty`}
                        segmentLabel="L8 final slot (empty · no body)"
                        excerpt=""
                        col={col}
                        isDark={isDark}
                        compact
                      />
                    </div>
                    <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={280} />
                  </SegmentHoverSurface>
                )
              }
              const blob = data.content
              return (
                <SegmentHoverSurface
                  key={i}
                  coordLabel={coordLabel}
                  difficulty={estimateSegmentDifficulty(blob)}
                  accentColor={col}
                  isDark={isDark}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    overflow: 'hidden',
                    minWidth: 0,
                    minHeight: 0,
                    cursor: 'default',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: col }}>FINAL SLOT · FULL TEXT</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <SegmentDifficultyBadge difficulty={estimateSegmentDifficulty(blob)} isDark={isDark} fontSize={15} />
                      <SegmentReportLink
                        planetId={planetId}
                        lx={lx}
                        ly={ly}
                        archiveLayer={8}
                        segmentIndex={`final-${i + 1}-full`}
                        segmentLabel="L8 final slot · full text block"
                        excerpt={blob}
                        col={col}
                        isDark={isDark}
                        compact
                      />
                    </div>
                  </div>
                  <div style={{
                    fontSize: 16,
                    color: isDark ? '#64748b' : '#475569',
                    lineHeight: 1.65,
                    overflow: 'auto',
                    flex: 1,
                    minHeight: 0,
                  }}
                  >
                    {blob}
                  </div>
                </SegmentHoverSurface>
              )
            }
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  overflow: 'hidden',
                  minWidth: 0,
                  minHeight: 0,
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: col }}>
                    ALL SEGMENTS · EASIEST → HARDEST ({allSegs.length})
                  </span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {allSegs.map((seg, si) => (
                    <SegmentHoverSurface
                      key={si}
                      coordLabel={coordLabel}
                      difficulty={resolveSegmentDifficulty(seg)}
                      accentColor={col}
                      isDark={isDark}
                      style={{
                        paddingBottom: 24,
                        borderBottom: `2px solid ${isDark ? 'rgba(79,195,247,0.15)' : `${col}33`}`,
                        cursor: 'default',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                        <span style={{ fontSize: 17, fontWeight: 900, color: col }}>#{si + 1}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <SegmentDifficultyBadge difficulty={segmentDifficultyValue(seg)} isDark={isDark} fontSize={15} />
                          <SegmentReportLink
                            planetId={planetId}
                            lx={lx}
                            ly={ly}
                            archiveLayer={8}
                            segmentIndex={`final-aggregate-${si + 1}`}
                            segmentLabel={`L8 final slot · aggregate list · #${si + 1}`}
                            excerpt={segmentText(seg)}
                            col={col}
                            isDark={isDark}
                            compact
                          />
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: isDark ? '#64748b' : '#475569' }}>
                        {segmentText(seg)}
                      </p>
                    </SegmentHoverSurface>
                  ))}
                </div>
              </div>
            )
          }

          const narSeg = nar < orderedNarrativeSegs.length ? orderedNarrativeSegs[nar] : null
          if (!narSeg) {
            return (
              <SegmentHoverSurface
                key={i}
                coordLabel={coordLabel}
                difficulty={null}
                accentColor={col}
                isDark={isDark}
                style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', minWidth: 0, cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: col }}>SLOT {i + 1}</span>
                  <SegmentReportLink
                    planetId={planetId}
                    lx={lx}
                    ly={ly}
                    archiveLayer={8}
                    segmentIndex={`narr-${i + 1}-empty`}
                    segmentLabel={`L8 narrative slot ${i + 1} (empty)`}
                    excerpt=""
                    col={col}
                    isDark={isDark}
                    compact
                  />
                </div>
                <EmptySegmentSlotFrame col={col} isDark={isDark} minHeight={170} />
              </SegmentHoverSurface>
            )
          }
          const rankInOrder = nar + 1

          return (
            <SegmentHoverSurface
              key={i}
              coordLabel={coordLabel}
              difficulty={resolveSegmentDifficulty(narSeg)}
              accentColor={col}
              isDark={isDark}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', minWidth: 0, cursor: 'default' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: col }}>
                  RANK {rankInOrder}/{narrativeSegCount}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <SegmentDifficultyBadge difficulty={segmentDifficultyValue(narSeg)} isDark={isDark} fontSize={15} />
                  <SegmentReportLink
                    planetId={planetId}
                    lx={lx}
                    ly={ly}
                    archiveLayer={8}
                    segmentIndex={`narr-${i + 1}`}
                    segmentLabel={`L8 narrative · rank ${rankInOrder}`}
                    excerpt={segmentText(narSeg)}
                    col={col}
                    isDark={isDark}
                    compact
                  />
                </div>
              </div>
              <div style={{
                fontSize: 16,
                color: isDark ? '#64748b' : '#475569',
                lineHeight: 1.65,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 12,
                overflow: 'hidden',
              }}
              >
                {segmentText(narSeg)}
              </div>
            </SegmentHoverSurface>
          )
        })}
      </div>
    </div>
  )
})

/* ══════════════════════════════════════════════
   OPTIMIZED GRID CELL
   gx/gy = internal absolute indices
   lx/ly = displayed centered coordinates
══════════════════════════════════════════════ */
const GridCell = memo(function GridCell({ gx, gy, lx, ly, cpx, cpy, cp, layer, data, col, isDark, navigate, planetId, gridFactsCatalog, deepFactSources }) {
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
  }
  // Only L4 and L5 cells are clickable for submission (when empty)
  const canClick = layer >= 4 && layer <= 5 && isEmpty
  return (
    <div
      style={cellStyle}
      onClick={() => canClick && navigate(`/submit?planet=${planetId}&coordX=${lx}&coordY=${ly}`)}
    >
      {layer === 4 && <L4Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} />}
      {layer === 5 && <L5Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} />}
      {layer === 6 && <L6Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} planetId={planetId} />}
      {layer === 7 && <L7Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} gridFactsCatalog={gridFactsCatalog} planetId={planetId} />}
      {layer === 8 && <L8Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} deepFactSources={deepFactSources} planetId={planetId} />}
    </div>
  )
})

/* ══════════════════════════════════════════════
   INTERACTIVE GRID (FRACTIONAL TRANSFORM)
══════════════════════════════════════════════ */
function InteractiveGrid({ layer, viewX, viewY, vpW, vpH, planet, isDark, navigate, sectionEntries, zoom, gridDims, hubId }) {
  const cp = CELL_PX[layer]
  const col = planet.color
  const sx = Math.floor(viewX)
  const sy = Math.floor(viewY)
  const fx = viewX % 1
  const fy = viewY % 1
  const cols = Math.ceil(vpW / (cp * zoom)) + 1
  const rows = Math.ceil(vpH / (cp * zoom)) + 1

  const gridFactsCatalog = useMemo(() => buildGridFactsCatalog(sectionEntries, gridDims), [sectionEntries, gridDims])
  const deepFactSources = useMemo(() => buildDeepFactSourceSlots(sectionEntries, gridDims), [sectionEntries, gridDims])

  const cells = useMemo(() => {
    const arr = []
    const { gridW, gridH, halfW, halfH } = gridDims
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
        {cells.map(({ gx, gy, cpx, cpy }) => (
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
          />
        ))}
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
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: isDark
        ? 'radial-gradient(ellipse at 50% 40%, #0a0819 0%, #020408 100%)'
        : 'radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f1f5f9 100%)',

      opacity: out ? 0 : 1,
      transform: out ? 'scale(1.05)' : 'scale(1)',
      transition: 'opacity 0.65s, transform 0.65s',
      pointerEvents: out ? 'none' : 'all',
    }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 450, height: 450, borderRadius: '50%', background: `radial-gradient(circle, ${col} 0%, transparent 70%)`, opacity: 0.15, pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', maxWidth: 680, padding: '0 24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 18px', borderRadius: 4, border: `1px solid ${col}44`, background: `${col}14`, marginBottom: 30, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.22em', color: col }}>
          <BookOpen size={12} /> LAYER 1 · ARCHIVE FRONT
        </div>
        {hostTitle ? (
          <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#e2e8f0' : '#0f172a', marginBottom: 12, letterSpacing: '0.04em' }}>
            {hostTitle}
          </div>
        ) : null}
        <div style={{ width: 92, height: 92, borderRadius: '50%', margin: '0 auto 28px', background: `radial-gradient(circle at 35% 35%, ${col}ee, ${col}55)`, boxShadow: `0 0 40px ${col}, 0 0 80px ${col}55, inset 0 0 24px rgba(0,0,0,0.4)`, animation: 'pulseOrb 3s ease-in-out infinite' }} />
        <h1 style={{ fontFamily: '"Outfit", sans-serif', fontSize: 'clamp(44px, 9vw, 76px)', fontWeight: 900, letterSpacing: '-0.05em', background: `linear-gradient(135deg, ${col}, ${isDark ? '#fff' : '#0f172a'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px', lineHeight: 1 }}>{planet.planet}</h1>
        <div style={{ marginBottom: 40 }}>
          {/* Detailed Domain */}
          <div style={{ fontSize: 13, fontWeight: 900, color: col, letterSpacing: '0.2em', marginBottom: 8, opacity: 0.9 }}>
            {planet.domain.toUpperCase()}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94a3b8' : '#334155', letterSpacing: '0.05em', maxWidth: 600, lineHeight: 1.6 }}>
            {planet.intro}
          </div>
          {gridLabel ? (
            <div style={{ marginTop: 18, fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: isDark ? '#64748b' : '#475569' }}>
              Coordinate grid · {gridLabel} cells — size comes from your uploaded image (Start archive).
            </div>
          ) : null}
          <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, color: isDark ? '#64748b' : '#475569', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
            Shared themes appear across hubs — when you zoom to deeper layers, entries can link to the same subject through another hub’s scientific lens.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <Link
            to="/"
            style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Home
          </Link>
          <Link
            to="/map"
            style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#67e8f9' : '#0284c7', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Other domains (map)
          </Link>
          <Link
            to="/create-archive"
            style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#fbbf24' : '#b45309', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Configure grid image
          </Link>
        </div>
        <p style={{ fontSize: 11, maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5, color: isDark ? '#64748b' : '#94a3b8' }}>
          Public discovery at{' '}
          <a href={ARCHIVE_SOLAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer" style={{ color: col, fontWeight: 700 }}>
            archive.solar
          </a>{' '}
          is planned as a federation directory (this build stays frontend-only).
        </p>

        <button 
          onClick={enter}
          className="archive-enter-btn"
          style={{
            marginTop: 8, padding: '16px 48px', borderRadius: 30, fontSize: 14, fontWeight: 900,
            letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            background: 'transparent', 
            border: `2px solid ${col}`, 
            color: isDark ? '#fff' : '#0f172a', 
            boxShadow: `0 0 20px ${col}44`,
            position: 'relative', overflow: 'hidden'
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
}) {
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
      <p style={{ margin: '0 0 8px', fontSize: 10, lineHeight: 1.45, color: isDark ? '#94a3b8' : '#64748b' }}>
        Each tile is a viewport fraction at this zoom. Click to center it and drill to L{layer + 1}. Entry titles appear when a cell overlaps seeded coordinates.
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
          const t = titleInCell(i, j)
          return (
            <button
              key={k}
              type="button"
              title={t || `Region ${i + 1},${j + 1} → L${layer + 1}`}
              onClick={() => onDrillSubfield(i, j, subdiv)}
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
              <span style={{ fontSize: 8, fontWeight: 900, fontFamily: '"JetBrains Mono", monospace' }}>{i + 1},{j + 1}</span>
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
                {t || '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   STATIC BACKGROUND (L1–L3) + INTERACTIVE PLANET
══════════════════════════════════════════════ */
function StaticBg({ layer, viewX, viewY, isDark, color, zoom, planet, vpSize, gridDims }) {
  const planetId = planet?.id?.toLowerCase()
  const cp = CELL_PX[layer] * zoom
  const trX = -viewX * cp
  const trY = -viewY * cp
  const hasImage = ['earth', 'mars', 'venus', 'jupiter', 'saturn', 'uranus'].includes(planetId)

  // Planet sits at the true center of the grid
  const planetCenterPx = { x: gridDims.halfW * cp, y: gridDims.halfH * cp }
  
  // Layer 1 Responsive Planet Logic
  // Scale the base radius based on viewport to look good on all devices
  const baseRadius = layer === 1 ? Math.min(vpSize.w, vpSize.h) * 0.35 : 300
  const planetPx = baseRadius * cp

  const customImg = window.SOLAR_LAYER_CONFIG?.[planetId]?.[layer] || planet?.layerImages?.[layer]

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: layer === 1 ? (isDark ? '#000' : '#ffffff') : 'transparent' }}>
      {/* Background Ambience */}
      {layer === 1 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark 
            ? 'radial-gradient(circle at 50% 50%, #0f172a 0%, transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, #cbd5e1 0%, transparent 70%)',
          opacity: 0.4
        }} />
      )}
      <div style={{
        position: 'absolute', left: trX, top: trY,
        width: gridDims.gridW * cp, height: gridDims.gridH * cp,
        background: layer === 1 ? 'transparent' : (isDark ? '#070512' : '#ffffff'),
        backgroundImage: customImg
          ? `url(${customImg})`
          : (layer === 1 ? 'none' : (isDark
            ? `linear-gradient(rgba(79,195,247,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.2) 1px, transparent 1px)`
            : `linear-gradient(rgba(2,132,199,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(2,132,199,0.15) 1px, transparent 1px)`)),

        backgroundSize: customImg ? '100% 100%' : `${cp}px ${cp}px`,
      }}>
        {!customImg && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: layer === 1 ? 'none' : `${cp * 0.5}px solid ${color}2a`, boxSizing: 'border-box', boxShadow: layer === 1 ? 'none' : `inset 0 0 60px ${color}14` }} />
        )}

        {!customImg && (
          <div style={{
            position: 'absolute',
            left: planetCenterPx.x - planetPx,
            top:  planetCenterPx.y - planetPx,
            width: planetPx * 2,
            height: planetPx * 2,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: hasImage
              ? `0 0 ${120 * zoom}px ${color}44`
              : `0 0 ${120 * zoom}px ${color}88, inset 0 0 ${80 * zoom}px rgba(0,0,0,0.5)`,
            background: hasImage ? 'transparent' : `radial-gradient(circle at 30% 30%, ${color}, #000)`,
            opacity: layer === 1 ? 1 : 0,
            pointerEvents: 'none',
          }}>
            {hasImage && <img src={`${import.meta.env.BASE_URL}planets/${planetId}.png`} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} alt={planetId} />}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `inset 0 0 ${40 * zoom}px ${color}aa`, pointerEvents: 'none' }} />
          </div>
        )}
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
    if (targetLayer === 8) fitZoom = 0.08

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
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto', marginRight: 16 }}>
      <Search size={14} style={{ color: isDark ? '#94a3b8' : '#475569', position: 'absolute', left: 8, pointerEvents: 'none' }} />
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="Title, tags, or X,Y…"
        title="Display coordinates lx,ly (e.g. 0,0 or 100,130). On L5–L8, search jumps at your current layer."
        style={{
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${col}44`,
          color: isDark ? '#e2e8f0' : '#0f172a',
          padding: '4px 8px 4px 28px',
          fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
          borderRadius: 4,
          outline: 'none',
          width: 220,
          transition: 'all 0.2s ease',
        }}
      />
      {isOpen && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
          border: `1px solid ${col}33`, borderRadius: 6,
          maxHeight: 320, overflowY: 'auto', zIndex: 100,
          boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
          backdropFilter: 'blur(12px)',
          width: 300,
          display: 'flex', flexDirection: 'column',
        }} onMouseDown={(e) => e.preventDefault()}>
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
              <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: col, fontWeight: 800, marginBottom: 2 }}>
                {pad4(r.lx)},{pad4(r.ly)}
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#e2e8f0' : '#0f172a', lineHeight: 1.4 }}>{r.title}</div>
              {r.subtitle && (
                <div style={{ fontSize: 9, color: isDark ? '#64748b' : '#94a3b8', marginTop: 4 }}>{r.subtitle}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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

  const [gridDims, setGridDims] = useState(() => readGridDimensionsFromStorage(hubId))
  const { gridW, gridH, halfW, halfH } = gridDims

  useEffect(() => {
    setGridDims(readGridDimensionsFromStorage(hubId))
  }, [hubId])

  useEffect(() => {
    const sync = () => setGridDims(readGridDimensionsFromStorage(hubId))
    window.addEventListener('solar-archive-instance-updated', sync)
    const onStorage = (e) => {
      if (e.key === ARCHIVE_INSTANCE_LS || e.key === ARCHIVE_BY_HUB_LS) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('solar-archive-instance-updated', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [hubId])

  const [showGrid, setShowGrid] = useState(false)
  const [layer, setLayer]       = useState(1)
  const [zoom, setZoom]         = useState(1.0)
  const [viewX, setViewX]       = useState(() => initialArchiveViewXYForRoute(routePlanetId).x)
  const [viewY, setViewY]       = useState(() => initialArchiveViewXYForRoute(routePlanetId).y)
  const [focusedCell, setFocusedCell] = useState(null)
  const [vpSize, setVpSize] = useState({ w: document.documentElement.clientWidth, h: window.innerHeight - 92 })
  const [submissionMergeTick, setSubmissionMergeTick] = useState(0)
  /** pan = drag / touch moves grid; select = text selection & copy (no drag-pan on viewport) */
  const [viewportInteractMode, setViewportInteractMode] = useState('pan')
  const drag = useRef({ active: false, sx: 0, sy: 0, svx: 0, svy: 0 })
  const touch = useRef({
    active: false, isPinch: false,
    startX: 0, startY: 0, startVX: 0, startVY: 0,
    startDist: 0, startZoom: 1,
    lastVX: 0, lastVY: 0, lastZoom: 1,
  })
  const lastClick = useRef(0)
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
    return researchData.planets.find(p => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id) || researchData.planets[0]
  }, [hubId])

  // Build section lookup keyed by absolute grid index "gx,gy"
  // Sections start at grid center: section 0 → (halfW, halfH) = display (0,0)
  const sectionEntries = useMemo(() => {
    const m = {}
    planet.sections?.forEach((s, i) => {
      const fullText = s.content || s.fullDepth || s.detailedSummary || s.shortSummary || ''
      let segmentStrings = fullText.match(/[^.!?]+[.!?]*/g) || [fullText]
      segmentStrings = segmentStrings.map(sg => sg.trim()).filter(sg => sg.length > 0)
      const segments = buildSortedSegments(segmentStrings, null)
      // lx/ly layout: row-major, 3 columns, starting from (0,0) display
      const lx = i % 3
      const ly = -(Math.floor(i / 3)) 
      const gx = lx + halfW
      const gy = Math.floor(i / 3) + halfH
      m[`${gx},${gy}`] = {
        title: s.title,
        content: fullText,
        shortSummary: s.shortSummary || fullText.slice(0, 400),
        segments,
        attachments: s.attachments || [],
        tags: s.tags || [],
        alternatePerspectives: Array.isArray(s.alternatePerspectives) ? s.alternatePerspectives : [],
      }
    })
    const pid = String(planet.id || planet.planet || '').toLowerCase()
    try {
      const persisted = getSubmissions()
      persisted.forEach((raw) => {
        const e = migrateSubmission(raw)
        if (e.status !== 'approved') return
        if (String(e.planet || '').toLowerCase() !== pid) return
        const lx = parseInt(String(e.coordX).trim(), 10)
        const ly = parseInt(String(e.coordY).trim(), 10)
        if (!Number.isFinite(lx) || !Number.isFinite(ly)) return
        const gx = lx + halfW
        const gy = halfH - ly
        const key = `${gx},${gy}`
        const fullText = e.detail || ''
        let segStrings = fullText.match(/[^.!?]+[.!?]*/g) || [fullText]
        segStrings = segStrings.map((sg) => sg.trim()).filter((sg) => sg.length > 0)
        const tags = Array.isArray(e.tags) ? e.tags : []
        const entryDifficulty = e.consensusDifficulty ?? e.difficulty ?? null
        const fromUser = {
          title: e.subject || 'Submission',
          content: fullText,
          shortSummary: (e.summary || '').trim() || fullText.slice(0, 400),
          segments: buildSortedSegments(segStrings, entryDifficulty),
          attachments: Array.isArray(e.attachments) ? e.attachments : [],
          tags,
          difficulty: e.difficulty,
          consensusDifficulty: e.consensusDifficulty,
          alternatePerspectives: [],
        }
        const prev = m[key]
        const mergedSegStrings = fromUser.segments?.length
          ? segmentsToStrings(fromUser.segments)
          : segmentsToStrings(prev?.segments)
        const mergedEntryDiff =
          fromUser.consensusDifficulty ??
          fromUser.difficulty ??
          prev?.consensusDifficulty ??
          prev?.difficulty ??
          null
        const mergedSegments = mergedSegStrings.length
          ? buildSortedSegments(mergedSegStrings, mergedEntryDiff)
          : []
        m[key] = prev
          ? {
              ...prev,
              title: fromUser.title || prev.title,
              shortSummary: fromUser.shortSummary || prev.shortSummary,
              content: fromUser.content || prev.content,
              segments: mergedSegments.length ? mergedSegments : prev.segments,
              attachments: [...(prev.attachments || []), ...(fromUser.attachments || [])],
              tags: [...new Set([...(prev.tags || []), ...tags])],
              difficulty: fromUser.difficulty ?? prev.difficulty,
              consensusDifficulty: fromUser.consensusDifficulty ?? prev.consensusDifficulty,
              alternatePerspectives: prev.alternatePerspectives || [],
            }
          : fromUser
      })
    } catch {
      /* ignore */
    }
    for (const key of Object.keys(m)) {
      const entry = m[key]
      if (!entry?.segments?.length) continue
      const ed = entry.consensusDifficulty ?? entry.difficulty ?? null
      m[key] = { ...entry, segments: normalizeSegmentsEasiestFirst(entry.segments, ed) }
    }
    return m
  }, [planet, submissionMergeTick, halfW, halfH])

  // On planet change or grid resize: reset to layer 1, zoom 1, center planet / grid origin on screen
  useEffect(() => {
    setLayer(1)
    setZoom(1.0)
    setFocusedCell(null)
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

  /** When viewport centers on a different archive cell on L7/L8, snap to segment tile 0 there. */
  useEffect(() => {
    if (layer !== 7 && layer !== 8) {
      segmentNavCellRef.current = ''
      return
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

    // Calculate the center of the current viewport in absolute grid coordinates
    const oldCp = CELL_PX[layer] * zoom
    const centerGX = viewX + (vpSize.w / 2) / oldCp
    const centerGY = viewY + (vpSize.h / 2) / oldCp

    setLayer(nl)
    
    let defaultZoom = 1.0
    if (nl === 7) defaultZoom = 0.60
    if (nl === 8) defaultZoom = 0.08
    setZoom(defaultZoom)

    const cp = CELL_PX[nl] * defaultZoom
    const offsetX = (vpSize.w / cp) / 2
    const offsetY = (vpSize.h / cp) / 2

    if (focusedCell) {
      const { x, y } = clamp(focusedCell.x - offsetX, focusedCell.y - offsetY, nl, defaultZoom)
      setViewX(x)
      setViewY(y)
      return
    }

    // Stay centered on the same grid position across layer switches
    const { x, y } = clamp(centerGX - offsetX, centerGY - offsetY, nl, defaultZoom)
    setViewX(x)
    setViewY(y)
  }, [clamp, focusedCell, vpSize, viewX, viewY, layer, zoom])

  /** L2/L3: center a viewport sub-tile and step one layer deeper (matches 4× lattice drill). */
  const drillSubfield = useCallback(
    (row, col, subdiv) => {
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
      if (nl === 8) defaultZoom = 0.08
      setFocusedCell(null)
      setLayer(nl)
      setZoom(defaultZoom)
      const ncp = CELL_PX[nl] * defaultZoom
      const offsetX = vpSize.w / (2 * ncp)
      const offsetY = vpSize.h / (2 * ncp)
      const { x, y } = clamp(centerGX - offsetX, centerGY - offsetY, nl, defaultZoom)
      setViewX(x)
      setViewY(y)
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
      const factor = isPinch ? 0.05 : 0.2
      const delta = e.deltaY < 0 ? factor : -factor
      if (isPinch || Math.abs(e.deltaY) > 40) {
        setFocusedCell(null)
        setZoom(prev => {
          const nZ = Math.max(0.03, Math.min(10.0, prev + delta))
          const lay = layerRef.current
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
        // Match drag: wheel/trackpad moves the planet with your gesture (+Y → up, +X → right).
        move(-e.deltaX / cp, -e.deltaY / cp)
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
      drag.current = { active: true, sx: e.clientX, sy: e.clientY, svx: vx, svy: vy }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!drag.current.active) return
      setFocusedCell(null)
      const cp = CELL_PX[layerRef.current] * zoomRef.current
      const dx = (drag.current.sx - e.clientX) / cp
      const dy = (drag.current.sy - e.clientY) / cp
      const { x, y } = clampRef.current(drag.current.svx + dx, drag.current.svy + dy, layerRef.current, zoomRef.current)
      viewXYRef.current = { x, y }
      setViewX(x)
      setViewY(y)
    }
    const onUp = (e) => {
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

    const onTouchStart = (e) => {
      if (viewportInteractModeRef.current === 'select') return
      // Don't intercept touches on interactive controls
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT'
        || e.target.closest('button') || e.target.closest('select')) return

      const touches = e.touches
      if (touches.length === 1) {
        e.preventDefault()
        const { x: vx, y: vy } = viewXYRef.current
        const z = zoomRef.current
        ts.active = true
        ts.isPinch = false
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
      e.preventDefault()

      const touches = e.touches
      const lay = layerRef.current

      if (ts.isPinch && touches.length >= 2) {
        // Pinch-to-zoom with simultaneous pan
        const dist = getDist(touches)
        const scale = dist / ts.startDist
        const nZ = Math.max(0.03, Math.min(10.0, ts.startZoom * scale))

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
        // Single-finger pan
        const zPan = ts.lastZoom !== undefined ? ts.lastZoom : zoomRef.current
        const cp = CELL_PX[lay] * zPan
        const dx = (ts.startX - touches[0].clientX) / cp
        const dy = (ts.startY - touches[0].clientY) / cp
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
        // Transitioned from 2 fingers to 1 — switch to pan mode
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
      switch (e.key) {
        // Screen-semantic pan: +X → planet right, −X → left; +Y → top, −Y → bottom (same as D-pad).
        case 'ArrowLeft':  move(step, 0); break
        case 'ArrowRight': move(-step, 0); break
        case 'ArrowUp':    move(0, step); break
        case 'ArrowDown':  move(0, -step); break
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
  }, [layer, move, switchLayer, vpSize, zoom, applySegmentNav, viewportInteractMode])

  const col = planet.color
  // Display coords: viewport corner (L1–L6); L7/L8 use archive cell under crosshair (see hudCenterCell).
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

  const nextSegmentSubmitInfo = useMemo(() => {
    if (!segNavMode) return null
    const key = `${hudCenterCell.gx},${hudCenterCell.gy}`
    const cellData = sectionEntries[key]
    return nextNarrativeSegmentSubmitSlot(layer, cellData)
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

  return (
    <div className="archive-root" style={{ 
      background: isDark ? '#06040C' : '#f8fafc', 
      color: isDark ? '#e2e8f0' : '#0f172a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <PlanetIntro planet={planet} isDark={isDark} onEnter={() => setShowGrid(true)} gridDims={gridDims} archiveCfg={archiveCfg} />

      <div style={{ 
        opacity: showGrid ? 1 : 0, 
        transition: 'opacity 0.5s ease 0.1s', 
        pointerEvents: showGrid ? 'all' : 'none', 
        display: 'flex', flexDirection: 'column', height: '100%', 
        position: 'relative', zIndex: 1 
      }}>
        
        {/* HUD strip: coords (left), segment stats + submit (center), tools (right) — single-row height */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 1000,
          pointerEvents: 'none',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 10,
          minHeight: 42,
        }}
        >
          {/* Box 1 — coordinates (+ segment tile index on L7/L8) */}
          <div style={{ pointerEvents: 'auto', justifySelf: 'start', maxWidth: 'min(240px, 38vw)' }} title={`Archive grid: ${gridW}×${gridH} cells (from Start archive)`}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 8,
              padding: '5px 11px',
              alignItems: 'center',
              flexWrap: 'nowrap',
              background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
              border: `1px solid ${col}44`,
              borderRadius: 10,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: col }} title={segNavMode ? 'Archive cell under crosshair (lx, ly)' : 'Viewport anchor X'}>X</span>
                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>{pad4(hudDispX)}</span>
              </div>
              <div style={{ width: 1, height: 14, background: `${col}22`, flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: col }} title={segNavMode ? 'Archive cell under crosshair (lx, ly)' : 'Viewport anchor Y'}>Y</span>
                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>{pad4(hudDispY)}</span>
              </div>
              {segNavMode && (
                <>
                  <div style={{ width: 1, height: 14, background: `${col}22`, flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Segment tile in this cell (arrows / D-pad step tiles)">
                    <span style={{ fontSize: 9, fontWeight: 900, color: col }}>SEG</span>
                    <span style={{ fontSize: 12, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' }}>
                      {segmentNavIndex + 1}/{segNavTotal}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Box 2 — segment grid usage + submit (L7/L8), centered; stays one band tall */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: 0,
            pointerEvents: 'none',
          }}
          >
            {segNavMode && (segmentGridFillStats || nextSegmentSubmitInfo) ? (
              <div
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  rowGap: 6,
                  padding: '5px 11px',
                  maxWidth: 'min(440px, 94vw)',
                  boxSizing: 'border-box',
                  background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
                  border: `1px solid ${col}44`,
                  borderRadius: 10,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                }}
              >
                {segmentGridFillStats ? (
                  <div
                    title={segmentGridHudTitle}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: isDark ? '#94a3b8' : '#475569',
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1.25,
                    }}
                  >
                    <span style={{ color: col, fontWeight: 900 }}>SEG GRID</span>
                    <span>{segmentGridFillStats.pct}%</span>
                    <span style={{ opacity: 0.85 }}>· {segmentGridFillStats.empty} empty</span>
                    <span style={{ opacity: 0.72 }}>· {segmentGridFillStats.used}/{segmentGridFillStats.total}</span>
                  </div>
                ) : null}
                {nextSegmentSubmitInfo ? (
                  <button
                    type="button"
                    title={`Submit archive entry for this cell — next narrative sentence is slot ${nextSegmentSubmitInfo.slot} of ${nextSegmentSubmitInfo.total} (20–250 chars each)`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const lx = hudCenterCell.lx
                      const ly = hudCenterCell.ly
                      const pid = hubId
                      navigate(`/submit?planet=${encodeURIComponent(pid)}&coordX=${lx}&coordY=${ly}&archiveLayer=${layer}&nextSegmentSlot=${nextSegmentSubmitInfo.slot}`)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: `1px solid ${col}55`,
                      background: isDark ? `${col}16` : `${col}0e`,
                      color: col,
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      fontFamily: '"JetBrains Mono", monospace',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <PenLine size={12} strokeWidth={2.5} aria-hidden />
                    SUBMIT ({nextSegmentSubmitInfo.slot}/{nextSegmentSubmitInfo.total})
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Quick switches — right */}
          <div style={{ justifySelf: 'end', display: 'flex', gap: 10, pointerEvents: 'auto', alignItems: 'center', flexShrink: 0 }}>
            {isLarge && (
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
              type="button"
              aria-label={viewportInteractMode === 'pan' ? 'Switch to text selection mode' : 'Switch to pan and drag mode'}
              aria-pressed={viewportInteractMode === 'select'}
              title={
                viewportInteractMode === 'pan'
                  ? 'Select & copy: pause drag-pan and wheel zoom on the map so you can highlight text (touch or mouse).'
                  : 'Pan mode: drag or swipe the grid again; wheel zooms.'
              }
              onClick={() => setViewportInteractMode((m) => (m === 'pan' ? 'select' : 'pan'))}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background:
                  viewportInteractMode === 'select'
                    ? (isDark ? `${col}26` : `${col}18`)
                    : (isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'),
                border:
                  viewportInteractMode === 'select'
                    ? `2px solid ${col}`
                    : `1px solid ${col}44`,
                color: col,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {viewportInteractMode === 'pan' ? <Hand size={20} aria-hidden /> : <TextCursor size={20} aria-hidden />}
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              style={{
                width: 42, height: 42, borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
                border: `1px solid ${col}44`, color: col, backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Top Header / Tabs (Simplified) */}
        <div className="archive-header" style={{ 
          borderBottom: `1px solid ${col}22`, 
          background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(255,255,255,0.4)', 
          display: 'flex', alignItems: 'center',
          position: 'relative',
        }}>
          <button className="archive-back-btn" onClick={() => navigate('/map')} style={{ color: col, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>EXIT</span>
          </button>
          <div style={{ width: 1, height: 24, background: `${col}22`, margin: '0 12px' }} />
          <label
            title="One shared coordinate SEG grid. Each lens loads a different research corpus into the same cell addresses — not separate archives."
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, flexShrink: 0, marginRight: 8 }}
          >
            <span style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#64748b' : '#94a3b8', letterSpacing: '0.06em' }}>RESEARCH LENS</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={14} style={{ color: col, opacity: 0.85 }} aria-hidden />
            <select
              value={hubId}
              aria-label="Switch research lens (shared grid)"
              onChange={(e) => navigate(`/archive/${e.target.value}`)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: 8,
                border: `1px solid ${col}44`,
                background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
                color: isDark ? '#e2e8f0' : '#0f172a',
                maxWidth: 'min(200px, 36vw)',
                cursor: 'pointer',
              }}
            >
              {ARCHIVE_HUB_LOCATIONS.map((h) => (
                <option key={h.id} value={h.id}>{h.label}</option>
              ))}
            </select>
            </span>
          </label>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }} className="archive-tabs-scroll">
            {Array.from({ length: TOTAL_LAYERS }).map((_, i) => (i + 1)).map(l => (
              <button
                key={l}
                className={`archive-layer-tab ${layer === l ? 'archive-layer-tab--active' : ''}`}
                onClick={() => switchLayer(l)}
                style={{
                  background: layer === l ? `${col}15` : 'transparent',
                  color: layer === l ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#94a3b8'),
                  borderColor: layer === l ? `${col}33` : 'transparent',
                  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  transition: 'all 0.2s ease', minWidth: 44
                }}
              >
                L{l}
              </button>
            ))}
          </div>
          <div
            className="md:hidden basis-full w-full max-w-[100vw] px-1 text-center font-mono text-[9px] leading-tight text-ellipsis overflow-hidden"
            title={LAYER_LABELS[layer]}
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {pad4(hudDispX)},{pad4(hudDispY)} · {CELL_PX[layer]}×{CELL_PX[layer]} px · L{layer}
            {segNavMode ? ` · SEG ${segmentNavIndex + 1}/${segNavTotal}` : ''}
          </div>
          <div
            className="hidden md:block"
            title={LAYER_LABELS[layer]}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 10,
              color: isDark ? '#94a3b8' : '#64748b',
              fontFamily: '"JetBrains Mono", monospace',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              maxWidth: 'min(520px, 78vw)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <span style={{ pointerEvents: 'none' }}>
              {pad4(hudDispX)},{pad4(hudDispY)} · {CELL_PX[layer]}×{CELL_PX[layer]} px · L{layer}
              {segNavMode ? ` · SEG ${segmentNavIndex + 1}/${segNavTotal}` : ''}
            </span>
          </div>
        </div>

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
              <StaticBg layer={layer} viewX={viewX} viewY={viewY} isDark={isDark} color={col} zoom={zoom} planet={planet} vpSize={vpSize} gridDims={gridDims} />
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
              />
            </>
          ) : (
            <InteractiveGrid layer={layer} viewX={viewX} viewY={viewY} vpW={vpSize.w} vpH={vpSize.h} planet={planet} isDark={isDark} navigate={navigate} sectionEntries={sectionEntries} zoom={zoom} gridDims={gridDims} hubId={hubId} />
          )}
          <div className="archive-crosshair" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', zIndex: 10
          }}>
            <Crosshair size={22} style={{ color: `${col}44` }} />
          </div>
        </div>

        {/* MOBILE OVERHAUL: Navigation "+" shape and search below */}
        <div style={{ 
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 1000
        }}>
          
          {/* Navigation Controls: D-Pad & Zoom */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            
            {/* Z-Axis (Layer) Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                className="archive-pan-btn" 
                style={{ width: 56, height: 56, borderRadius: 14, background: `${col}15`, border: `2px solid ${col}44` }} 
                onClick={() => { setFocusedCell(null); if(layer < TOTAL_LAYERS) switchLayer(layer + 1); }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Layers size={18} /><span style={{ fontSize: 9, fontWeight: 900 }}>+Z</span>
                </div>
              </button>
              <button 
                className="archive-pan-btn" 
                style={{ width: 56, height: 56, borderRadius: 14, background: `${col}15`, border: `2px solid ${col}44` }} 
                onClick={() => { setFocusedCell(null); if(layer > 1) switchLayer(layer - 1); }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 900 }}>-Z</span><Layers size={18} style={{ opacity: 0.5 }} />
                </div>
              </button>
            </div>

            {/* D-Pad Buttons (X, Y) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gridTemplateRows: 'repeat(3, 56px)', gap: 8 }}>
              <div />
              <button 
                className="archive-pan-btn" 
                style={{ width: 56, height: 56, borderRadius: 14, touchAction: 'manipulation' }} 
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
                style={{ width: 56, height: 56, borderRadius: 14, touchAction: 'manipulation' }} 
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
                style={{ width: 56, height: 56, borderRadius: 14, touchAction: 'manipulation' }} 
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
                style={{ width: 56, height: 56, borderRadius: 14, touchAction: 'manipulation' }} 
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

            {/* Scale Zoom Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                className="archive-pan-btn" 
                style={{ width: 56, height: 56, borderRadius: 14, background: `${col}15`, border: `2px solid ${col}44` }} 
                onClick={() => {
                  setFocusedCell(null)
                  setZoom(prev => {
                    const nZ = Math.min(10.0, prev + 0.25)
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
                style={{ width: 56, height: 56, borderRadius: 14, background: `${col}15`, border: `2px solid ${col}44` }} 
                onClick={() => {
                  setFocusedCell(null)
                  setZoom(prev => {
                    const nZ = Math.max(0.15, prev - 0.25)
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
            </div>

          </div>

          {/* Search Bar & Reset Row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
                border: `1px solid ${col}44`, color: col, backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer'
              }}
              onClick={() => {
                setFocusedCell(null)
                setZoom(1.0)
                const { x: vx, y: vy } = clampedCenterViewXY({ gridW, gridH, halfW, halfH }, layer, 1.0, vpSize.w, vpSize.h)
                viewXYRef.current = { x: vx, y: vy }
                setViewX(vx)
                setViewY(vy)
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
      `}</style>
    </div>
  )
}
