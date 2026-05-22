import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { useTheme } from '../App.jsx'

const PLANETS = [
  { id: 'sun',     label: 'Sun',     domain: 'Energy Research',         color: '#ff6b35', glow: 'rgba(255,107,53,0.7)',   size: 72, orbitR: 0,   baseAngle: 0,   period: 0,     desc: 'Solar, wind, fusion, hydrogen, batteries' },
  { id: 'mercury', label: 'Mercury', domain: 'Industrial Production',   color: '#9ca3af', glow: 'rgba(156,163,175,0.5)', size: 14, orbitR: 95,  baseAngle: 200, period: 88,    desc: 'Metals, ceramics, 3D printing, composites' },
  { id: 'venus',   label: 'Venus',   domain: 'Agriculture & Food',      color: '#fbbf24', glow: 'rgba(251,191,36,0.5)',  size: 22, orbitR: 140, baseAngle: 340, period: 225,   desc: 'Greenhouses, vertical farms, aquaponics' },
  { id: 'earth',   label: 'Earth',   domain: 'Biology & Medicine',      color: '#34d399', glow: 'rgba(52,211,153,0.5)',  size: 24, orbitR: 190, baseAngle: 60,  period: 365,   desc: 'Genomics, medicine, ecology, biotech' },
  { id: 'mars',    label: 'Mars',    domain: 'Engineering',             color: '#f87171', glow: 'rgba(248,113,113,0.5)',size: 18, orbitR: 245, baseAngle: 150, period: 687,   desc: 'Resilience, harsh environments, robotics' },
  { id: 'jupiter', label: 'Jupiter', domain: 'AI & Computing',          color: '#fb923c', glow: 'rgba(251,146,60,0.5)', size: 50, orbitR: 310, baseAngle: 270, period: 4333,  desc: 'Neural networks, sensor nets, digital twins' },
  { id: 'saturn',  label: 'Saturn',  domain: 'Ecology & Waste',         color: '#fde68a', glow: 'rgba(253,230,138,0.5)',size: 42, orbitR: 380, baseAngle: 30,  period: 10759, desc: 'Vertical farms, composting, biochar' },
  { id: 'uranus',  label: 'Uranus',  domain: 'Society & Ethics',        color: '#67e8f9', glow: 'rgba(103,232,249,0.5)',size: 30, orbitR: 445, baseAngle: 100, period: 30687, desc: 'Governance, education, arts, ethics' },
  { id: 'neptune', label: 'Neptune', domain: 'Oceans & Water',          color: '#818cf8', glow: 'rgba(129,140,248,0.5)',size: 28, orbitR: 505, baseAngle: 220, period: 60190, desc: 'Desalination, aquaculture, tidal energy' },
]

const FOUNDATION_ARCHIVE = {
  id: 'star', label: 'North Star',
  domain: 'North Star archive - memoranda, canon, and stewardship',
  color: '#f5a623', glow: 'rgba(245,166,35,0.55)',
  desc: 'Institutional memoranda, canon, and long-term stewardship.',
}

const CX = 500, CY = 400
const NORTH_STAR = { x: CX, y: 58 }

export default function MapView() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [hoveredPlanet, setHoveredPlanet] = useState(null)
  const [searchVal, setSearchVal] = useState('')
  const animRef         = useRef(null)
  const svgRef          = useRef(null)
  const startTimeRef    = useRef(Date.now())
  const planetGroupsRef = useRef({})

  const animate = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    PLANETS.forEach(p => {
      if (p.orbitR === 0) return
      const degreesPerSecond = (360 / p.period) * 8
      const angle = ((p.baseAngle + elapsed * degreesPerSecond) % 360) * (Math.PI / 180)
      const x = CX + p.orbitR * Math.cos(angle)
      const y = CY + (p.orbitR * Math.sin(angle)) * 0.38
      const group = planetGroupsRef.current[p.id]
      if (group) group.setAttribute('transform', `translate(${x}, ${y})`)
    })
    animRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchVal.trim().toLowerCase()
    if (!q) return
    const foundationTerms = ['star','beacon','foundation','north star','northstar','polaris','memoranda','canon']
    if (foundationTerms.some(t => q === t || q.includes(t))) {
      navigate(`/archive/${FOUNDATION_ARCHIVE.id}`)
      return
    }
    const planet = PLANETS.find(p => p.id === q || p.label.toLowerCase() === q || p.domain.toLowerCase().includes(q))
    if (planet) navigate(`/archive/${planet.id}`)
  }

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-start pt-16 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="text-center mt-6 mb-2 px-4 z-10 relative"
      >
        <h1
          className="text-2xl md:text-4xl font-black tracking-tight mb-2"
          style={{
            color: isDark ? 'transparent' : '#1e293b',
            background: isDark ? 'linear-gradient(135deg, #4fc3f7, #f5a623)' : 'none',
            WebkitBackgroundClip: isDark ? 'text' : 'initial',
            WebkitTextFillColor: isDark ? 'transparent' : 'initial',
          }}
        >
          Solar System Map
        </h1>
        <p className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          Click the North Star or a planet to open an archive
        </p>
      </motion.div>

      {/* Search */}
      <motion.form
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        onSubmit={handleSearch}
        className="z-10 relative flex gap-2 mb-1"
        style={{ width: 'min(340px, 90vw)' }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            className="search-oval pl-8 w-full text-sm"
            placeholder="Search planet or domain..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }} type="submit"
          className="px-4 py-2 rounded-full text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
        >
          Go
        </motion.button>
      </motion.form>

      {/* Tooltip */}
      <div className="h-11 z-10 relative flex items-center justify-center">
        <AnimatePresence>
          {hoveredPlanet && (
            <motion.div
              key={hoveredPlanet.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="mx-2 max-w-[min(90vw,14rem)] px-2 py-1 rounded-lg text-center"
              style={{
                background: isDark ? 'rgba(4,12,24,0.93)' : 'rgba(255,255,255,0.95)',
                border: `1px solid ${hoveredPlanet.glow}`,
                boxShadow: `0 0 10px ${hoveredPlanet.glow}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <p className="font-bold text-[10px] leading-tight break-words" style={{ color: hoveredPlanet.color }}>
                {hoveredPlanet.label} &mdash; {hoveredPlanet.domain}
              </p>
              <p className="text-[9px] leading-snug mt-0.5 break-words" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                {hoveredPlanet.desc}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SVG Solar System */}
      <div
        className="relative z-10 w-full max-w-[min(1000px,100%)] shrink-0 px-2 sm:px-4"
        style={{ height: 'min(62vh, 620px)', minHeight: 'min(42vh, 360px)' }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 800"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="mapNsCorona" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#fff9f0" stopOpacity="0.5" />
              <stop offset="35%"  stopColor="#ffd88a" stopOpacity="0.18" />
              <stop offset="70%"  stopColor="#f5a623" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#c77800" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mapNsDisk" cx="35%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="18%"  stopColor="#fffbf0" />
              <stop offset="45%"  stopColor="#ffd54f" />
              <stop offset="78%"  stopColor="#e8940a" />
              <stop offset="100%" stopColor="#a65f00" />
            </radialGradient>
            <linearGradient id="mapNsSpikeV" gradientUnits="userSpaceOnUse" x1="0" y1="-52" x2="0" y2="52">
              <stop offset="0"   stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.2" stopColor="#fffef8" stopOpacity="0.28" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.58" />
              <stop offset="0.8" stopColor="#fffef8" stopOpacity="0.28" />
              <stop offset="1"   stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mapNsSpikeH" gradientUnits="userSpaceOnUse" x1="-52" y1="0" x2="52" y2="0">
              <stop offset="0"   stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.2" stopColor="#fffef8" stopOpacity="0.28" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.58" />
              <stop offset="0.8" stopColor="#fffef8" stopOpacity="0.28" />
              <stop offset="1"   stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* North Star */}
          <g
            transform={`translate(${NORTH_STAR.x}, ${NORTH_STAR.y})`}
            onClick={() => navigate(`/archive/${FOUNDATION_ARCHIVE.id}`)}
            onMouseEnter={() => setHoveredPlanet({ ...FOUNDATION_ARCHIVE })}
            onMouseLeave={() => setHoveredPlanet(null)}
            style={{ cursor: 'pointer' }}
          >
            <motion.circle r={46} fill="url(#mapNsCorona)"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <g opacity={0.92}>
              <rect x={-0.8} y={-50} width={1.6} height={100} fill="url(#mapNsSpikeV)" />
              <rect x={-50} y={-0.8} width={100} height={1.6} fill="url(#mapNsSpikeH)" />
              <g transform="rotate(45)">
                <rect x={-0.65} y={-44} width={1.3} height={88} fill="url(#mapNsSpikeV)" />
                <rect x={-44} y={-0.65} width={88} height={1.3} fill="url(#mapNsSpikeH)" />
              </g>
            </g>
            <motion.g
              animate={{
                filter: [
                  'drop-shadow(0 0 1px rgba(255,255,255,0.95)) drop-shadow(0 0 6px rgba(255,214,120,0.75))',
                  'drop-shadow(0 0 3px rgba(255,255,255,1)) drop-shadow(0 0 14px rgba(255,200,80,0.9))',
                  'drop-shadow(0 0 1px rgba(255,255,255,0.95)) drop-shadow(0 0 6px rgba(255,214,120,0.75))',
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <circle r={8.5} fill="url(#mapNsDisk)" />
              <circle r={2.4} fill="#ffffff" opacity={0.98} />
            </motion.g>
            <text y={54} textAnchor="middle" fontSize="12" fontWeight="700"
              fill={isDark ? '#e2e8f0' : '#1e293b'} fontFamily="Inter, sans-serif">
              {FOUNDATION_ARCHIVE.label}
            </text>
          </g>

          {/* Orbital rings */}
          {PLANETS.filter(p => p.orbitR > 0).map(p => (
            <ellipse key={`orbit-${p.id}`} cx={CX} cy={CY} rx={p.orbitR} ry={p.orbitR * 0.38}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}
              strokeWidth="1"
            />
          ))}

          {/* Sun (static centre) */}
          <g
            transform={`translate(${CX}, ${CY})`}
            onClick={() => navigate('/archive/sun')}
            onMouseEnter={() => setHoveredPlanet(PLANETS[0])}
            onMouseLeave={() => setHoveredPlanet(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle r={54} fill="rgba(255,107,53,0.2)" />
            <circle r={36} fill="#ff6b35" />
            <circle r={18} fill="rgba(255,255,255,0.2)" style={{ transform: 'translate(-8px,-8px)' }} />
            <text y={48} textAnchor="middle" fontSize="13" fontWeight="700"
              fill={isDark ? '#e2e8f0' : '#1e293b'} fontFamily="Inter, sans-serif">Sun</text>
          </g>

          {/* Orbiting planets */}
          {PLANETS.filter(p => p.orbitR > 0).map(planet => {
            const r = planet.size / 2
            const isHub = !!planet.isHub
            const hex = isHub ? Array.from({ length: 6 }, (_, k) => {
              const a = (Math.PI / 3) * k - Math.PI / 6
              return `${r * Math.cos(a)},${r * Math.sin(a)}`
            }).join(' ') : null

            return (
              <g
                key={planet.id}
                ref={el => { if (el) planetGroupsRef.current[planet.id] = el }}
                transform={`translate(${CX + planet.orbitR}, ${CY})`}
                onClick={() => navigate(`/archive/${planet.id}`)}
                onMouseEnter={() => setHoveredPlanet(planet)}
                onMouseLeave={() => setHoveredPlanet(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* glow halo */}
                <circle r={planet.size * 1.5} fill={planet.glow}
                  opacity={hoveredPlanet?.id === planet.id ? 0.5 : 0.2} />

                {/* Saturn ring */}
                {planet.id === 'saturn' && (
                  <ellipse
                    rx={planet.size * 1.4} ry={planet.size * 0.3}
                    fill="none" stroke={planet.color} strokeWidth="3.5" opacity="0.65"
                  />
                )}

                {isHub ? (
                  <>
                    <polygon points={hex} fill={planet.color} opacity="0.92" />
                    <polygon points={hex} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  </>
                ) : (
                  <>
                    <circle r={r} fill={planet.color} />
                    <circle r={r * 0.5} fill="rgba(255,255,255,0.18)"
                      cx={-r * 0.24} cy={-r * 0.24} />
                  </>
                )}

                <text y={r + 12} textAnchor="middle" fontSize="11" fontWeight="600"
                  fill={isDark ? '#e2e8f0' : '#1e293b'} fontFamily="Inter, sans-serif">
                  {planet.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
