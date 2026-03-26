import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowLeft, Globe, BookOpen, Layers, Target, ZoomIn, ZoomOut, Crosshair,
  Shield, Zap, Radio, Database, Cpu
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import researchData from '../data/researchData.json'

/*
 * SOLAR Archive — 8,294,400 Cell Grid (3840×2160)
 *
 * Performance Model: "Fractional Tile Transform"
 * 1. Integer Viewport (sx, sy) determines which cells to render.
 * 2. Cells are positioned via integer index (c * cp).
 * 3. A Parent Container handles sub-pixel translation: -(viewX % 1) * cp.
 * Result: Smooth 120 FPS panning with near-zero React diffing.
 */

const GRID_W = 3840
const GRID_H = 2160
const TOTAL_LAYERS = 8
const STATIC_UP_TO = 3

// L1-L8
const CELL_PX = [0, 1, 4, 16, 64, 256, 1024, 3413, 4096]

const LAYER_LABELS = {
  1: '1px · Overview',   2: '4px · Region',   3: '16px · Sector',
  4: '64px · Zone',      5: '256px · Summary', 6: '1024px · Detail',
  7: '3413px · Intermediate', 8: '4096px · Full',
}

function pad4(n) { return String(n).padStart(4, '0') }

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
        <span style={{ fontSize: 9, color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{value}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   CELL LAYOUTS (L4-L8)
══════════════════════════════════════════════ */

// L4: 64px - Zone View
const L4Content = memo(function L4Content({ x, y, col, isDark }) {
  return (
    <div style={{ padding: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: isDark ? `${col}cc` : `${col}dd` }}>
      {pad4(x)},{pad4(y)}
    </div>
  )
})

// L5: 256px - Summary
const L5Content = memo(function L5Content({ x, y, data, col, isDark }) {
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: col, marginBottom: 8, fontWeight: 800 }}>{pad4(x)},{pad4(y)} · SUMMARY</div>
      <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#e2e8f0' : '#0f172a', marginBottom: 8, lineHeight: 1.25 }}>{data?.title || 'Pending Entry'}</div>
      <p style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.6, flex: 1, overflow: 'hidden' }}>{data?.shortSummary || 'Waiting for contribution...'}</p>
    </div>
  )
})

// L6: 1024px - Detail
const L6Content = memo(function L6Content({ x, y, data, col, isDark }) {
  return (
    <div style={{ width: 1024, height: 1024, display: 'flex', flexDirection: 'column', border: `1px solid ${col}22`, background: isDark ? 'rgba(4,2,12,0.98)' : 'rgba(255,255,255,0.98)' }}>
      <div style={{ display: 'flex', height: 260, borderBottom: `1px solid ${col}22` }}>
         <div style={{ width: 220, padding: 22, borderRight: `1px solid ${col}22`, background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(240,248,255,0.5)' }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: col, marginBottom: 16 }}>STORAGE UNIT INF-6</div>
            <MetaPanel label="X COORD" value={pad4(x)} color={col} isDark={isDark} />
            <div style={{ height: 8 }} />
            <MetaPanel label="Y COORD" value={pad4(y)} color={col} isDark={isDark} />
         </div>
         <div style={{ flex: 1, padding: 26 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 12, letterSpacing: '0.1em' }}>ARCHIVE OVERVIEW</div>
            <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.8 }}>{data?.shortSummary || placeholderText(400, x+y)}</div>
         </div>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
         <div style={{ flex: 1, padding: 28, borderRight: `1px solid ${col}11`, fontSize: 12, lineHeight: 1.8, color: isDark ? '#94a3b8' : '#475569' }}>{placeholderText(1200, x)}</div>
         <div style={{ flex: 1, padding: 28, fontSize: 12, lineHeight: 1.8, color: isDark ? '#94a3b8' : '#475569' }}>{placeholderText(1200, y)}</div>
      </div>
    </div>
  )
})

// L7: 3413px - Intermediate
const L7Content = memo(function L7Content({ x, y, data, col, isDark }) {
  return (
    <div style={{ width: 3413, height: 3413, display: 'flex', flexDirection: 'column', background: isDark ? '#050412' : '#f8fafc', padding: 80 }}>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30, marginBottom: 80 }}>
          <MetaPanel label="PRIMARY SCALE" value="3,413 PX" icon={Database} color={col} isDark={isDark} />
          <MetaPanel label="DATA INTEGRITY" value="NOMINAL (99.8%)" icon={Shield} color={col} isDark={isDark} />
          <MetaPanel label="LATENCY" value="2.4 MS" icon={Zap} color={col} isDark={isDark} />
          <MetaPanel label="X,Y ORIGIN" value={`${pad4(x)},${pad4(y)}`} icon={Target} color={col} isDark={isDark} />
       </div>
       <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 40, borderTop: `1px solid ${col}33`, paddingTop: 60 }}>
          {Array.from({ length: 16 }).map((_, i) => (
             <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: col }}>SEGMENT {i+1}</div>
                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', lineHeight: 1.8 }}>{placeholderText(3000, i+x)}</div>
             </div>
          ))}
       </div>
    </div>
  )
})

// L8: 4096px - Full Detail
const L8Content = memo(function L8Content({ x, y, data, col, isDark }) {
  return (
    <div style={{ width: 4096, height: 4096, display: 'flex', flexDirection: 'column', background: isDark ? '#020208' : '#ffffff', padding: 140 }}>
       <div style={{ height: 400, borderBottom: `2px solid ${col}44`, display: 'flex', gap: 60, marginBottom: 85 }}>
          <div style={{ width: 1000, fontSize: 44, fontWeight: 900, color: col }}>DEEP ARCHIVE NODE {pad4(x)}-{pad4(y)}</div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
             {Array.from({ length: 8 }).map((_, i) => <MetaPanel key={i} label={`TELEMETRY ${i+1}`} value={`${(Math.random()*100).toFixed(2)}`} icon={Radio} color={col} isDark={isDark} />)}
          </div>
       </div>
       <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 60 }}>
          {Array.from({ length: 24 }).map((_, i) => (
             <div key={i} style={{ fontSize: 11, lineHeight: 1.8, color: isDark ? '#475569' : '#94a3b8' }}>{placeholderText(4000, i+y)}</div>
          ))}
       </div>
    </div>
  )
})

/* ══════════════════════════════════════════════
   OPTIMIZED GRID CELL
══════════════════════════════════════════════ */
const GridCell = memo(function GridCell({ x, y, cpx, cpy, cp, layer, data, col, isDark, navigate, planetId }) {
  const isEmpty = !data
  const cellStyle = {
    position: 'absolute', transform: `translate(${cpx}px, ${cpy}px)`, width: cp, height: cp,
    boxSizing: 'border-box', overflow: 'hidden',
    border: `1px solid ${isEmpty ? (isDark ? 'rgba(79,195,247,0.12)' : 'rgba(2,132,199,0.08)') : (isDark ? `${col}33` : `${col}44`)}`,
    background: isEmpty ? (isDark ? 'rgba(7,5,15,0.4)' : 'rgba(240,245,250,0.4)') : (isDark ? '#06040e' : '#ffffff')
  }
  const canClick = layer < 6 && isEmpty
  return (
    <div style={cellStyle} onClick={() => canClick && navigate(`/submit?planet=${planetId}&coordX=${x}&coordY=${y}`)}>
      {layer === 4 && <L4Content x={x} y={y} col={col} isDark={isDark} />}
      {layer === 5 && <L5Content x={x} y={y} data={data} col={col} isDark={isDark} />}
      {layer === 6 && <L6Content x={x} y={y} data={data} col={col} isDark={isDark} />}
      {layer === 7 && <L7Content x={x} y={y} data={data} col={col} isDark={isDark} />}
      {layer === 8 && <L8Content x={x} y={y} data={data} col={col} isDark={isDark} />}
    </div>
  )
})

/* ══════════════════════════════════════════════
   INTERACTIVE GRID (FRACTIONAL TRANSFORM)
══════════════════════════════════════════════ */
function InteractiveGrid({ layer, viewX, viewY, vpW, vpH, planet, isDark, navigate, sectionEntries, zoom }) {
  const cp = CELL_PX[layer], col = planet.color
  const sx = Math.floor(viewX), sy = Math.floor(viewY)
  const fx = viewX % 1, fy = viewY % 1
  const cols = Math.ceil(vpW / (cp * zoom)) + 1, rows = Math.ceil(vpH / (cp * zoom)) + 1

  // RE-RENDER ONLY WHEN ENTERING NEW INTEGER TILE
  const cells = useMemo(() => {
    const arr = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = sx + c, gy = sy + r
        if (gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H) {
          arr.push({ gx, gy, cpx: c * cp, cpy: r * cp })
        }
      }
    }
    return arr
  }, [sx, sy, cols, rows, cp])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Background stays reactive to zoom/pan for visual continuity */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: isDark ? `linear-gradient(rgba(79,195,247,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.08) 1px, transparent 1px)` : `linear-gradient(rgba(2,132,199,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(2,132,199,0.06) 1px, transparent 1px)`, backgroundSize: `${cp * zoom}px ${cp * zoom}px`, backgroundPosition: `${-fx * cp * zoom}px ${-fy * cp * zoom}px` }} />

      {/* TRANSFORM GROUP - ONLY ONE DOM UPDATE PER PAN FRAME */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        transform: `scale(${zoom}) translate(${-fx * cp}px, ${-fy * cp}px)`,
        transformOrigin: 'top left',
        willChange: 'transform'
      }}>
        {cells.map(({ gx, gy, cpx, cpy }) => (
          <GridCell key={`${gx},${gy}`} x={gx} y={gy} cpx={cpx} cpy={cpy} cp={cp} layer={layer} data={sectionEntries[`${gx},${gy}`]} col={col} isDark={isDark} navigate={navigate} planetId={planet.id} />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PLANET INTRO OVERLAY
══════════════════════════════════════════════ */
function PlanetIntro({ planet, isDark, onEnter }) {
  const [out, setOut] = useState(false), [gone, setGone] = useState(false)
  if (gone) return null
  const col = planet.color
  const enter = () => { setOut(true); setTimeout(() => { setGone(true); onEnter() }, 650) }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isDark ? 'radial-gradient(ellipse at 50% 40%, #0a0819 0%, #020408 100%)' : 'radial-gradient(ellipse at 50% 40%, #f1f5ff 0%, #eef3fe 100%)', opacity: out ? 0 : 1, transform: out ? 'scale(1.05)' : 'scale(1)', transition: 'opacity 0.65s, transform 0.65s', pointerEvents: out ? 'none' : 'all' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 450, height: 450, borderRadius: '50%', background: `radial-gradient(circle, ${col} 0%, transparent 70%)`, opacity: 0.15, pointerEvents: 'none' }} />
      <div style={{ relative: 'center', textAlign: 'center', maxWidth: 680, padding: '0 24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 18px', borderRadius: 4, border: `1px solid ${col}44`, background: `${col}14`, marginBottom: 30, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.22em', color: col }}><BookOpen size={12} /> S.O.L.A.R. ARCHIVE · CHAPTER {String(planet.chapter || '01').padStart(2, '0')}</div>
        <div style={{ width: 92, height: 92, borderRadius: '50%', margin: '0 auto 28px', background: `radial-gradient(circle at 35% 35%, ${col}ee, ${col}55)`, boxShadow: `0 0 40px ${col}, 0 0 80px ${col}55, inset 0 0 24px rgba(0,0,0,0.4)`, animation: 'pulseOrb 3s ease-in-out infinite' }} />
        <h1 style={{ fontFamily: '"Outfit", sans-serif', fontSize: 'clamp(44px, 9vw, 76px)', fontWeight: 900, letterSpacing: '-0.05em', background: `linear-gradient(135deg, ${col}, ${isDark ? '#fff' : '#0f172a'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px', lineHeight: 1 }}>{planet.planet}</h1>
        <div style={{ fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', color: isDark ? '#64748b' : '#94a3b8', fontFamily: '"JetBrains Mono", monospace', marginBottom: 40 }}>{planet.domain}</div>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: isDark ? '#94a3b8' : '#475569', maxWidth: 500, margin: '0 auto 48px', fontFamily: '"Inter", sans-serif' }}>{planet.intro}</p>
        <button onClick={enter} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 48px', borderRadius: 8, border: `1px solid ${col}66`, background: `linear-gradient(135deg, ${col}25, ${col}0f)`, color: col, fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '0.12em', cursor: 'pointer', boxShadow: `0 0 28px ${col}33`, transition: 'all 0.2s ease' }}><Globe size={18} /> ENTER ARCHIVE</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   STATIC BACKGROUND (L1-L3) + INTERACTIVE PLANET
══════════════════════════════════════════════ */
function StaticBg({ layer, viewX, viewY, isDark, color, zoom, planetId }) {
  const cp = CELL_PX[layer] * zoom, trX = -viewX * cp, trY = -viewY * cp
  const hasImage = ['earth', 'mars', 'venus', 'jupiter', 'saturn', 'uranus'].includes(planetId);
  
  // Center of the 3840 x 2160 Grid
  const planetCenterPx = { x: (GRID_W / 2) * cp, y: (GRID_H / 2) * cp };
  // Planet radius = 300 cells wide
  const planetRadiusCells = 300; 
  const planetPx = planetRadiusCells * cp;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: layer === 1 ? '#000' : 'transparent' }}>
      <div style={{ position: 'absolute', left: trX, top: trY, width: GRID_W * cp, height: GRID_H * cp, background: layer === 1 ? 'transparent' : (isDark ? '#070512' : '#f4f7fa'), backgroundImage: layer === 1 ? 'none' : (isDark ? `linear-gradient(rgba(79,195,247,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.2) 1px, transparent 1px)` : `linear-gradient(rgba(2,132,199,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(2,132,199,0.15) 1px, transparent 1px)`), backgroundSize: `${cp}px ${cp}px` }}>
        <div style={{ position: 'absolute', inset: 0, border: layer === 1 ? 'none' : `${cp * 0.5}px solid ${color}2a`, boxSizing: 'border-box', boxShadow: layer === 1 ? 'none' : `inset 0 0 60px ${color}14` }} />
        
        {/* Layer 1 Planet Feature */}
        <div style={{
            position: 'absolute',
            left: planetCenterPx.x - planetPx,
            top: planetCenterPx.y - planetPx,
            width: planetPx * 2,
            height: planetPx * 2,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: hasImage ? `0 0 ${120*zoom}px ${color}44` : `0 0 ${120*zoom}px ${color}88, inset 0 0 ${80*zoom}px rgba(0,0,0,0.5)`,
            background: hasImage ? 'transparent' : `radial-gradient(circle at 30% 30%, ${color}, #000)`,
            transition: 'opacity 0.3s, transform 0.3s',
            opacity: layer === 1 ? 1 : 0, // Fades out if we zoom to L2+
            pointerEvents: 'none'
        }}>
            {hasImage && <img src={`/planets/${planetId}.png`} style={{width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%'}} alt={planetId} />}
            {/* Minimal atmospheric glow */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `inset 0 0 ${40*zoom}px ${color}aa`, pointerEvents: 'none' }}></div>
        </div>

      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN ARCHIVE GRID
══════════════════════════════════════════════ */
export default function ArchiveGrid() {
  const { planetId } = useParams(), { theme } = useTheme(), isDark = theme === 'dark', navigate = useNavigate(), vpRef = useRef(null)
  const [showGrid, setShowGrid] = useState(false), [layer, setLayer] = useState(1), [zoom, setZoom] = useState(1.0), [viewX, setViewX] = useState(0), [viewY, setViewY] = useState(0)
  const [vpSize, setVpSize] = useState({ w: window.innerWidth, h: window.innerHeight - 92 })
  const drag = useRef({ active: false, sx: 0, sy: 0, svx: 0, svy: 0 })

  const planet = useMemo(() => {
    const id = (planetId || 'earth').toLowerCase()
    return researchData.planets.find(p => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id) || researchData.planets[0]
  }, [planetId])

  const sectionEntries = useMemo(() => {
    const m = {}
    planet.sections?.forEach((s, i) => { m[`${i % 3},${Math.floor(i / 3)}`] = { title: s.title, content: s.content, shortSummary: s.shortSummary || s.content?.slice(0, 400) } })
    return m
  }, [planet])

  // Center initial view on the planet (1920, 1080)
  useEffect(() => { 
    setLayer(1); 
    setZoom(1.0); 
    // Wait for vpSize to map the center properly
    const vx = (GRID_W / 2) - ((window.innerWidth) / 2);
    const vy = (GRID_H / 2) - ((window.innerHeight - 92) / 2);
    setViewX(vx); 
    setViewY(vy); 
    setShowGrid(false) 
  }, [planetId])

  useEffect(() => {
    const fn = () => setVpSize({ w: window.innerWidth, h: window.innerHeight - 92 })
    window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn)
  }, [])

  const clamp = useCallback((x, y, l, z) => {
    const cp = CELL_PX[l] * z, maxX = Math.max(0, GRID_W - vpSize.w / cp), maxY = Math.max(0, GRID_H - vpSize.h / cp)
    return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) }
  }, [vpSize])

  const move = useCallback((dx, dy) => {
    setViewX(vx => { const { x } = clamp(vx + dx, viewY, layer, zoom); return x })
    setViewY(vy => { const { y } = clamp(viewX, vy + dy, layer, zoom); return y })
  }, [viewX, viewY, layer, zoom, clamp])

  const switchLayer = useCallback((nl) => {
    nl = Math.max(1, Math.min(TOTAL_LAYERS, nl)); setLayer(nl); setZoom(1.0)
    // When switching layers, attempt to keep the center of the screen stable
    const cpPrev = CELL_PX[layer] * zoom;
    const cpNext = CELL_PX[nl] * 1.0;
    
    // Center point in grid coordinates
    const centerX = viewX + (vpSize.w / 2) / cpPrev;
    const centerY = viewY + (vpSize.h / 2) / cpPrev;

    const nVx = centerX - (vpSize.w / 2) / cpNext;
    const nVy = centerY - (vpSize.h / 2) / cpNext;

    const { x, y } = clamp(nVx, nVy, nl, 1.0); 
    setViewX(x); 
    setViewY(y)
  }, [viewX, viewY, clamp, TOTAL_LAYERS, layer, zoom, vpSize])

  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const onWheel = (e) => {
      if (e.target?.tagName === 'INPUT') return
      e.preventDefault()
      const isPinch = e.ctrlKey, factor = isPinch ? 0.05 : 0.2, delta = e.deltaY < 0 ? factor : -factor
      if (isPinch || Math.abs(e.deltaY) > 40) {
        setZoom(prev => {
          const nZ = Math.max(0.15, Math.min(10.0, prev + delta))
          
          // Zoom towards center of viewport
          const cpX = viewX + (vpSize.w / 2) / (CELL_PX[layer] * prev);
          const cpY = viewY + (vpSize.h / 2) / (CELL_PX[layer] * prev);

          const nVx = cpX - (vpSize.w / 2) / (CELL_PX[layer] * nZ);
          const nVy = cpY - (vpSize.h / 2) / (CELL_PX[layer] * nZ);

          const { x, y } = clamp(nVx, nVy, layer, nZ); 
          setViewX(x); 
          setViewY(y); 
          return nZ
        })
      } else {
        const cp = CELL_PX[layer] * zoom; move(e.deltaX / cp, e.deltaY / cp)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false }); return () => el.removeEventListener('wheel', onWheel)
  }, [showGrid, layer, zoom, move, viewX, viewY, clamp, vpSize])

  useEffect(() => {
    if (!showGrid) return
    const el = vpRef.current; if (!el) return
    const onDown = (e) => { if (e.button !== 0) return; drag.current = { active: true, sx: e.clientX, sy: e.clientY, svx: viewX, svy: viewY }; el.style.cursor = 'grabbing' }
    const onMove = (e) => {
      if (!drag.current.active) return
      const cp = CELL_PX[layer] * zoom, dx = (drag.current.sx - e.clientX) / cp, dy = (drag.current.sy - e.clientY) / cp
      const { x, y } = clamp(drag.current.svx + dx, drag.current.svy + dy, layer, zoom); setViewX(x); setViewY(y)
    }
    const onUp = () => { drag.current.active = false; el.style.cursor = 'grab' }
    el.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { el.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [showGrid, layer, viewX, viewY, clamp, zoom])

  useEffect(() => {
    const fn = (e) => {
      if (e.target?.tagName === 'INPUT') return
      const cp = CELL_PX[layer] * zoom, step = Math.max(1, (vpSize.w / cp) * 0.1)
      switch (e.key) {
        case 'ArrowLeft': move(-step, 0); break; case 'ArrowRight': move(step, 0); break
        case 'ArrowUp': move(0, -step); break; case 'ArrowDown': move(0, step); break
        case '1': switchLayer(1); break; case '2': switchLayer(2); break; case '3': switchLayer(3); break
        case '4': switchLayer(4); break; case '5': switchLayer(5); break; case '6': switchLayer(6); break
        case '7': switchLayer(7); break; case '8': switchLayer(8); break
        default: break
      }
    }
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn)
  }, [layer, move, switchLayer, vpSize, zoom])

  const col = planet.color

  return (
    <div className="archive-root" style={{ background: isDark ? '#06040C' : '#f8fafc', color: isDark ? '#e2e8f0' : '#0f172a' }}>
      <PlanetIntro planet={planet} isDark={isDark} onEnter={() => setShowGrid(true)} />
      <div style={{ opacity: showGrid ? 1 : 0, transition: 'opacity 0.5s ease 0.1s', pointerEvents: showGrid ? 'all' : 'none', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
        <div className="archive-hud-top" style={{ background: isDark ? 'rgba(6,4,12,0.94)' : 'rgba(248,250,252,0.94)', borderBottom: `1px solid ${col}22`, backdropFilter: 'blur(12px)' }}>
          <div className="archive-hud-left">
            <button className="archive-btn" onClick={() => navigate('/map')}><ArrowLeft size={14} /> Exit</button>
            <div className="archive-planet-badge" style={{ borderColor: `${col}44`, background: `${col}08` }}>
              <div className="archive-planet-dot" style={{ background: col, boxShadow: `0 0 12px ${col}` }} />
              <span style={{ fontWeight: 800, fontSize: 13, color: col }}>{planet.planet}</span>
            </div>
          </div>
          <div className="archive-hud-right">
            <div className="archive-coord-display"><span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}>MAGNIFICATION</span><span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 14 }}>{zoom.toFixed(2)}x</span></div>
            {[['X', Math.floor(viewX)], ['Y', Math.floor(viewY)]].map(([l, v]) => (
              <div key={l} className="archive-coord-display"><span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}>{l}</span><span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 14 }}>{pad4(v)}</span></div>
            ))}
          </div>
        </div>
        <div className="archive-layer-tabs" style={{ borderBottom: `1px solid ${col}11` }}>
          {Array.from({ length: TOTAL_LAYERS }, (_, i) => i + 1).map(l => (
            <button key={l} className={`archive-layer-tab ${layer === l ? 'archive-layer-tab--active' : ''}`} onClick={() => switchLayer(l)} style={{ background: layer === l ? `${col}15` : 'transparent', color: layer === l ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#94a3b8'), borderColor: layer === l ? `${col}33` : 'transparent' }}>
              <Layers size={11} /> <span>L{l}</span>
            </button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 10, color: isDark ? '#475569' : '#94a3b8', fontFamily: '"JetBrains Mono", monospace', paddingRight: 10 }}>{LAYER_LABELS[layer]}</div>
        </div>
        <div className="archive-viewport" ref={vpRef} style={{ cursor: 'grab' }}>
          {layer <= STATIC_UP_TO ? <StaticBg layer={layer} viewX={viewX} viewY={viewY} isDark={isDark} color={col} zoom={zoom} planetId={planet.id?.toLowerCase()} /> : <InteractiveGrid layer={layer} viewX={viewX} viewY={viewY} vpW={vpSize.w} vpH={vpSize.h} planet={planet} isDark={isDark} navigate={navigate} sectionEntries={sectionEntries} zoom={zoom} />}
          <div className="archive-crosshair"><Crosshair size={22} style={{ color: `${col}33` }} /></div>
        </div>
        <div className="archive-controls" style={{ borderTop: `1px solid ${col}22`, backdropFilter: 'blur(8px)' }}>
          <div className="archive-pan-group">
            <button className="archive-pan-btn" onClick={() => move(0, -1)}><ChevronUp size={15} /></button>
            <div className="archive-pan-row"><button className="archive-pan-btn" onClick={() => move(-1, 0)}><ChevronLeft size={15} /></button><button className="archive-pan-btn" onClick={() => move(1, 0)}><ChevronRight size={15} /></button></div>
            <button className="archive-pan-btn" onClick={() => move(0, 1)}><ChevronDown size={15} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button className="archive-zoom-btn" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut size={16} /></button>
            <span style={{ fontSize: 10, fontWeight: 900 }}>DENSITY</span>
            <button className="archive-zoom-btn" onClick={() => setZoom(z => Math.min(10, z + 0.2))}><ZoomIn size={16} /></button>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><div className="archive-zoom-bar" style={{ width: 140 }}><div className="archive-zoom-fill" style={{ width: `${(zoom / 8) * 100}%`, background: col }} /></div></div>
          <button className="archive-recenter-btn" onClick={() => { setLayer(1); setZoom(1.0); setViewX((GRID_W/2)-(vpSize.w/2)); setViewY((GRID_H/2)-(vpSize.h/2)) }}><Target size={16} /> <span>Reset</span></button>
        </div>
      </div>
      <style>{`@keyframes pulseOrb { 0%, 100% { box-shadow: 0 0 40px ${col}, 0 0 80px ${col}55, inset 0 0 24px rgba(0,0,0,0.4); } 50% { box-shadow: 0 0 60px ${col}, 0 0 120px ${col}44, inset 0 0 24px rgba(0,0,0,0.4); } }`}</style>
    </div>
  )
}
