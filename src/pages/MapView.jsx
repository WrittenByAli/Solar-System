import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Orbit, Search } from 'lucide-react'
import { useTheme } from '../App.jsx'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import researchData from '../data/researchData.json'
import { getGridDimensions, getHub } from '../utils/hubRegistry.js'
import { getHubDisciplineCopy } from '../constants/hubDisciplineCopy.js'
import { getHubResearchSections, getHubTaxonomy } from '../utils/hubTaxonomyRegistry.js'
import '../styles/solar-map.css'

const LIGHT_PALETTE = {
  sun: { color: '#c2410c', glow: 'rgba(194, 65, 12, 0.44)' },
  mercury: { color: '#4b5563', glow: 'rgba(75, 85, 99, 0.42)' },
  venus: { color: '#b45309', glow: 'rgba(180, 83, 9, 0.4)' },
  earth: { color: '#047857', glow: 'rgba(4, 120, 87, 0.4)' },
  mars: { color: '#b91c1c', glow: 'rgba(185, 28, 28, 0.4)' },
  jupiter: { color: '#c2410c', glow: 'rgba(194, 65, 12, 0.38)' },
  saturn: { color: '#a16207', glow: 'rgba(161, 98, 7, 0.38)' },
  uranus: { color: '#0e7490', glow: 'rgba(14, 116, 144, 0.4)' },
  neptune: { color: '#4338ca', glow: 'rgba(67, 56, 202, 0.4)' },
  star: { color: '#b45309', glow: 'rgba(180, 83, 9, 0.42)' },
}

function displayColors(hub, isDark) {
  if (isDark) return { color: hub.color, glow: hub.glow }
  return LIGHT_PALETTE[hub.id] || { color: hub.color, glow: hub.glow }
}

const PLANETS = [
  {
    id: 'sun', label: 'Sun', subject: 'Physics', domain: 'Physics',
    color: '#ff6b35', glow: 'rgba(255,107,53,0.7)', size: 72, orbitR: 0, baseAngle: 0, period: 0,
    desc: 'The Sun hub is the Physics archive — mechanics, thermodynamics, electromagnetism, quantum physics, relativity, and particle research.',
    topics: ["Newton's Laws", 'Thermodynamics', 'Electromagnetism', 'Quantum mechanics', 'Relativity'],
  },
  {
    id: 'mercury', label: 'Mercury', subject: 'Mathematics', domain: 'Mathematics',
    color: '#9ca3af', glow: 'rgba(156,163,175,0.5)', size: 14, orbitR: 95, baseAngle: 200, period: 88,
    desc: 'Mercury hub archives Mathematics — algebra, geometry, analysis, statistics, and applied mathematical methods.',
    topics: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Number theory'],
  },
  {
    id: 'venus', label: 'Venus', subject: 'Psychology & Neuroscience', domain: 'Psychology & Neuroscience',
    color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', size: 22, orbitR: 140, baseAngle: 340, period: 225,
    desc: 'Venus hub covers Psychology & Neuroscience — cognition, behavior, neural systems, and mind–brain research.',
    topics: ['Cognition', 'Neuroscience', 'Behavior', 'Development', 'Clinical psychology'],
  },
  {
    id: 'earth', label: 'Earth', subject: 'Earth & Environmental Science', domain: 'Earth & Environmental Science',
    color: '#34d399', glow: 'rgba(52,211,153,0.5)', size: 24, orbitR: 190, baseAngle: 60, period: 365,
    desc: 'Earth hub documents Earth & Environmental Science — geology, climate, ecosystems, and planetary systems.',
    topics: ['Geology', 'Climate', 'Ecology', 'Oceanography', 'Environmental systems'],
  },
  {
    id: 'mars', label: 'Mars', subject: 'Applied Technology', domain: 'Applied Technology',
    color: '#f87171', glow: 'rgba(248,113,113,0.5)', size: 18, orbitR: 245, baseAngle: 150, period: 687,
    desc: 'Mars hub focuses on Applied Technology — engineering, robotics, materials, and systems for real-world deployment.',
    topics: ['Engineering systems', 'Robotics', 'Materials', 'Infrastructure', 'Extreme environments'],
  },
  {
    id: 'jupiter', label: 'Jupiter', subject: 'Social Science', domain: 'Social Science',
    color: '#fb923c', glow: 'rgba(251,146,60,0.5)', size: 50, orbitR: 310, baseAngle: 270, period: 4333,
    desc: 'Jupiter hub archives Social Science — economics, sociology, political science, and collective decision-making.',
    topics: ['Economics', 'Sociology', 'Political science', 'Anthropology', 'Public policy'],
  },
  {
    id: 'saturn', label: 'Saturn', subject: 'Astronomy & Cosmology', domain: 'Astronomy & Cosmology',
    color: '#fde68a', glow: 'rgba(253,230,138,0.5)', size: 42, orbitR: 380, baseAngle: 30, period: 10759,
    desc: 'Saturn hub maps Astronomy & Cosmology — stars, galaxies, observational methods, and deep-space research.',
    topics: ['Stellar astronomy', 'Galaxies', 'Cosmology', 'Planetary science', 'Observational methods'],
  },
  {
    id: 'uranus', label: 'Uranus', subject: 'Chemistry', domain: 'Chemistry',
    color: '#67e8f9', glow: 'rgba(103,232,249,0.5)', size: 30, orbitR: 445, baseAngle: 100, period: 30687,
    desc: 'Uranus hub holds Chemistry — molecular structure, reactions, biochemistry, and materials at the atomic level.',
    topics: ['Organic chemistry', 'Inorganic chemistry', 'Biochemistry', 'Physical chemistry', 'Materials'],
  },
  {
    id: 'neptune', label: 'Neptune', subject: 'Biology', domain: 'Biology',
    color: '#818cf8', glow: 'rgba(129,140,248,0.5)', size: 28, orbitR: 505, baseAngle: 220, period: 60190,
    desc: 'Neptune hub covers Biology — cells, genetics, evolution, ecology, and organismal life systems.',
    topics: ['Cell biology', 'Genetics', 'Evolution', 'Ecology', 'Physiology'],
  },
]

const FOUNDATION_ARCHIVE = {
  id: 'star',
  label: 'North Star',
  subject: 'Foundation & Stewardship',
  domain: 'Foundation memoranda & stewardship',
  color: '#f5a623',
  glow: 'rgba(245,166,35,0.55)',
  desc: 'The North Star archive holds institutional memoranda, canon, and long-term stewardship documents for the Solar Foundation.',
  topics: ['Memoranda', 'Institutional canon', 'Stewardship policy', 'Governance records', 'Long-horizon planning'],
}

const CX = 500
const CY = 400
const NORTH_STAR = { x: CX, y: 58 }

const HUBS = [FOUNDATION_ARCHIVE, ...PLANETS]

function orbitSpeedRad(planet) {
  const degreesPerSecond = 1.55 + (365 / planet.period) * 2.1
  return degreesPerSecond * (Math.PI / 180)
}

function positionFromAngle(planet, angleRad) {
  if (!planet?.orbitR) return { x: CX, y: CY }
  return {
    x: CX + planet.orbitR * Math.cos(angleRad),
    y: CY + planet.orbitR * Math.sin(angleRad) * 0.38,
  }
}

function initialAngleRad(planet) {
  return planet.baseAngle * (Math.PI / 180)
}

function enrichHub(hub) {
  const id = hub.id.toLowerCase()
  const dataHub = researchData.planets.find((p) => p.id?.toLowerCase() === id || p.planet?.toLowerCase() === id)
  const taxonomy = getHubTaxonomy(id)
  const copy = getHubDisciplineCopy(id)
  const sections = getHubResearchSections(id)
  const hubRecord = getHub(id)
  const dims = getGridDimensions(id)
  const sectionCount = sections?.length || dataHub?.sections?.length || 0
  const discipline = taxonomy?.discipline || hubRecord?.description || dataHub?.domain || hub.domain

  return {
    ...hub,
    subject: discipline,
    domain: discipline,
    desc: copy?.intro || dataHub?.intro || dataHub?.description?.split('\n')[0] || dataHub?.summary || hub.desc,
    topics: sections?.slice(0, 5).map((s) => s.title).filter(Boolean) || hub.topics,
    sectionCount,
    gridLabel: `${dims.gridW} × ${dims.gridH}`,
  }
}

export default function MapView() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
  const [hoveredPlanet, setHoveredPlanet] = useState(null)
  const [selectedHubId, setSelectedHubId] = useState('star')
  const [searchVal, setSearchVal] = useState('')
  const [sceneReveal, setSceneReveal] = useState(0)
  const animRef = useRef(null)
  const planetGroupsRef = useRef({})
  const planetSpinRefs = useRef({})
  const ringSpinRefs = useRef({})
  const orbitAnglesRef = useRef({})
  const spinAnglesRef = useRef({})
  const lastFrameRef = useRef(performance.now())
  const [hubsTick, setHubsTick] = useState(0)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const bump = () => setHubsTick((t) => t + 1)
    window.addEventListener('solar-hubs-updated', bump)
    return () => window.removeEventListener('solar-hubs-updated', bump)
  }, [])

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 900

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setSceneReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hubsTick re-syncs once late Supabase hydration lands
  const enrichedHubs = useMemo(() => HUBS.map(enrichHub), [hubsTick])
  const enrichedPlanets = useMemo(() => enrichedHubs.filter((h) => h.id !== 'star'), [enrichedHubs])
  const hubById = useMemo(() => Object.fromEntries(enrichedHubs.map((h) => [h.id, h])), [enrichedHubs])
  const activeHub = hoveredPlanet || hubById[selectedHubId] || hubById.star

  const animate = useCallback((now) => {
    const delta = Math.min(0.032, Math.max(0.001, (now - lastFrameRef.current) / 1000))
    lastFrameRef.current = now

    PLANETS.forEach((p) => {
      if (p.orbitR === 0) return

      const prevAngle = orbitAnglesRef.current[p.id] ?? initialAngleRad(p)
      const angle = prevAngle + orbitSpeedRad(p) * delta
      orbitAnglesRef.current[p.id] = angle

      const { x, y } = positionFromAngle(p, angle)
      const group = planetGroupsRef.current[p.id]
      if (group) group.setAttribute('transform', `translate(${x}, ${y})`)

      const spinPeriod = Math.max(9, Math.min(24, p.period / 180))
      const spinSpeed = (Math.PI * 2) / spinPeriod
      const prevSpin = spinAnglesRef.current[p.id] ?? 0
      const spin = prevSpin + spinSpeed * delta
      spinAnglesRef.current[p.id] = spin

      const spinGroup = planetSpinRefs.current[p.id]
      if (spinGroup) spinGroup.setAttribute('transform', `rotate(${(spin * 180) / Math.PI})`)

      const ringGroup = ringSpinRefs.current[p.id]
      if (ringGroup) ringGroup.setAttribute('transform', `rotate(${(spin * 180) / Math.PI})`)
    })

    animRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (window.innerWidth <= 640 || prefersReducedMotion) return

    PLANETS.forEach((p) => {
      if (p.orbitR === 0) return
      orbitAnglesRef.current[p.id] = initialAngleRad(p)
      spinAnglesRef.current[p.id] = 0
    })

    lastFrameRef.current = performance.now()
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  const openHub = useCallback((id) => {
    setSelectedHubId(id)
    navigate(`/archive/${id}`)
  }, [navigate])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchVal.trim().toLowerCase()
    if (!q) return
    const foundationTerms = ['star', 'beacon', 'foundation', 'north star', 'northstar', 'polaris', 'memoranda', 'canon']
    if (foundationTerms.some((t) => q === t || q.includes(t))) {
      openHub(FOUNDATION_ARCHIVE.id)
      return
    }
    const planet = enrichedPlanets.find(
      (p) => p.id === q || p.label.toLowerCase() === q || p.domain.toLowerCase().includes(q),
    )
    if (planet) openHub(planet.id)
  }

  return (
    <div className={`solar-page solar-map${isDark ? ' solar-map--dark' : ' solar-map--light'}`}>
      <LazyVantaFogBackground
        isDark={isDark}
        entryReveal={sceneReveal}
        className="solar-map__vanta"
      />
      <div
        className="solar-map__veil"
        style={{ opacity: Math.max(0, (isDark ? 0.14 : 0.1) - sceneReveal * (isDark ? 0.22 : 0.16)) }}
        aria-hidden="true"
      />
      <div
        className="solar-map__vignette"
        style={{ opacity: isDark ? 0.2 + sceneReveal * 0.06 : 0.14 + sceneReveal * 0.04 }}
        aria-hidden="true"
      />

      <div className="solar-map__inner" style={{ opacity: sceneReveal }}>
        <motion.header
          className="solar-map__header"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="solar-map__kicker">
            <span>10 Research Domains</span>
          </div>
          <h1 className="solar-map__title">Coordinate Map</h1>
          <p className="solar-map__subtitle">
            Search research domains and open their archive hubs.
          </p>
        </motion.header>

        <motion.div
          className="solar-map__toolbar"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <form onSubmit={handleSearch} className="solar-map__toolbar-form">
            <div className="solar-map__search-wrap">
              <Search size={15} className="solar-map__search-icon" aria-hidden />
              <input
                className="solar-map__search"
                placeholder="Search planet or domain…"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                aria-label="Search planet or domain"
              />
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="solar-map__go-btn"
            >
              Open <ArrowRight size={14} />
            </motion.button>
          </form>
          <span className="solar-map__stat-pill">
            <span className="solar-map__stat-dot" />
            Live orbital telemetry
          </span>
        </motion.div>

        <motion.div
          className="solar-map__hub-selector"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          aria-label="Select research hub"
        >
          {enrichedHubs.map((hub) => {
            const selected = activeHub?.id === hub.id
            const { color: hubColor } = displayColors(hub, isDark)
            return (
              <button
                key={hub.id}
                type="button"
                className="solar-map__hub-select-btn"
                data-selected={selected ? 'true' : 'false'}
                style={{ '--hub-color': hubColor }}
                onMouseEnter={() => setHoveredPlanet(hub)}
                onMouseLeave={() => setHoveredPlanet(null)}
                onClick={() => openHub(hub.id)}
              >
                <span className="solar-map__hub-select-orb" />
                <span>{hub.label}</span>
              </button>
            )
          })}
        </motion.div>

        <div className="solar-map__stage">
          <motion.div
            className="solar-map__canvas-wrap"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.55 }}
          >
            <div className="solar-map__canvas-inner">
              <svg viewBox="0 0 1000 800" className="solar-map__svg" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id="mapSunCorona" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff9944" stopOpacity="0.55" />
                    <stop offset="45%" stopColor="#ff6622" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ff4400" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="mapSunCore" cx="35%" cy="32%" r="65%">
                    <stop offset="0%" stopColor="#fff4e0" />
                    <stop offset="40%" stopColor="#ff8c42" />
                    <stop offset="100%" stopColor="#e85d04" />
                  </radialGradient>
                  <radialGradient id="mapNsCorona" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff9f0" stopOpacity="0.5" />
                    <stop offset="35%" stopColor="#ffd88a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#c77800" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="mapNsDisk" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#ffd54f" />
                    <stop offset="100%" stopColor="#a65f00" />
                  </radialGradient>
                  <linearGradient id="mapNsSpikeV" gradientUnits="userSpaceOnUse" x1="0" y1="-52" x2="0" y2="52">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.58" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="mapNsSpikeH" gradientUnits="userSpaceOnUse" x1="-52" y1="0" x2="52" y2="0">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.58" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <filter id="mapGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Guide line North Star → Sun */}
                <line
                  className="solar-map__guide-line"
                  x1={NORTH_STAR.x}
                  y1={NORTH_STAR.y + 20}
                  x2={CX}
                  y2={CY - 40}
                />

                {/* Orbital rings */}
                {PLANETS.filter((p) => p.orbitR > 0).map((p, i) => (
                  <ellipse
                    key={`orbit-${p.id}`}
                    cx={CX}
                    cy={CY}
                    rx={p.orbitR}
                    ry={p.orbitR * 0.38}
                    className={`solar-map__orbit ${i % 2 ? 'solar-map__orbit--reverse' : ''}`}
                  />
                ))}

                {/* North Star */}
                <g
                  transform={`translate(${NORTH_STAR.x}, ${NORTH_STAR.y})`}
                  onClick={() => openHub(FOUNDATION_ARCHIVE.id)}
                  onMouseEnter={() => setHoveredPlanet(hubById.star)}
                  onMouseLeave={() => setHoveredPlanet(null)}
                  style={{ cursor: 'pointer' }}
                  filter={activeHub?.id === 'star' ? 'url(#mapGlow)' : undefined}
                >
                  <motion.circle
                    r={46}
                    fill="url(#mapNsCorona)"
                    animate={isMobile ? { opacity: 0.75 } : { opacity: [0.55, 1, 0.55], scale: [1, 1.06, 1] }}
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
                  <circle r={8.5} fill="url(#mapNsDisk)" />
                  <circle r={2.4} fill="#ffffff" opacity={0.98} />
                  <text y={54} textAnchor="middle" className="solar-map__hub-label">
                    {FOUNDATION_ARCHIVE.label}
                  </text>
                </g>

                {/* Sun */}
                <g
                  transform={`translate(${CX}, ${CY})`}
                  onClick={() => openHub('sun')}
                  onMouseEnter={() => setHoveredPlanet(hubById.sun)}
                  onMouseLeave={() => setHoveredPlanet(null)}
                  style={{ cursor: 'pointer' }}
                  filter={activeHub?.id === 'sun' ? 'url(#mapGlow)' : undefined}
                >
                  <motion.circle
                    r={58}
                    fill="url(#mapSunCorona)"
                    animate={isMobile ? { opacity: 0.8 } : { opacity: [0.65, 1, 0.65], scale: [1, 1.08, 1] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <circle r={36} fill="url(#mapSunCore)" />
                  <circle r={14} fill="rgba(255,255,255,0.25)" cx={-10} cy={-10} />
                  <text y={52} textAnchor="middle" className="solar-map__hub-label">
                    Sun
                  </text>
                </g>

                {/* Planets */}
                {enrichedPlanets.filter((p) => p.orbitR > 0).map((planet) => {
                  const r = planet.size / 2
                  const isActive = activeHub?.id === planet.id
                  const { x, y } = positionFromAngle(planet, initialAngleRad(planet))
                  const { color: planetColor, glow: planetGlow } = displayColors(planet, isDark)

                  return (
                    <g
                      key={planet.id}
                      ref={(el) => { if (el) planetGroupsRef.current[planet.id] = el }}
                      className="solar-map__planet-orbit"
                      transform={`translate(${x}, ${y})`}
                      onClick={() => openHub(planet.id)}
                      onMouseEnter={() => setHoveredPlanet(planet)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                      style={{ cursor: 'pointer' }}
                      filter={isActive ? 'url(#mapGlow)' : undefined}
                    >
                      <circle
                        r={planet.size * (isActive ? 1.75 : 1.45)}
                        fill={planetGlow}
                        opacity={isActive ? (isDark ? 0.55 : 0.62) : (isDark ? 0.22 : 0.42)}
                      />

                      {planet.id === 'saturn' && (
                        <ellipse
                          ref={(el) => { if (el) ringSpinRefs.current[planet.id] = el }}
                          className="solar-map__planet-ring-spin"
                          rx={planet.size * 1.4}
                          ry={planet.size * 0.3}
                          fill="none"
                          stroke={planetColor}
                          strokeWidth="3"
                          opacity={isDark ? 0.65 : 0.82}
                        />
                      )}

                      <circle r={r} fill={planetColor} />
                      <g
                        ref={(el) => { if (el) planetSpinRefs.current[planet.id] = el }}
                        className="solar-map__planet-spin"
                      >
                        <ellipse
                          rx={r * 0.72}
                          ry={r * 0.13}
                          fill="none"
                          stroke={isDark ? 'rgba(255,255,255,0.24)' : 'rgba(15,23,42,0.32)'}
                          strokeWidth={Math.max(1, r * 0.08)}
                          transform="rotate(-18)"
                        />
                        <ellipse
                          rx={r * 0.58}
                          ry={r * 0.09}
                          fill="none"
                          stroke={isDark ? 'rgba(15,23,42,0.18)' : 'rgba(15,23,42,0.3)'}
                          strokeWidth={Math.max(1, r * 0.06)}
                          transform="rotate(22)"
                        />
                        <circle
                          r={Math.max(1.5, r * 0.12)}
                          cx={r * 0.28}
                          cy={r * 0.12}
                          fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.28)'}
                        />
                      </g>
                      <circle
                        r={r * 0.45}
                        fill={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.32)'}
                        cx={-r * 0.22}
                        cy={-r * 0.22}
                      />

                      <text y={r + 14} textAnchor="middle" className="solar-map__hub-label">
                        {planet.label}
                      </text>
                    </g>
                  )
                })}

                {/* Decorative compass ring */}
                <circle
                  className="solar-map__compass-ring"
                  cx={CX}
                  cy={CY}
                  r={540}
                />
              </svg>
            </div>

            <div className="solar-map__canvas-hint">
              <Orbit size={12} />
              Click to enter
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  )
}
