import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import {
  displayToGrid,
  leavesForSubfieldGrid,
  subfieldsForDomain,
} from '../utils/compileHubTaxonomy.js'
import '../styles/archive-compass-layers.css'

const L3_SLOT_ORDER = ['tl', 'tr', 'bl', 'br']

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
}

/* ═══════════════════════════════════════════
   COMPASS STAR HUB — 4-pointed polygon
   ViewBox 320x320, centre (160,160)
═══════════════════════════════════════════ */
function CompassHub({ taxonomy, isDark }) {
  const color = taxonomy.accentColor
  const label = taxonomy.centerLabel || 'SOLAR'
  const short = label.length > 8 ? label.slice(0, 8) : label
  const circleBg = isDark ? 'rgba(4,9,22,0.97)' : 'rgba(248,250,255,0.98)'
  const STAR = '160,6 187,133 314,160 187,187 160,314 133,187 6,160 133,133'

  return (
    <div className="cv-hub" style={{ '--accent': color }} aria-hidden>
      <div className="cv-hub__halo" />
      <svg
        className="cv-hub__svg"
        viewBox="0 0 320 320"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        <defs>
          <radialGradient id="cvStarFill" cx="50%" cy="50%" r="50%" gradientUnits="userSpaceOnUse" fx="160" fy="160">
            <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
            <stop offset="28%"  stopColor={color} stopOpacity="0.92" />
            <stop offset="72%"  stopColor={color} stopOpacity="1"    />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </radialGradient>
          <radialGradient id="cvStarAmbient" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </radialGradient>
          <filter id="cvStarBloom" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="160" cy="160" r="130" fill="url(#cvStarAmbient)" />
        <polygon points={STAR} fill={color} fillOpacity="0.45" filter="url(#cvStarBloom)" />
        <polygon points={STAR} fill="url(#cvStarFill)" />
        <circle cx="160" cy="160" r="17" fill={circleBg} />
        <circle cx="160" cy="160" r="17" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
        <text x="160" y="165" textAnchor="middle" fontSize="9" fontWeight="900"
          letterSpacing="0.1em" fill={color} fontFamily="Inter, system-ui, sans-serif">
          {short}
        </text>
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════
   L2 DOMAIN CARD
   [top pair] / [-- DOMAIN --] / [bottom pair]
═══════════════════════════════════════════ */
function L2DomainCard({ domain, taxonomy, onSubfieldClick }) {
  const sorted = [...subfieldsForDomain(taxonomy, domain.id)].sort(
    (a, b) => L3_SLOT_ORDER.indexOf(a.l3Slot) - L3_SLOT_ORDER.indexOf(b.l3Slot),
  )
  const topPair    = sorted.slice(0, 2)
  const bottomPair = sorted.slice(2, 4)

  return (
    <motion.div
      variants={fadeUp}
      className="cv-domain-card"
      style={{
        '--dc':        domain.color,
        '--dc-08':     `${domain.color}14`,
        '--dc-15':     `${domain.color}26`,
        '--dc-18':     `${domain.color}2e`,
        '--dc-30':     `${domain.color}4d`,
        '--dc-shadow': `${domain.color}28`,
      }}
    >
      <div className="cv-domain-card__glow" aria-hidden />

      <div className="cv-pair">
        {topPair.map((sf) => (
          <motion.button key={sf.id} type="button" className="cv-sf-tile"
            onClick={() => onSubfieldClick?.(sf)}
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
            <span className="cv-sf-tile__text">{sf.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="cv-divider-row">
        <span className="cv-divider-row__line" />
        <span className="cv-divider-row__label">{domain.label}</span>
        <span className="cv-divider-row__line" />
      </div>

      <div className="cv-pair">
        {bottomPair.map((sf) => (
          <motion.button key={sf.id} type="button" className="cv-sf-tile"
            onClick={() => onSubfieldClick?.(sf)}
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
            <span className="cv-sf-tile__text">{sf.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   L2 VIEW — 2x2 grid + compass hub
═══════════════════════════════════════════ */
function CompassL2({ taxonomy, isDark, onSubfieldClick }) {
  const color = taxonomy.accentColor

  return (
    <motion.div
      className={`cv-layer cv-layer--l2 ${isDark ? 'cv-dark' : 'cv-light'}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="cv-header">
        <div className="cv-header__left">
          <span className="cv-badge" style={{ borderColor: `${color}55`, color }}>L2</span>
          <span className="cv-hub-name" style={{ color }}>{taxonomy.centerLabel}</span>
          {taxonomy.discipline && (
            <span className="cv-discipline">{taxonomy.discipline}</span>
          )}
        </div>
        <span className="cv-hint">4 domains - 16 subfields - click any tile to drill deeper</span>
      </div>

      <div className="cv-l2-wrapper">
        <motion.div className="cv-l2-grid" variants={stagger} initial="hidden" animate="show">
          {taxonomy.domains.map((dom) => (
            <L2DomainCard
              key={dom.id}
              domain={dom}
              taxonomy={taxonomy}
              onSubfieldClick={onSubfieldClick}
            />
          ))}
        </motion.div>
        <CompassHub taxonomy={taxonomy} isDark={isDark} />
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   L3 SUBFIELD PANEL — mirrors L2 card
   [top pair] / [-- SUBFIELD --] / [bottom pair]
═══════════════════════════════════════════ */
function L3SubfieldPanel({ subfield, domain, taxonomy, isActive, onTopicClick }) {
  const leaves     = leavesForSubfieldGrid(taxonomy, subfield.id)
  const topPair    = leaves.slice(0, 2)
  const bottomPair = leaves.slice(2, 4)

  return (
    <motion.div
      variants={fadeUp}
      className={`cv-l3-panel ${isActive ? 'cv-l3-panel--active' : ''}`}
      style={{
        '--dc':        domain.color,
        '--dc-08':     `${domain.color}14`,
        '--dc-15':     `${domain.color}26`,
        '--dc-18':     `${domain.color}2e`,
        '--dc-25':     `${domain.color}40`,
        '--dc-30':     `${domain.color}4d`,
        '--dc-shadow': `${domain.color}2a`,
      }}
    >
      <div className="cv-l3-panel__dots"  aria-hidden />
      <div className="cv-l3-panel__glow"  aria-hidden />

      <div className="cv-pair">
        {topPair.map((leaf) => (
          <motion.button key={leaf.title} type="button" className="cv-l3-tile"
            onClick={() => onTopicClick?.(leaf, subfield)}
            whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}>
            <span className="cv-l3-tile__text">{leaf.title}</span>
          </motion.button>
        ))}
      </div>

      <div className="cv-l3-divider-row">
        <span className="cv-l3-divider-row__line" />
        <span className="cv-l3-divider-row__label">{subfield.label}</span>
        <span className="cv-l3-divider-row__line" />
      </div>

      <div className="cv-pair">
        {bottomPair.map((leaf) => (
          <motion.button key={leaf.title} type="button" className="cv-l3-tile"
            onClick={() => onTopicClick?.(leaf, subfield)}
            whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}>
            <span className="cv-l3-tile__text">{leaf.title}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   L3 VIEW — 2x2 subfield panels + centre ring
═══════════════════════════════════════════ */
function CompassL3({ taxonomy, isDark, activeSubfieldId, onBack, onTopicClick }) {
  const domain = taxonomy.domains.find((d) => d.id === taxonomy._activeDomainId)
  if (!domain) return null

  const sorted = [...subfieldsForDomain(taxonomy, domain.id)].sort(
    (a, b) => L3_SLOT_ORDER.indexOf(a.l3Slot) - L3_SLOT_ORDER.indexOf(b.l3Slot),
  )

  return (
    <motion.div
      className={`cv-layer cv-layer--l3 ${isDark ? 'cv-dark' : 'cv-light'}`}
      style={{ '--domain-color': domain.color }}
      initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cv-header cv-header--l3">
        <button type="button" className="cv-back-btn" onClick={onBack}>
          <ChevronLeft size={15} aria-hidden />
          <span>All domains</span>
        </button>
        <motion.div
          className="cv-l3-heading"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <span
            className="cv-l3-heading__dot"
            style={{ background: domain.color, boxShadow: `0 0 14px ${domain.color}bb` }}
          />
          <span className="cv-l3-heading__name" style={{ color: domain.color }}>
            {domain.label}
          </span>
          <span className="cv-badge" style={{ borderColor: `${domain.color}55`, color: domain.color }}>
            L3
          </span>
        </motion.div>
        <span className="cv-hint">Select a topic to open archive at L4</span>
      </div>

      <div className="cv-l3-wrapper">
        <motion.div className="cv-l3-grid" variants={stagger} initial="hidden" animate="show">
          {sorted.map((sf) => (
            <L3SubfieldPanel
              key={sf.id}
              subfield={sf}
              domain={domain}
              taxonomy={taxonomy}
              isActive={activeSubfieldId === sf.id}
              onTopicClick={onTopicClick}
            />
          ))}
        </motion.div>

        <div
          className="cv-l3-center-ring"
          style={{
            borderColor: domain.color,
            boxShadow: `0 0 18px ${domain.color}88, inset 0 0 10px ${domain.color}44`,
          }}
        >
          <div
            className="cv-l3-center-ring__inner"
            style={{ background: domain.color, boxShadow: `0 0 10px ${domain.color}` }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   PUBLIC EXPORT
═══════════════════════════════════════════ */
export default function ArchiveCompassView({
  layer,
  taxonomy,
  isDark,
  activeDomainId,
  activeSubfieldId,
  onSelectDomain,
  onSelectSubfield,
  onDrillToL3,
  onBackToL2,
  focusSubjectCell,
  halfW,
  halfH,
}) {
  if (!taxonomy || (layer !== 2 && layer !== 3)) return null

  const taxonomyL3 = { ...taxonomy, _activeDomainId: activeDomainId }

  const handleSubfieldL2 = (sf) => {
    onSelectDomain?.(sf.domainId)
    onSelectSubfield?.(sf.id)
    onDrillToL3?.()
  }

  const handleTopic = (leaf, subfield) => {
    onSelectSubfield?.(subfield.id)
    if (typeof focusSubjectCell === 'function' && Number.isFinite(halfW) && Number.isFinite(halfH)) {
      const { gx, gy } = displayToGrid(leaf.lx, leaf.ly, halfW, halfH)
      focusSubjectCell(gx, gy, 4)
    }
  }

  return (
    <div className="cv-viewport" onPointerDown={(e) => e.stopPropagation()}>
      <AnimatePresence mode="wait">
        {layer === 2 && (
          <CompassL2
            key="l2"
            taxonomy={taxonomy}
            isDark={isDark}
            onSubfieldClick={handleSubfieldL2}
          />
        )}
        {layer === 3 && activeDomainId && (
          <CompassL3
            key={`l3-${activeDomainId}`}
            taxonomy={taxonomyL3}
            isDark={isDark}
            activeSubfieldId={activeSubfieldId}
            onBack={onBackToL2}
            onTopicClick={handleTopic}
          />
        )}
        {layer === 3 && !activeDomainId && (
          <motion.div
            key="l3-empty"
            className={`cv-layer cv-layer--empty ${isDark ? 'cv-dark' : 'cv-light'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <p className="cv-hint" style={{ textAlign: 'center' }}>Choose a domain on L2 first.</p>
            <button type="button" className="cv-back-btn" onClick={onBackToL2}>
              <ChevronLeft size={15} aria-hidden /> Back to L2
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
