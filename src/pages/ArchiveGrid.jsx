import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowLeft, Globe, BookOpen, Layers, Target, ZoomIn, ZoomOut, Crosshair,
  Shield, Zap, Radio, Database, Cpu, Moon, Sun
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import fallbackData from '../data/researchData.json'

const researchData = window.SOLAR_CONTENT_DATA || fallbackData;

/*
 * SOLAR Archive — 8,294,400 Cell Grid (3840×2160)
 *
 * Coordinate System:
 *   - Internal grid indices:  gx ∈ [0, GRID_W), gy ∈ [0, GRID_H)
 *   - Displayed coordinates:  lx = gx - HALF_W,  ly = gy - HALF_H
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

const GRID_W  = 3840
const GRID_H  = 2160
const HALF_W  = Math.floor(GRID_W / 2)   // 1920
const HALF_H  = Math.floor(GRID_H / 2)   // 1080
const TOTAL_LAYERS = 8
const STATIC_UP_TO = 3

// Cell pixel size per layer index (index 0 unused)
// L1·1  L2·4  L3·16  L4·64  L5·256  L6·1024  L7·4096  L8·16384
const CELL_PX = [0, 1, 4, 16, 64, 256, 1024, 4096, 16384]

const LAYER_LABELS = {
  1: '1px · Overview',
  2: '4px · Region',
  3: '16px · Sector',
  4: '64px · Zone',
  5: '256px · Summary',
  6: '1024px · Detail',
  7: '4096px · Intermediate',
  8: '16384px · Deep Full',
}

// Formats a signed integer to a zero-padded 4-digit string with sign prefix
// e.g. pad4(-5) → "-0005", pad4(12) → "0012"
function pad4(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return sign + String(abs).padStart(4, '0')
}

function placeholderText(len, seed = 0) {
  const bases = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore. ',
    'Data stream active. Signal strength nominal. Recursive patterns detected in sector 4. ',
    'The archive stores information on solar activities, planetary shifts, and historical data points. ',
    'Coordinate systems calibrated. Synchronizing with deep space telemetry. Storage unit healthy. '
  ]
  let out = ''
  while (out.length < len) out += bases[(out.length + seed) % bases.length]
  return out.slice(0, len)
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

/* ══════════════════════════════════════════════
   CELL LAYOUTS (L4–L8)
   lx/ly = display coordinates (centered, signed)
══════════════════════════════════════════════ */

// L4: 64px - Zone View
const L4Content = memo(function L4Content({ lx, ly, col, isDark }) {
  return (
    <div style={{ padding: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: isDark ? `${col}cc` : `${col}dd` }}>
      {pad4(lx)},{pad4(ly)}
    </div>
  )
})

// L5: 256px - Summary
const L5Content = memo(function L5Content({ lx, ly, data, col, isDark }) {
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: col, marginBottom: 8, fontWeight: 800 }}>{pad4(lx)},{pad4(ly)} · SUMMARY</div>
      <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#e2e8f0' : '#0f172a', marginBottom: 8, lineHeight: 1.25 }}>{data?.title || 'Pending Entry'}</div>
      <p style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.6, flex: 1, overflow: 'hidden' }}>{data?.shortSummary || 'Waiting for contribution...'}</p>
    </div>
  )
})

// L6: 1024px - Detail
const L6Content = memo(function L6Content({ lx, ly, data, col, isDark }) {
  return (
    <div style={{ width: 1024, height: 1024, display: 'flex', flexDirection: 'column', border: `1px solid ${col}22`, background: isDark ? 'rgba(4,2,12,0.98)' : 'rgba(255,255,255,0.98)' }}>
      <div style={{ display: 'flex', height: 260, borderBottom: `1px solid ${col}22` }}>
        <div style={{ width: 220, padding: 22, borderRight: `1px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(240,248,255,0.5)' }}>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: col, marginBottom: 16 }}>STORAGE UNIT INF-6</div>
          <MetaPanel label="X COORD" value={pad4(lx)} color={col} isDark={isDark} />
          <div style={{ height: 8 }} />
          <MetaPanel label="Y COORD" value={pad4(ly)} color={col} isDark={isDark} />
        </div>
        <div style={{ flex: 1, padding: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 12, letterSpacing: '0.1em' }}>ARCHIVE OVERVIEW</div>
          <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.8 }}>{data?.shortSummary || placeholderText(400, lx + ly)}</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1, padding: 28, borderRight: `1px solid ${col}11`, fontSize: 12, lineHeight: 1.8, color: isDark ? '#94a3b8' : '#1e293b' }}>{data?.content ? data.content.slice(0, Math.ceil(data.content.length / 2)) : placeholderText(1200, lx)}</div>
        <div style={{ flex: 1, padding: 28, fontSize: 12, lineHeight: 1.8, color: isDark ? '#94a3b8' : '#1e293b' }}>{data?.content ? data.content.slice(Math.ceil(data.content.length / 2)) : placeholderText(1200, ly)}</div>
      </div>
    </div>
  )
})

// L7: 4096px - Intermediate
const L7Content = memo(function L7Content({ lx, ly, data, col, isDark }) {
  return (
    <div style={{ width: 4096, height: 4096, display: 'flex', flexDirection: 'column', background: isDark ? '#050412' : '#f8fafc', padding: 80 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30, marginBottom: 80 }}>
        <MetaPanel label="PRIMARY SCALE" value="4,096 PX" icon={Database} color={col} isDark={isDark} />
        <MetaPanel label="DATA INTEGRITY" value="NOMINAL (99.8%)" icon={Shield} color={col} isDark={isDark} />
        <MetaPanel label="LATENCY" value="2.4 MS" icon={Zap} color={col} isDark={isDark} />
        <MetaPanel label="X,Y ORIGIN" value={`${pad4(lx)},${pad4(ly)}`} icon={Target} color={col} isDark={isDark} />
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 40, borderTop: `1px solid ${col}33`, paddingTop: 60 }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: col }}>SEGMENT {i + 1}</div>
            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#475569', lineHeight: 1.8 }}>
              {data?.segments?.length > 0 ? data.segments[i % data.segments.length] : placeholderText(3000, i + lx)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

// L8: 16384px - Deep Full
// One dedicated "RAW ENTRY FACTS" section for AI-readable structured data
const L8Content = memo(function L8Content({ lx, ly, data, col, isDark }) {
  // Build a structured fact object for AI consumption
  const factObj = {
    coordinate: { x: lx, y: ly },
    title: data?.title || null,
    content: data?.content || null,
    shortSummary: data?.shortSummary || null,
    segments: data?.segments || [],
  }
  return (
    <div style={{ width: 16384, height: 16384, display: 'flex', flexDirection: 'column', background: isDark ? '#020208' : '#ffffff', padding: 280, boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ height: 800, flexShrink: 0, borderBottom: `4px solid ${col}44`, display: 'flex', gap: 120, marginBottom: 180, alignItems: 'flex-start' }}>
        <div style={{ width: 2200, fontSize: 88, fontWeight: 900, color: col, lineHeight: 1.1 }}>
          DEEP ARCHIVE<br />NODE {pad4(lx)}-{pad4(ly)}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <MetaPanel key={i} label={`TELEMETRY ${i + 1}`} value={`${(Math.sin(lx * i + ly) * 50 + 50).toFixed(2)}`} icon={Radio} color={col} isDark={isDark} />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
         RAW ENTRY FACTS — AI-Readable Structured Data
         This section renders ALL facts for this grid cell
         in a structured, machine-parseable text format.
         The data-archive-facts attribute contains the full JSON.
      ═══════════════════════════════════════════ */}
      <div
        id={`archive-facts-${lx}-${ly}`}
        data-archive-facts={JSON.stringify(factObj)}
        style={{
          flexShrink: 0,
          padding: 160,
          marginBottom: 240,
          background: isDark ? `${col}0d` : `${col}08`,
          border: `3px solid ${col}44`,
          borderRadius: 32,
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 900, color: col, marginBottom: 80, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `2px solid ${col}33`, paddingBottom: 40 }}>
          ◆ RAW ENTRY FACTS · AI DATA INDEX
        </div>

        {/* Structured key-value fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px 60px', fontSize: 30, lineHeight: 1.8, marginBottom: 80 }}>
          <div style={{ fontWeight: 900, color: col, textTransform: 'uppercase' }}>COORDINATE</div>
          <div style={{ color: isDark ? '#e2e8f0' : '#0f172a', fontFamily: '"JetBrains Mono", monospace' }}>{pad4(lx)}, {pad4(ly)}</div>

          <div style={{ fontWeight: 900, color: col, textTransform: 'uppercase' }}>TITLE</div>
          <div style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{data?.title || '— No title —'}</div>

          <div style={{ fontWeight: 900, color: col, textTransform: 'uppercase' }}>SUMMARY</div>
          <div style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>{data?.shortSummary || '— No summary —'}</div>
        </div>

        {/* Full content */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: col, marginBottom: 30, textTransform: 'uppercase' }}>FULL CONTENT</div>
          <div style={{ fontSize: 28, lineHeight: 2.0, color: isDark ? '#e2e8f0' : '#0f172a', padding: 60, border: `1px solid ${col}22`, borderRadius: 16, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
            {data?.content || placeholderText(6000, lx + ly)}
          </div>
        </div>

        {/* Fact bullets — each sentence as a discrete, numbered fact */}
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: col, marginBottom: 30, textTransform: 'uppercase' }}>FACTS ({(data?.segments || []).length} entries)</div>
          <ol style={{ margin: 0, paddingLeft: 60, fontSize: 26, lineHeight: 2.2, color: isDark ? '#cbd5e1' : '#1e293b' }}>
            {(data?.segments || ['No facts recorded.']).map((fact, idx) => (
              <li key={idx} style={{ marginBottom: 12 }}>{fact}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* 4x4 Grid Segment Parity with L7 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 120 }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: col }}>SEGMENT {i + 1}</div>
            <div style={{ fontSize: 26, lineHeight: 2.0, color: isDark ? '#475569' : '#1e293b' }}>
              {data?.segments?.length > 0 ? data.segments[i % data.segments.length] : placeholderText(4000, i + ly)}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
})

/* ══════════════════════════════════════════════
   OPTIMIZED GRID CELL
   gx/gy = internal absolute indices
   lx/ly = displayed centered coordinates
══════════════════════════════════════════════ */
const GridCell = memo(function GridCell({ gx, gy, lx, ly, cpx, cpy, cp, layer, data, col, isDark, navigate, planetId }) {
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
      {layer === 4 && <L4Content lx={lx} ly={ly} col={col} isDark={isDark} />}
      {layer === 5 && <L5Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} />}
      {layer === 6 && <L6Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} />}
      {layer === 7 && <L7Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} />}
      {layer === 8 && <L8Content lx={lx} ly={ly} data={data} col={col} isDark={isDark} />}
    </div>
  )
})

/* ══════════════════════════════════════════════
   INTERACTIVE GRID (FRACTIONAL TRANSFORM)
══════════════════════════════════════════════ */
function InteractiveGrid({ layer, viewX, viewY, vpW, vpH, planet, isDark, navigate, sectionEntries, zoom }) {
  const cp = CELL_PX[layer]
  const col = planet.color
  const sx = Math.floor(viewX)
  const sy = Math.floor(viewY)
  const fx = viewX % 1
  const fy = viewY % 1
  const cols = Math.ceil(vpW / (cp * zoom)) + 1
  const rows = Math.ceil(vpH / (cp * zoom)) + 1

  const cells = useMemo(() => {
    const arr = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = sx + c
        const gy = sy + r
        if (gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H) {
          arr.push({ gx, gy, cpx: c * cp, cpy: r * cp })
        }
      }
    }
    return arr
  }, [sx, sy, cols, rows, cp])

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
            lx={gx - HALF_W} ly={HALF_H - gy}
            cpx={cpx} cpy={cpy}
            cp={cp}
            layer={layer}
            data={sectionEntries[`${gx},${gy}`]}
            col={col}
            isDark={isDark}
            navigate={navigate}
            planetId={planet.id}
          />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PLANET INTRO OVERLAY
══════════════════════════════════════════════ */
function PlanetIntro({ planet, isDark, onEnter }) {
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(false)
  if (gone) return null
  const col = planet.color
  const enter = () => { setOut(true); setTimeout(() => { setGone(true); onEnter() }, 650) }
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
          <BookOpen size={12} /> S.O.L.A.R. ARCHIVE · CHAPTER {String(planet.chapter || '01').padStart(2, '0')}
        </div>
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
        </div>

        <button 
          onClick={enter}
          className="archive-enter-btn"
          style={{
            marginTop: 40, padding: '16px 48px', borderRadius: 30, fontSize: 14, fontWeight: 900,
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

/* ══════════════════════════════════════════════
   STATIC BACKGROUND (L1–L3) + INTERACTIVE PLANET
══════════════════════════════════════════════ */
function StaticBg({ layer, viewX, viewY, isDark, color, zoom, planet, vpSize }) {
  const planetId = planet?.id?.toLowerCase()
  const cp = CELL_PX[layer] * zoom
  const trX = -viewX * cp
  const trY = -viewY * cp
  const hasImage = ['earth', 'mars', 'venus', 'jupiter', 'saturn', 'uranus'].includes(planetId)

  // Planet sits at the true center of the grid
  const planetCenterPx = { x: HALF_W * cp, y: HALF_H * cp }
  
  // Layer 1 Responsive Planet Logic
  // Scale the base radius based on viewport to look good on all devices
  const baseRadius = layer === 1 ? Math.min(vpSize.w, vpSize.h) * 0.35 / zoom : 300
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
        width: GRID_W * cp, height: GRID_H * cp,
        background: layer === 1 ? 'transparent' : (isDark ? '#070512' : '#ffffff'),
        backgroundImage: customImg
          ? `url(${customImg})`
          : (layer === 1 ? 'none' : (isDark
            ? `linear-gradient(rgba(79,195,247,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.2) 1px, transparent 1px)`
            : `linear-gradient(rgba(2,132,199,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(2,132,199,0.15) 1px, transparent 1px)`)),

        backgroundSize: customImg ? '100% 100%' : `${cp}px ${cp}px`,
      }}>
        {!customImg && (
          <div style={{ position: 'absolute', inset: 0, border: layer === 1 ? 'none' : `${cp * 0.5}px solid ${color}2a`, boxSizing: 'border-box', boxShadow: layer === 1 ? 'none' : `inset 0 0 60px ${color}14` }} />
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
            {hasImage && <img src={`/planets/${planetId}.png`} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} alt={planetId} />}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `inset 0 0 ${40 * zoom}px ${color}aa`, pointerEvents: 'none' }} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SEARCH BAR
   Searches by centered display coords (lx, ly) or title
══════════════════════════════════════════════ */
function SearchBar({ col, isDark, planet, setViewX, setViewY, setLayer, setZoom, setFocusedCell, vpSize }) {
  const [term, setTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!term.trim()) { setResults([]); return }
    const lw = term.toLowerCase()
    const res = []
    planet.sections?.forEach((s, i) => {
      // lx/ly are display coordinates (centered)
      const lx = i % 3
      const ly = HALF_H - (Math.floor(i / 3) + HALF_H) // Map grid gy back to Cartesian ly
      // Wait, simpler:
      // i=0 -> gx=HALF_W, gy=HALF_H -> lx=0, ly=0
      // i=1 -> gx=HALF_W+1, gy=HALF_H -> lx=1, ly=0
      // i=3 -> gx=HALF_W, gy=HALF_H+1 -> lx=0, ly=-1 (screen down is Y-)
      const res_lx = i % 3
      const res_ly = -(Math.floor(i / 3)) 
      const res_gx = res_lx + HALF_W
      const res_gy = Math.floor(i / 3) + HALF_H
      
      const coordStr = `${pad4(res_lx)},${pad4(res_ly)}`
      if (
        s.title.toLowerCase().includes(lw) ||
        coordStr.includes(lw) ||
        s.shortSummary?.toLowerCase().includes(lw)
      ) {
        res.push({ gx: res_gx, gy: res_gy, lx: res_lx, ly: res_ly, title: s.title })
      }
    })
    setResults(res)
  }, [term, planet])

  const handleSelect = (r) => {
    // Redirect to Layer 6 where information is nicely readable natively
    const targetLayer = 6
    const cp = CELL_PX[targetLayer]
    // Calculate a zoom level that makes the cell fit the screen width (or max 1.0)
    const fitZoom = Math.max(0.15, Math.min(1.0, (vpSize.w * 0.9) / cp))
    
    setLayer(targetLayer)
    setZoom(fitZoom)
    
    // Offset so the cell is exactly in the center of the viewport
    const offsetX = (vpSize.w / (cp * fitZoom)) / 2
    const offsetY = (vpSize.h / (cp * fitZoom)) / 2
    // We want the center of the cell (which starts at r.gx) to be at the center of the screen
    // Cell width in grid units is 1. So cell center is r.gx + 0.5
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
        placeholder="Search regions..."
        style={{
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${col}44`,
          color: isDark ? '#e2e8f0' : '#0f172a',
          padding: '4px 8px 4px 28px',
          fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
          borderRadius: 4,
          outline: 'none',
          width: 200,
          transition: 'all 0.2s ease',
        }}
      />
      {isOpen && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
          border: `1px solid ${col}33`, borderRadius: 6,
          maxHeight: 300, overflowY: 'auto', zIndex: 100,
          boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
          backdropFilter: 'blur(12px)',
          width: 280,
          display: 'flex', flexDirection: 'column',
        }} onMouseDown={(e) => e.preventDefault()}>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                padding: '10px 12px', cursor: 'pointer',
                borderBottom: i < results.length - 1 ? `1px solid ${col}11` : 'none',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: col, fontWeight: 800, marginBottom: 2 }}>
                {pad4(r.lx)},{pad4(r.ly)}
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#e2e8f0' : '#0f172a', lineHeight: 1.4 }}>{r.title}</div>
            </div>
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
  const { planetId } = useParams()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const vpRef = useRef(null)

  const [showGrid, setShowGrid] = useState(false)
  const [layer, setLayer]       = useState(1)
  const [zoom, setZoom]         = useState(1.0)
  const [viewX, setViewX]       = useState(HALF_W)   // starts centered on (0,0)
  const [viewY, setViewY]       = useState(HALF_H)
  const [focusedCell, setFocusedCell] = useState(null)
  const [vpSize, setVpSize] = useState({ w: document.documentElement.clientWidth, h: window.innerHeight - 92 })
  const drag = useRef({ active: false, sx: 0, sy: 0, svx: 0, svy: 0 })
  const lastClick = useRef(0)
  // Cleanup interval on unmount
  useEffect(() => () => {
    if (moveInterval.current) clearInterval(moveInterval.current)
  }, [])

  const planet = useMemo(() => {
    const id = (planetId || 'earth').toLowerCase()
    return researchData.planets.find(p => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id) || researchData.planets[0]
  }, [planetId])

  // Build section lookup keyed by absolute grid index "gx,gy"
  // Sections start at grid center: section 0 → (HALF_W, HALF_H) = display (0,0)
  const sectionEntries = useMemo(() => {
    const m = {}
    planet.sections?.forEach((s, i) => {
      const fullText = s.content || s.fullDepth || s.detailedSummary || s.shortSummary || ''
      let segments = fullText.match(/[^.!?]+[.!?]*/g) || [fullText]
      segments = segments.map(sg => sg.trim()).filter(sg => sg.length > 0)
      // lx/ly layout: row-major, 3 columns, starting from (0,0) display
      const lx = i % 3
      const ly = -(Math.floor(i / 3)) 
      const gx = lx + HALF_W
      const gy = Math.floor(i / 3) + HALF_H
      m[`${gx},${gy}`] = {
        title: s.title,
        content: fullText,
        shortSummary: s.shortSummary || fullText.slice(0, 400),
        segments,
      }
    })
    return m
  }, [planet])

  // On planet change: reset to layer 1, zoom 1, center (0,0) on screen
  useEffect(() => {
    setLayer(1)
    setZoom(1.0)
    setFocusedCell(null)
    // Center viewport on display (0,0) = absolute (HALF_W, HALF_H)
    const cp = CELL_PX[1]
    const vx = HALF_W - (document.documentElement.clientWidth / cp) / 2
    const vy = HALF_H - ((window.innerHeight - 92) / cp) / 2
    setViewX(vx)
    setViewY(vy)
    setShowGrid(false)
  }, [planetId])

  const moveInterval = useRef(null)

  // Clamp viewX/viewY to valid range for the given layer/zoom
  const clamp = useCallback((x, y, l, z) => {
    const cp = CELL_PX[l] * z
    const maxX = Math.max(0, GRID_W - vpSize.w / cp)
    const maxY = Math.max(0, GRID_H - vpSize.h / cp)
    return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) }
  }, [vpSize])

  const move = useCallback((dx, dy) => {
    setFocusedCell(null)
    setViewX(vx => clamp(vx + dx, 0, layer, zoom).x)
    setViewY(vy => clamp(0, vy + dy, layer, zoom).y)
  }, [layer, zoom, clamp])

  const stopMoving = useCallback(() => {
    if (moveInterval.current) {
      clearInterval(moveInterval.current)
      moveInterval.current = null
    }
  }, [])

  const startMoving = useCallback((dx, dy) => {
    stopMoving()
    move(dx, dy) // Initial move
    moveInterval.current = setInterval(() => {
      move(dx, dy)
    }, 60) // 60ms for smooth continuous movement
  }, [move, stopMoving])

  useEffect(() => {
    const fn = () => setVpSize({ w: document.documentElement.clientWidth, h: window.innerHeight - 92 })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Switch layer: navigate to display 0,0 centered on screen
  // unless a search result focused a specific cell
  const switchLayer = useCallback((nl) => {
    nl = Math.max(1, Math.min(TOTAL_LAYERS, nl))
    setLayer(nl)
    setZoom(1.0)

    const cp = CELL_PX[nl]
    const offsetX = (vpSize.w / cp) / 2
    const offsetY = (vpSize.h / cp) / 2

    if (focusedCell) {
      const { x, y } = clamp(focusedCell.x - offsetX, focusedCell.y - offsetY, nl, 1.0)
      setViewX(x)
      setViewY(y)
      return
    }

    // Center display (0,0) = absolute (HALF_W, HALF_H)
    const { x, y } = clamp(HALF_W - offsetX, HALF_H - offsetY, nl, 1.0)
    setViewX(x)
    setViewY(y)
  }, [clamp, focusedCell, vpSize])

  // Mouse wheel: zoom or pan
  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const onWheel = (e) => {
      if (e.target?.tagName === 'INPUT') return
      e.preventDefault()
      const isPinch = e.ctrlKey
      const factor = isPinch ? 0.05 : 0.2
      const delta = e.deltaY < 0 ? factor : -factor
      if (isPinch || Math.abs(e.deltaY) > 40) {
        setFocusedCell(null)
        setZoom(prev => {
          const nZ = Math.max(0.15, Math.min(10.0, prev + delta))
          // Zoom toward viewport center
          const cpX = viewX + (vpSize.w / 2) / (CELL_PX[layer] * prev)
          const cpY = viewY + (vpSize.h / 2) / (CELL_PX[layer] * prev)
          const nVx = cpX - (vpSize.w / 2) / (CELL_PX[layer] * nZ)
          const nVy = cpY - (vpSize.h / 2) / (CELL_PX[layer] * nZ)
          const { x, y } = clamp(nVx, nVy, layer, nZ)
          setViewX(x)
          setViewY(y)
          return nZ
        })
      } else {
        setFocusedCell(null)
        const cp = CELL_PX[layer] * zoom
        move(e.deltaX / cp, e.deltaY / cp)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [showGrid, layer, zoom, move, viewX, viewY, clamp, vpSize])

  // Mouse drag
  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const onDown = (e) => {
      if (e.button !== 0) return
      drag.current = { active: true, sx: e.clientX, sy: e.clientY, svx: viewX, svy: viewY }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!drag.current.active) return
      setFocusedCell(null)
      const cp = CELL_PX[layer] * zoom
      const dx = (drag.current.sx - e.clientX) / cp
      const dy = (drag.current.sy - e.clientY) / cp
      const { x, y } = clamp(drag.current.svx + dx, drag.current.svy + dy, layer, zoom)
      setViewX(x)
      setViewY(y)
    }
    const onUp = (e) => {
      drag.current.active = false;
      el.style.cursor = 'grab';

      // Double-tap detection
      const now = Date.now()
      const clickDiff = now - lastClick.current
      if (clickDiff < 300) {
        if (layer < TOTAL_LAYERS) switchLayer(layer + 1)
        lastClick.current = 0
        return
      }
      lastClick.current = now
    }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [showGrid, layer, viewX, viewY, clamp, zoom, switchLayer])

  // Keyboard navigation
  useEffect(() => {
    const fn = (e) => {
      if (e.target?.tagName === 'INPUT') return
      const cp = CELL_PX[layer] * zoom
      const step = Math.max(1, (vpSize.w / cp) * 0.1)
      switch (e.key) {
        case 'ArrowLeft':  move(-step, 0); break
        case 'ArrowRight': move(step, 0);  break
        case 'ArrowUp':    move(0, -step); break
        case 'ArrowDown':  move(0, step);  break
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
  }, [layer, move, switchLayer, vpSize, zoom])

  const col = planet.color
  // Display coords shown in HUD = current view offset relative to grid center
  const dispX = Math.floor(viewX) - HALF_W
  const dispY = HALF_H - Math.floor(viewY)

  const isLarge = vpSize.w >= 1024



  return (
    <div className="archive-root" style={{ 
      background: isDark ? '#06040C' : '#f8fafc', 
      color: isDark ? '#e2e8f0' : '#0f172a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <PlanetIntro planet={planet} isDark={isDark} onEnter={() => setShowGrid(true)} />

      <div style={{ 
        opacity: showGrid ? 1 : 0, 
        transition: 'opacity 0.5s ease 0.1s', 
        pointerEvents: showGrid ? 'all' : 'none', 
        display: 'flex', flexDirection: 'column', height: '100%', 
        position: 'relative', zIndex: 1 
      }}>
        
        {/* NEW HUD LAYOUT: Top-Left Coordinates, Top-Right Quick Switches */}
        <div style={{ 
          position: 'absolute', top: 12, left: 12, right: 12, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000,
          pointerEvents: 'none'
        }}>
          {/* Coordinates (Left) */}
          <div style={{ 
            display: 'flex', gap: 8, padding: '8px 16px', 
            background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
            border: `1px solid ${col}44`, borderRadius: 12, backdropFilter: 'blur(10px)',
            pointerEvents: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: col }}>X</span>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>{pad4(dispX)}</span>
            </div>
            <div style={{ width: 1, height: 16, background: `${col}22` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: col }}>Y</span>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>{pad4(dispY)}</span>
            </div>
          </div>

          {/* Quick Switches (Right) */}
          <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto', alignItems: 'center' }}>
            {isLarge && (
              <SearchBar 
                col={col} isDark={isDark} planet={planet}
                setViewX={setViewX} setViewY={setViewY}
                setLayer={setLayer} setZoom={setZoom}
                setFocusedCell={setFocusedCell}
                vpSize={vpSize}
              />
            )}
            
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
            
            {/* Planet Switcher */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select 
                value={planet.id?.toLowerCase()}
                onChange={(e) => navigate(`/archive/${e.target.value.toLowerCase()}`)}
                style={{
                  height: 42, padding: '0 40px 0 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  appearance: 'none', border: `1px solid ${col}44`, cursor: 'pointer',
                  background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
                  color: isDark ? '#f1f5f9' : '#0f172a', backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', outline: 'none'
                }}
              >
                {researchData.planets.map(p => (
                  <option key={p.id} value={p.id}>{p.planet}</option>
                ))}
              </select>
              <Globe size={16} style={{ position: 'absolute', right: 16, color: col, pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Top Header / Tabs (Simplified) */}
        <div className="archive-header" style={{ 
          borderBottom: `1px solid ${col}22`, 
          background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(255,255,255,0.4)', 
          padding: '60px 20px 10px 20px',
          display: 'flex', alignItems: 'center'
        }}>
          <button className="archive-back-btn" onClick={() => navigate('/map')} style={{ color: col, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>EXIT</span>
          </button>
          <div style={{ width: 1, height: 24, background: `${col}22`, margin: '0 12px' }} />
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
          <div style={{ marginLeft: 'auto', fontSize: 10, color: isDark ? '#475569' : '#94a3b8', fontFamily: '"JetBrains Mono", monospace', paddingRight: 10, whiteSpace: 'nowrap' }}>
            {LAYER_LABELS[layer]}
          </div>
        </div>

        {/* Viewport */}
        <div className="archive-viewport" ref={vpRef} style={{ flex: 1, position: 'relative', cursor: 'grab', overflow: 'hidden' }}>
          {layer <= STATIC_UP_TO
            ? <StaticBg layer={layer} viewX={viewX} viewY={viewY} isDark={isDark} color={col} zoom={zoom} planet={planet} vpSize={vpSize} />
            : <InteractiveGrid layer={layer} viewX={viewX} viewY={viewY} vpW={vpSize.w} vpH={vpSize.h} planet={planet} isDark={isDark} navigate={navigate} sectionEntries={sectionEntries} zoom={zoom} />
          }
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
          
          {/* "+" Shaped Nav Groups */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gridTemplateRows: 'repeat(3, 64px)', gap: 8 }}>
            <div />
            <button 
              className="archive-pan-btn" 
              style={{ width: 64, height: 64, borderRadius: 16 }} 
              onMouseDown={() => startMoving(0, 1)}
              onMouseUp={stopMoving}
              onMouseLeave={stopMoving}
              onTouchStart={(e) => { e.preventDefault(); startMoving(0, 1); }}
              onTouchEnd={stopMoving}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ChevronUp size={22} /><span style={{ fontSize: 9, fontWeight: 900 }}>+Y</span>
              </div>
            </button>
            <div />

            <button 
              className="archive-pan-btn" 
              style={{ width: 64, height: 64, borderRadius: 16 }} 
              onMouseDown={() => startMoving(1, 0)}
              onMouseUp={stopMoving}
              onMouseLeave={stopMoving}
              onTouchStart={(e) => { e.preventDefault(); startMoving(1, 0); }}
              onTouchEnd={stopMoving}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ChevronLeft size={22} /><span style={{ fontSize: 9, fontWeight: 900 }}>-X</span>
              </div>
            </button>
            <button 
              className="archive-pan-btn" 
              style={{ width: 64, height: 64, borderRadius: 16, background: `${col}15`, border: `2px solid ${col}44` }} 
              onClick={() => switchLayer(layer - 1)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ZoomOut size={20} /><span style={{ fontSize: 9, fontWeight: 900 }}>OUT</span>
              </div>
            </button>
            <button 
              className="archive-pan-btn" 
              style={{ width: 64, height: 64, borderRadius: 16 }} 
              onMouseDown={() => startMoving(-1, 0)}
              onMouseUp={stopMoving}
              onMouseLeave={stopMoving}
              onTouchStart={(e) => { e.preventDefault(); startMoving(-1, 0); }}
              onTouchEnd={stopMoving}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 900 }}>+X</span><ChevronRight size={22} />
              </div>
            </button>

            <div />
            <button 
              className="archive-pan-btn" 
              style={{ width: 64, height: 64, borderRadius: 16 }} 
              onMouseDown={() => startMoving(0, -1)}
              onMouseUp={stopMoving}
              onMouseLeave={stopMoving}
              onTouchStart={(e) => { e.preventDefault(); startMoving(0, -1); }}
              onTouchEnd={stopMoving}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 900 }}>-Y</span><ChevronDown size={22} />
              </div>
            </button>
            <div />
          </div>

          {/* Search Bar & Reset Row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!isLarge && (
              <SearchBar 
                col={col} isDark={isDark} planet={planet}
                setViewX={setViewX} setViewY={setViewY}
                setLayer={setLayer} setZoom={setZoom}
                setFocusedCell={setFocusedCell}
                vpSize={vpSize}
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
                setLayer(1)
                setZoom(1.0)
                const cp = CELL_PX[1]
                const vx = HALF_W - (vpSize.w / cp) / 2
                const vy = HALF_H - (vpSize.h / cp) / 2
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
