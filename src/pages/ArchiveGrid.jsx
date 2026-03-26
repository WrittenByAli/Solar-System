import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Layers, Crosshair, ArrowLeft, Globe, BookOpen, X, Plus, Minus, Target } from 'lucide-react'
import { useTheme } from '../App.jsx'
import researchData from '../data/researchData.json'

/*
 * SOLAR Archive – Static Layered Grid
 * Planet intro → grid with zoom/pan → layer-switching
 */

const BASE_CELL_SIZE = 64
const LAYER_MULTIPLIERS = { 1: 1, 2: 4, 3: 16, 4: 64 }
const LAYER_LABELS = { 1: '256×256', 2: '1024×1024', 3: '4096×4096', 4: '16384×16384' }
const LAYER_NAMES = { 1: 'Subject Index', 2: 'Summary', 3: 'Detail', 4: 'Full Depth' }
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.12

function formatCoord(n) {
  return String(Math.abs(n)).padStart(4, '0')
}

function starRow(n) {
  const d = Math.min(5, Math.max(1, n || 3))
  return { filled: d, empty: 5 - d }
}

/* ── DifficultyStars ── */
const DifficultyStars = memo(function DifficultyStars({ level, size = 'sm' }) {
  const { filled, empty } = starRow(level)
  const fontSize = size === 'sm' ? '10px' : size === 'md' ? '13px' : '16px'
  return (
    <span style={{ display: 'inline-flex', gap: '1px', fontSize }}>
      {Array.from({ length: filled }, (_, i) => (
        <span key={`f${i}`} style={{ color: '#f5a623' }}>★</span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} style={{ color: 'rgba(245,166,35,0.2)' }}>★</span>
      ))}
    </span>
  )
})

/* ── Planet Introduction Overlay ── */
function PlanetIntro({ planet, isDark, onEnter }) {
  const [visible, setVisible] = useState(true)
  const [animOut, setAnimOut] = useState(false)

  const handleEnter = () => {
    setAnimOut(true)
    setTimeout(() => {
      setVisible(false)
      onEnter()
    }, 700)
  }

  if (!visible) return null

  const col = planet.color
  const glow = planet.glowColor || col

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 40%, rgba(10,8,25,0.98) 0%, #020408 100%)'
          : 'radial-gradient(ellipse at 50% 40%, rgba(240,245,255,0.98) 0%, #f0f4ff 100%)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        opacity: animOut ? 0 : 1,
        transform: animOut ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: animOut ? 'none' : 'all',
      }}
    >
      {/* Ambient glow behind planet orb */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
        opacity: 0.18,
        pointerEvents: 'none',
      }} />

      {/* Scanning lines overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${isDark ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.012)'} 4px)`,
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 680, padding: '0 24px' }}>

        {/* Chapter badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 16px',
          borderRadius: 4,
          border: `1px solid ${col}44`,
          background: `${col}14`,
          marginBottom: 32,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          letterSpacing: '0.2em',
          color: col,
        }}>
          <BookOpen size={12} />
          CHAPTER {String(planet.chapter || '').padStart(2, '0')} · S.O.L.A.R. ARCHIVE
        </div>

        {/* Planet orb */}
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${col}dd, ${col}55)`,
          boxShadow: `0 0 40px ${glow}, 0 0 80px ${glow}55, inset 0 0 24px rgba(0,0,0,0.4)`,
          margin: '0 auto 28px',
          position: 'relative',
          animation: 'planetPulse 3s ease-in-out infinite',
        }}>
          {/* Ring for Saturn-like visual */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) rotateX(70deg)',
            width: 140, height: 140,
            borderRadius: '50%',
            border: `2px solid ${col}33`,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Planet name */}
        <h1 style={{
          fontFamily: '"Outfit", "Space Grotesk", sans-serif',
          fontSize: 'clamp(42px, 8vw, 72px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          background: `linear-gradient(135deg, ${col}, ${isDark ? '#ffffff' : '#0f172a'})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 8px',
          lineHeight: 1,
        }}>
          {planet.planet}
        </h1>

        {/* Domain */}
        <div style={{
          fontSize: 13,
          letterSpacing: '0.25em',
          color: isDark ? '#64748b' : '#94a3b8',
          fontFamily: '"JetBrains Mono", monospace',
          marginBottom: 32,
          textTransform: 'uppercase',
        }}>
          {planet.domain}
        </div>

        {/* Divider */}
        <div style={{
          width: 64, height: 1,
          background: `linear-gradient(90deg, transparent, ${col}, transparent)`,
          margin: '0 auto 32px',
        }} />

        {/* Intro text */}
        <p style={{
          fontSize: 15,
          lineHeight: 1.75,
          color: isDark ? '#94a3b8' : '#475569',
          maxWidth: 540,
          margin: '0 auto 40px',
          fontFamily: '"Inter", sans-serif',
        }}>
          {planet.intro}
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 48,
        }}>
          {[
            { label: 'Sections', value: planet.sections?.length || '—' },
            { label: 'Domain', value: planet.shortDomain },
            { label: 'Resolution', value: '16K' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 22,
                fontWeight: 700,
                color: col,
              }}>{value}</span>
              <span style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                color: isDark ? '#475569' : '#94a3b8',
                textTransform: 'uppercase',
              }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 40px',
            borderRadius: 6,
            border: `1px solid ${col}66`,
            background: `linear-gradient(135deg, ${col}22, ${col}10)`,
            color: col,
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: `0 0 24px ${glow}33`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${col}33`
            e.currentTarget.style.boxShadow = `0 0 40px ${glow}66`
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${col}22, ${col}10)`
            e.currentTarget.style.boxShadow = `0 0 24px ${glow}33`
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <Globe size={16} />
          ENTER ARCHIVE
        </button>

        {/* Keyboard hint */}
        <div style={{
          marginTop: 16,
          fontSize: 11,
          color: isDark ? '#334155' : '#cbd5e1',
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: '0.1em',
        }}>
          scroll to zoom · drag to pan · arrows to navigate
        </div>
      </div>

      {/* Corner decorations */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const [v, h] = pos.split('-')
        return (
          <div key={pos} style={{
            position: 'absolute',
            [v]: 20, [h]: 20,
            width: 24, height: 24,
            borderTop: v === 'top' ? `2px solid ${col}44` : 'none',
            borderBottom: v === 'bottom' ? `2px solid ${col}44` : 'none',
            borderLeft: h === 'left' ? `2px solid ${col}44` : 'none',
            borderRight: h === 'right' ? `2px solid ${col}44` : 'none',
          }} />
        )
      })}
    </div>
  )
}

/* ── Layer 1 Cell: Subject + Coords + Difficulty (Top) + Snippet (Bottom) ── */
const L1Cell = memo(function L1Cell({ data, x, y, planetId, planetName, isDark, cellSize }) {
  const isSmall = cellSize < 100

  if (!data) {
    return (
      <Link
        to={`/submit?planet=${encodeURIComponent(planetId)}&coordX=${x}&coordY=${y}`}
        className="l1-cell l1-cell--empty"
        style={{
          background: isDark ? 'rgba(10,5,8,0.4)' : 'rgba(240,244,248,0.4)',
          borderColor: isDark ? 'rgba(79,195,247,0.3)' : 'rgba(15,23,42,0.2)',
          color: isDark ? '#64748b' : '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%', height: '100%',
          textDecoration: 'none',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: isSmall ? 8 : 10,
          gap: 4,
        }}
        onClick={e => e.stopPropagation()}
      >
        <Plus size={isSmall ? 10 : 14} style={{ opacity: 0.6 }} />
        <span style={{ opacity: 0.8, fontSize: isSmall ? 8 : 10 }}>({x},{y})</span>
      </Link>
    )
  }

  return (
    <div className="lx-cell" style={{
      background: isDark ? 'rgba(6,5,15,0.95)' : 'rgba(255,255,255,0.95)',
      borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.12)',
    }}>
      {/* TL Quadrant - Empty for L1 */}
      <div className="lx-cell__nested" style={{ border: 'none', background: 'transparent' }} />

      {/* TR Quadrant: Title + Coords + Difficulty */}
      <div className="lx-cell__summary" style={{ padding: isSmall ? '4px 6px' : '8px 12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: 2
        }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: isSmall ? 7 : 9,
            color: isDark ? '#4fc3f7' : '#0284c7',
          }}>
            {formatCoord(x)}:{formatCoord(y)}
          </span>
          <DifficultyStars level={data.difficulty} size={isSmall ? "xs" : "sm"} />
        </div>
        <h3 className="lx-cell__heading" style={{
          fontSize: isSmall ? 10 : 12,
          color: isDark ? '#e2e8f0' : '#0f172a',
          WebkitLineClamp: isSmall ? 1 : 2
        }}>
          {data.title}
        </h3>
      </div>

      {/* Bottom: Short Snippet */}
      <div className="lx-cell__body" style={{
        padding: isSmall ? '4px 6px' : '8px 12px',
        fontSize: isSmall ? 8 : 10,
        color: isDark ? '#64748b' : '#94a3b8'
      }}>
        <p className="lx-cell__text" style={{ WebkitLineClamp: isSmall ? 2 : 4 }}>
          {data.shortSummary || data.content?.slice(0, 100)}
        </p>
      </div>
    </div>
  )
})

/* ── Layer 2 Cell (1024×1024)
   CSS Grid: [nested L1 | summary] top 50%
             [full-width body text]  bot 50%
── */
const L2Cell = memo(function L2Cell({ data, x, y, planetId, planetName, isDark, cellSize }) {
  return (
    <div className="lx-cell" style={{
      background: isDark ? 'rgba(4,2,10,0.97)' : 'rgba(248,250,252,0.97)',
      borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.12)',
    }}>
      {/* TL 25%×50%: nested L1 */}
      <div className="lx-cell__nested" style={{
        borderColor: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.08)',
      }}>
        <L1Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize * 0.25} />
      </div>

      {/* TR 75%×50%: subject name + short summary */}
      <div className="lx-cell__summary" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
        <div className="lx-cell__layer-tag" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
          {LAYER_LABELS[2]} · {LAYER_NAMES[2]}
        </div>
        <h3 className="lx-cell__heading" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
          {data?.title || `${planetName} — open sector`}
        </h3>
        <p className="lx-cell__text" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          {data?.shortSummary?.slice(0, 220) || data?.content?.slice(0, 160) || 'Short summary displayed here.'}
        </p>
      </div>

      {/* Bottom full-width: extended body */}
      <div className="lx-cell__body" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
        {data?.shortSummary || data?.content?.slice(0, 1400) || 'No narrative yet — submit via the Archive portal.'}
      </div>
    </div>
  )
})

/* ── Layer 3 Cell (4096×4096)
   CSS Grid: [nested L2 | summary] top 50%
             [Technical | Context]   bot 50%
── */
const L3Cell = memo(function L3Cell({ data, x, y, planetId, planetName, isDark, cellSize }) {
  return (
    <div className="lx-cell" style={{
      background: isDark ? 'rgba(3,1,7,0.97)' : 'rgba(248,250,252,0.97)',
      borderColor: isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)',
    }}>
      {/* TL 25%×50%: nested L2 (which itself has L1 in its TL) */}
      <div className="lx-cell__nested" style={{
        borderColor: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.07)',
      }}>
        <L2Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize * 0.25} />
      </div>

      {/* TR 75%×50%: title + brief */}
      <div className="lx-cell__summary" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
        <div className="lx-cell__layer-tag" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
          {LAYER_LABELS[3]} · {LAYER_NAMES[3]}
        </div>
        <h3 className="lx-cell__heading" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
          {data?.title || 'Archive sector'}
        </h3>
        <p className="lx-cell__text" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          {data?.detailedSummary?.slice(0, 200) || data?.shortSummary?.slice(0, 200) || 'Detailed summary loaded at this resolution.'}
        </p>
      </div>

      {/* Bottom split: Technical left | Context right */}
      <div className="lx-cell__body-split">
        <div className="lx-cell__col">
          <div className="lx-cell__col-heading" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>Technical</div>
          <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: 10, lineHeight: 1.65 }}>
            {data?.detailedSummary || data?.shortSummary || data?.content?.slice(0, 3000) || 'No extended technical brief yet.'}
          </p>
        </div>
        <div className="lx-cell__col">
          <div className="lx-cell__col-heading" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>Context &amp; Narrative</div>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, lineHeight: 1.65 }}>
            {data?.content?.slice(0, 5000) || data?.shortSummary || 'Additional context contributed via the archive.'}
          </p>
        </div>
      </div>
    </div>
  )
})

/* ── Layer 4 Cell (16384×16384)
   CSS Grid: [nested L3 | summary] top 50%
             [full depth content]   bot 50%
── */
const L4Cell = memo(function L4Cell({ data, x, y, planetId, planetName, isDark, cellSize }) {
  return (
    <div className="lx-cell" style={{
      background: isDark ? 'rgba(2,1,5,0.98)' : 'rgba(248,250,252,0.98)',
      borderColor: isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.08)',
    }}>
      {/* TL 25%×50%: nested L3 */}
      <div className="lx-cell__nested" style={{
        borderColor: isDark ? 'rgba(79,195,247,0.09)' : 'rgba(15,23,42,0.06)',
      }}>
        <L3Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize * 0.25} />
      </div>

      {/* TR 75%×50%: layer label + integrity badge */}
      <div className="lx-cell__summary" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
        <div className="lx-cell__layer-tag" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
          {LAYER_LABELS[4]} · {LAYER_NAMES[4]}
        </div>
        <h3 className="lx-cell__heading" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
          {data?.title || 'Deep Archive'}
        </h3>
        <p className="lx-cell__text" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          {data?.fullDepth?.slice(0, 220) || data?.content?.slice(0, 220) || 'Full archival depth entry.'}
        </p>
        <div style={{ marginTop: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: isDark ? '#1e3a4a' : '#94a3b8', letterSpacing: '0.12em' }}>
          ◉ DATA INTEGRITY: VERIFIED · {formatCoord(x)}:{formatCoord(y)}
        </div>
      </div>

      {/* Bottom full-width: full depth content */}
      <div className="lx-cell__body" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
        <div className="lx-cell__col-heading" style={{ color: isDark ? '#4fc3f7' : '#0284c7', marginBottom: 10 }}>Full Archival Depth</div>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.75', fontSize: 10, color: isDark ? '#cbd5e1' : '#334155' }}>
          {data?.fullDepth || data?.content || data?.shortSummary || 'Full-depth entry pending contribution.'}
        </p>
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: isDark ? '1px solid rgba(79,195,247,0.08)' : '1px solid rgba(0,0,0,0.08)', fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: isDark ? '#334155' : '#94a3b8' }}>
          [REF-1] {data?.title || planetName} — {LAYER_LABELS[4]} bundle · S.O.L.A.R.<br/>
          [REF-2] Coord {formatCoord(x)}:{formatCoord(y)} · S.O.L.A.R. Archive Network
        </div>
      </div>
    </div>
  )
})

/* ── Cell renderer by layer ── */
const GridCell = memo(function GridCell({ layer, data, x, y, planetId, planetName, isDark, cellSize }) {
  switch (layer) {
    case 1: return <L1Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize} />
    case 2: return <L2Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize} />
    case 3: return <L3Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize} />
    case 4: return <L4Cell data={data} x={x} y={y} planetId={planetId} planetName={planetName} isDark={isDark} cellSize={cellSize} />
    default: return null
  }
})

/* ── Tooltip on cell hover ── */
function CellTooltip({ data, x, y, planet, isDark, visible, position }) {
  if (!visible || !data) return null
  const col = planet.color
  return (
    <div style={{
      position: 'fixed',
      left: position.x + 16,
      top: position.y - 8,
      zIndex: 150,
      background: isDark ? 'rgba(6,5,15,0.96)' : 'rgba(255,255,255,0.96)',
      border: `1px solid ${col}44`,
      borderRadius: 8,
      padding: '10px 14px',
      maxWidth: 260,
      pointerEvents: 'none',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${col}22`,
    }}>
      <div style={{ color: col, fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}>
        [{formatCoord(x)}:{formatCoord(y)}] · {planet.shortDomain}
      </div>
      <div style={{ color: isDark ? '#e2e8f0' : '#0f172a', fontWeight: 700, fontSize: 12, marginBottom: 6, fontFamily: '"Outfit", sans-serif' }}>
        {data.title}
      </div>
      {data.shortSummary && (
        <div style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>
          {data.shortSummary.slice(0, 140)}…
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DifficultyStars level={data.difficulty} size="md" />
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: isDark ? '#334155' : '#94a3b8' }}>
          LAYER {data.sectionIndex !== undefined ? data.sectionIndex + 1 : '—'}
        </span>
      </div>
    </div>
  )
}

/* ── Main ArchiveGrid Component ── */
export default function ArchiveGrid() {
  const { planetId } = useParams()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const viewportRef = useRef(null)

  /* Intro gate */
  const [showGrid, setShowGrid] = useState(false)

  /* State */
  const [viewX, setViewX] = useState(121)
  const [viewY, setViewY] = useState(153)
  const [layer, setLayer] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [tooltip, setTooltip] = useState({ visible: false, data: null, x: 0, y: 0, cx: 0, cy: 0 })

  /* Planet lookup */
  const planet = useMemo(() => {
    if (!planetId) return researchData.planets[0]
    const lowerId = planetId.toLowerCase()
    return researchData.planets.find(p =>
      p.id.toLowerCase() === lowerId || p.planet.toLowerCase() === lowerId
    ) || researchData.planets[0]
  }, [planetId])

  /* Build section entries map */
  const sectionEntries = useMemo(() => {
    const entries = {}
    if (planet.sections) {
      planet.sections.forEach((sec, i) => {
        const baseX = 120 + (i % 3)
        const baseY = 152 + Math.floor(i / 3)
        entries[`${baseX},${baseY}`] = {
          title: sec.title,
          content: sec.content || '',
          shortSummary: sec.shortSummary || sec.content?.slice(0, 300) || '',
          detailedSummary: sec.detailedSummary || '',
          fullDepth: sec.fullDepth || '',
          difficulty: Math.min(5, Math.max(1, (i % 5) + 1)),
          baseX, baseY,
          sectionIndex: i,
        }
      })
    }
    entries['121,153'] = {
      title: `ARCHIVE CORE: ${planet.planet}`,
      content: planet.description,
      shortSummary: planet.intro,
      detailedSummary: planet.description?.split('\n\n')[0] || '',
      fullDepth: planet.description,
      difficulty: 5,
      baseX: 121, baseY: 153,
      sectionIndex: -1,
    }
    return entries
  }, [planet])

  const allEntries = useMemo(() => Object.entries(sectionEntries).map(([key, val]) => ({ key, ...val })), [sectionEntries])

  /* Reset on planet change */
  useEffect(() => {
    setViewX(121); setViewY(153); setLayer(1); setZoom(1); setShowGrid(false)
  }, [planetId])

  /* CSS vars */
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', planet.color)
    document.documentElement.style.setProperty('--color-glow', planet.glowColor || planet.color)
  }, [planet])

  /* Window resize */
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /* Cell size */
  const cellSize = BASE_CELL_SIZE * LAYER_MULTIPLIERS[layer] * zoom

  /* Grid dimensions - ensure cellSize is never too small to cause Infinity */
  const safeCellSize = Math.max(8, cellSize)
  const gridCols = Math.ceil(windowSize.width / safeCellSize) + 2
  const gridRows = Math.ceil(windowSize.height / safeCellSize) + 2

  /* Build visible cells */
  const cells = useMemo(() => {
    const arr = []
    const halfCols = Math.floor(gridCols / 2)
    const halfRows = Math.floor(gridRows / 2)
    for (let r = -halfRows; r <= halfRows; r++) {
      for (let c = -halfCols; c <= halfCols; c++) {
        const cx = viewX + c
        const cy = viewY - r
        const data = sectionEntries[`${cx},${cy}`]
        arr.push({ cx, cy, c, r, data })
      }
    }
    return { 
      items: arr, 
      cols: halfCols * 2 + 1, 
      rows: halfRows * 2 + 1 
    }
  }, [viewX, viewY, gridCols, gridRows, sectionEntries])

  /* Navigation helpers */
  const handlePan = useCallback((dx, dy) => {
    setViewX(v => v + dx)
    setViewY(v => v - dy)
  }, [])

  const resetViewport = useCallback(() => {
    setViewX(121)
    setViewY(153)
    setZoom(1)
    setLayer(1)
  }, [])

  const switchLayer = useCallback((newLayer) => {
    setLayer(newLayer); setZoom(1)
  }, [])

  /* Zoom helpers */
  const zoomIn = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP)), [])
  const handleZoomStep = useCallback((delta) => {
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)))
  }, [])

  /* Smooth mouse-wheel zoom toward cursor */
  useEffect(() => {
    if (!showGrid) return
    const el = viewportRef.current
    if (!el) return
    const handleWheel = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [showGrid])

  /* Touch pinch zoom */
  useEffect(() => {
    if (!showGrid) return
    const el = viewportRef.current
    if (!el) return
    let lastDist = null
    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    const handleTouchMove = (e) => {
      if (e.touches.length !== 2) { lastDist = null; return }
      e.preventDefault()
      const dist = getDistance(e.touches)
      if (lastDist !== null) {
        const delta = dist - lastDist
        if (delta > 5) zoomIn()
        else if (delta < -5) zoomOut()
      }
      lastDist = dist
    }
    const handleTouchEnd = () => { lastDist = null }
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [showGrid, zoomIn, zoomOut])

  /* Keyboard controls */
  useEffect(() => {
    const handleKd = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      switch (e.key) {
        case 'ArrowUp': handlePan(0, -1); break
        case 'ArrowDown': handlePan(0, 1); break
        case 'ArrowLeft': handlePan(-1, 0); break
        case 'ArrowRight': handlePan(1, 0); break
        case '+': case '=': zoomIn(); break
        case '-': case '_': zoomOut(); break
        case '1': switchLayer(1); break
        case '2': switchLayer(2); break
        case '3': switchLayer(3); break
        case '4': switchLayer(4); break
        default: break
      }
    }
    window.addEventListener('keydown', handleKd)
    return () => window.removeEventListener('keydown', handleKd)
  }, [handlePan, zoomIn, zoomOut, switchLayer])

  /* Search */
  const handleSearchInput = useCallback((value) => {
    setSearchInput(value)
    if (value.trim().length < 2) { setSearchResults([]); setShowSearchDropdown(false); return }
    const lowerQ = value.toLowerCase()
    const results = allEntries.filter(e =>
      e.title.toLowerCase().includes(lowerQ) ||
      (e.content && e.content.toLowerCase().includes(lowerQ)) ||
      (e.shortSummary && e.shortSummary.toLowerCase().includes(lowerQ))
    ).slice(0, 8)
    setSearchResults(results)
    setShowSearchDropdown(results.length > 0)
  }, [allEntries])

  const navigateToEntry = useCallback((entry) => {
    setViewX(entry.baseX); setViewY(entry.baseY)
    setLayer(1); setZoom(1)
    setSearchInput(''); setShowSearchDropdown(false)
  }, [])

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault()
    if (searchResults.length > 0) navigateToEntry(searchResults[0])
  }, [searchResults, navigateToEntry])

  /* ─── Render ─── */
  return (
    <div
      className="archive-root"
      style={{ background: isDark ? '#06050F' : '#f8fafc', color: isDark ? '#e2e8f0' : '#0f172a' }}
    >
      {/* Planet intro overlay */}
      <PlanetIntro planet={planet} isDark={isDark} onEnter={() => setShowGrid(true)} />

      {/* Grid UI (hidden until intro dismissed) */}
      <div style={{
        opacity: showGrid ? 1 : 0,
        transition: 'opacity 0.6s ease 0.2s',
        pointerEvents: showGrid ? 'all' : 'none',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>

        {/* ── Top HUD ── */}
        <div className="archive-hud-top" style={{
          background: isDark ? 'rgba(6,5,15,0.92)' : 'rgba(248,250,252,0.92)',
          borderBottom: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'}`,
        }}>
          {/* Left */}
          <div className="archive-hud-left">
            <button
              className="archive-btn archive-btn--back"
              onClick={() => navigate('/map')}
              style={{
                background: isDark ? 'rgba(26,24,48,0.8)' : 'rgba(226,232,240,0.8)',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)',
                color: isDark ? '#e2e8f0' : '#0f172a',
              }}
            >
              <ArrowLeft size={14} /> Exit
            </button>
            <div className="archive-planet-badge" style={{
              background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(240,244,248,0.8)',
              borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)',
            }}>
              <div className="archive-planet-dot" style={{ background: planet.color, boxShadow: `0 0 8px ${planet.color}` }} />
              <span style={{ color: isDark ? '#e2e8f0' : '#0f172a', fontWeight: 700, fontSize: 13 }}>{planet.planet}</span>
              <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>{planet.shortDomain}</span>
            </div>
          </div>

          {/* Center: Search */}
          <form className="archive-search-form" onSubmit={handleSearchSubmit}>
            <div className="archive-search-wrap" style={{
              background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
              borderColor: isDark ? 'rgba(79,195,247,0.3)' : 'rgba(15,23,42,0.2)',
            }}>
              <Search size={16} style={{ color: isDark ? '#4fc3f7' : '#0284c7', flexShrink: 0 }} />
              <input
                className="archive-search-input"
                value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                placeholder="Search subjects..."
                style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
              />
            </div>
            {showSearchDropdown && (
              <div className="archive-search-dropdown" style={{
                background: isDark ? 'rgba(10,8,20,0.98)' : 'rgba(255,255,255,0.98)',
                borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)',
              }}>
                {searchResults.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    className="archive-search-result"
                    onMouseDown={() => navigateToEntry(entry)}
                    style={{ color: isDark ? '#e2e8f0' : '#0f172a', background: 'transparent' }}
                  >
                    <span className="archive-search-result__title">{entry.title}</span>
                    <span className="archive-search-result__coord" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                      ({entry.baseX},{entry.baseY})
                    </span>
                    <DifficultyStars level={entry.difficulty} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Right: Coords */}
          <div className="archive-hud-right">
            <div className="archive-coord-display" style={{
              background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(240,244,248,0.8)',
              borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)',
            }}>
              <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 9, letterSpacing: '0.15em' }}>X</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: 13, color: isDark ? '#e2e8f0' : '#0f172a' }}>{formatCoord(viewX)}</span>
            </div>
            <div className="archive-coord-display" style={{
              background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(240,244,248,0.8)',
              borderColor: isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)',
            }}>
              <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 9, letterSpacing: '0.15em' }}>Y</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: 13, color: isDark ? '#e2e8f0' : '#0f172a' }}>{formatCoord(viewY)}</span>
            </div>
          </div>
        </div>

        {/* ── Layer Tabs ── */}
        <div className="archive-layer-tabs" style={{
          background: isDark ? 'rgba(6,5,15,0.88)' : 'rgba(248,250,252,0.88)',
          borderBottom: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.08)'}`,
        }}>
          {[1, 2, 3, 4].map(l => (
            <button
              key={l}
              className={`archive-layer-tab ${layer === l ? 'archive-layer-tab--active' : ''}`}
              onClick={() => switchLayer(l)}
              style={{
                background: layer === l
                  ? (isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.12)')
                  : 'transparent',
                color: layer === l
                  ? (isDark ? '#4fc3f7' : '#0284c7')
                  : (isDark ? '#64748b' : '#94a3b8'),
                borderColor: layer === l
                  ? (isDark ? 'rgba(79,195,247,0.4)' : 'rgba(2,132,199,0.35)')
                  : 'transparent',
              }}
            >
              <Layers size={12} />
              <span>L{l}</span>
              <span className="archive-layer-tab__label">{LAYER_LABELS[l]}</span>
            </button>
          ))}
          <div className="archive-zoom-display" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
            {Math.round(zoom * 100)}% · {LAYER_NAMES[layer]}
          </div>
        </div>

        {/* ── Grid Viewport ── */}
        <div className="archive-viewport" ref={viewportRef}>
          {/* Background grid pattern */}
          <motion.div 
            className="archive-bg-grid" 
            animate={{ 
              backgroundSize: `${cellSize}px ${cellSize}px`,
              backgroundPosition: `calc(50% - ${cellSize / 2}px) calc(50% - ${cellSize / 2}px)`
            }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            style={{
              backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          }} />

          {/* Grid cells */}
          <div
            className="archive-grid"
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 0, height: 0,
            }}
          >
            {cells.items.map(({ cx, cy, c, r, data }) => (
              <motion.div
                key={`${cx},${cy}`}
                className={`archive-grid-cell ${data ? 'archive-grid-cell--has-data' : ''}`}
                animate={{
                  width: cellSize, height: cellSize,
                  x: c * cellSize - cellSize / 2,
                  y: r * cellSize - cellSize / 2,
                }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                style={{
                  position: 'absolute',
                  overflow: 'hidden',
                  border: `1px solid ${isDark
                    ? (data ? `${planet.color}44` : 'rgba(79,195,247,0.18)')
                    : (data ? `${planet.color}55` : 'rgba(15,23,42,0.12)')}`,
                  cursor: 'pointer',
                  willChange: 'transform, width, height',
                }}
                onClick={() => {
                  if (!data) {
                    navigate(`/submit?planet=${planet.id}&coordX=${cx}&coordY=${cy}`)
                  }
                }}
                onMouseEnter={data ? (e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltip({ visible: true, data, cx, cy, x: rect.right, y: rect.top })
                } : undefined}
                onMouseLeave={data ? () => setTooltip(t => ({ ...t, visible: false })) : undefined}
              >
                <GridCell
                  layer={layer}
                  data={data}
                  x={cx} y={cy}
                  planetId={planet.id}
                  planetName={planet.planet}
                  isDark={isDark}
                  cellSize={cellSize}
                />
              </motion.div>
            ))}
          </div>

          {/* Center crosshair */}
          <div className="archive-crosshair" style={{
            borderColor: isDark ? `${planet.color}55` : `${planet.color}55`,
          }}>
            <Crosshair size={20} style={{ color: isDark ? `${planet.color}99` : `${planet.color}99` }} />
          </div>
        </div>

        {/* Floating Controls - Pinned to bottom via absolute positioning */}
        <div className="archive-controls">
          {/* Pan Group */}
          <div className="archive-pan-group">
            <div className="archive-pan-row">
              <button className="archive-pan-btn" onClick={() => handlePan(0, -1)} title="Pan Up"><ChevronUp size={16} /></button>
            </div>
            <div className="archive-pan-row">
              <button className="archive-pan-btn" onClick={() => handlePan(-1, 0)} title="Pan Left"><ChevronLeft size={16} /></button>
              <button className="archive-pan-btn" onClick={() => handlePan(1, 0)} title="Pan Right"><ChevronRight size={16} /></button>
            </div>
            <div className="archive-pan-row">
              <button className="archive-pan-btn" onClick={() => handlePan(0, 1)} title="Pan Down"><ChevronDown size={16} /></button>
            </div>
          </div>

          {/* Zoom Group */}
          <div className="archive-zoom-group">
            <button className="archive-zoom-btn" onClick={() => handleZoomStep(-0.2)} title="Zoom Out">
              <Minus size={16} />
            </button>
            <div className="archive-zoom-bar">
              <div 
                className="archive-zoom-fill" 
                style={{ 
                  width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`,
                  background: planet.color 
                }} 
              />
            </div>
            <button className="archive-zoom-btn" onClick={() => handleZoomStep(0.2)} title="Zoom In">
              <Plus size={16} />
            </button>
          </div>

          {/* Recenter Button */}
          <button className="archive-recenter-btn" onClick={resetViewport}>
            <Target size={18} />
            <span>Re-center</span>
          </button>
        </div>

        {/* Hover tooltip */}
        <CellTooltip
          data={tooltip.data}
          x={tooltip.cx} y={tooltip.cy}
          planet={planet}
          isDark={isDark}
          visible={tooltip.visible}
          position={{ x: tooltip.x, y: tooltip.y }}
        />
      </div>

      {/* CSS for planet pulse animation */}
      <style>{`
        @keyframes planetPulse {
          0%, 100% { box-shadow: 0 0 40px ${planet.glowColor || planet.color}, 0 0 80px ${planet.glowColor || planet.color}55, inset 0 0 24px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 60px ${planet.glowColor || planet.color}, 0 0 120px ${planet.glowColor || planet.color}44, inset 0 0 24px rgba(0,0,0,0.4); }
        }
      `}</style>
    </div>
  )
}

function ctrlBtnStyle(isDark) {
  return {
    background: isDark ? 'rgba(26,24,48,0.8)' : 'rgba(226,232,240,0.8)',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)',
    color: isDark ? '#e2e8f0' : '#0f172a',
  }
}
