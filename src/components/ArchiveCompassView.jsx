import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

function starLines(subject) {
  const clean = String(subject || 'SOLAR').replace(/\s+/g, ' ').trim()
  const words = clean.split(' ')
  if (words.length <= 1) return [clean, null]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function compactBadgeText(text) {
  const clean = String(text || '').trim()
  if (clean.length <= 13) return clean
  return `${clean.slice(0, 12)}…`
}

/* ═══════════════════════════════════════════
   COMPASS STAR HUB
   Full-wrapper SVG arms (edge-to-edge) +
   separate centered circle badge
═══════════════════════════════════════════ */
function CompassHub({ taxonomy, isDark }) {
  const color = taxonomy.accentColor
  const subject = taxonomy.discipline || taxonomy.centerLabel || 'SOLAR'
  const circleBg = isDark ? 'rgba(4,9,22,0.97)' : 'rgba(248,250,255,0.98)'
  const [line1, line2] = starLines(subject)
  // Arms in 100×100 viewBox, preserveAspectRatio="none" so they always reach panel edges
  // Each arm is a thin triangle: tip at panel edge, base joins center area (~46-54%)
  const ARM_W = 2.2 // half-width of arm at the center join, in viewBox units

  return (
    <div className="cv-hub" style={{ '--accent': color }} aria-hidden>
      {/* ── Full-span arms SVG ── */}
      <svg
        className="cv-hub__arms-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`bloom-${color.replace('#','')}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id={`amb-${color.replace('#','')}`} cx="50%" cy="50%" r="32%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ambient centre glow */}
        <rect x="0" y="0" width="100" height="100" fill={`url(#amb-${color.replace('#','')})`} />

        {/* bloom shadows (behind) */}
        <polygon points={`50,0 ${50+ARM_W},${50-ARM_W} ${50-ARM_W},${50-ARM_W}`}
          fill={color} fillOpacity="0.18" filter={`url(#bloom-${color.replace('#','')})`} />
        <polygon points={`50,100 ${50+ARM_W},${50+ARM_W} ${50-ARM_W},${50+ARM_W}`}
          fill={color} fillOpacity="0.18" filter={`url(#bloom-${color.replace('#','')})`} />
        <polygon points={`0,50 ${50-ARM_W},${50-ARM_W} ${50-ARM_W},${50+ARM_W}`}
          fill={color} fillOpacity="0.18" filter={`url(#bloom-${color.replace('#','')})`} />
        <polygon points={`100,50 ${50+ARM_W},${50-ARM_W} ${50+ARM_W},${50+ARM_W}`}
          fill={color} fillOpacity="0.18" filter={`url(#bloom-${color.replace('#','')})`} />

        {/* main solid arms */}
        <polygon points={`50,0 ${50+ARM_W},${50-ARM_W} ${50-ARM_W},${50-ARM_W}`}
          fill={color} fillOpacity="0.88" />
        <polygon points={`50,100 ${50+ARM_W},${50+ARM_W} ${50-ARM_W},${50+ARM_W}`}
          fill={color} fillOpacity="0.88" />
        <polygon points={`0,50 ${50-ARM_W},${50-ARM_W} ${50-ARM_W},${50+ARM_W}`}
          fill={color} fillOpacity="0.88" />
        <polygon points={`100,50 ${50+ARM_W},${50-ARM_W} ${50+ARM_W},${50+ARM_W}`}
          fill={color} fillOpacity="0.88" />
      </svg>

      {/* ── Glowing tip dots at panel edges ── */}
      <span className="cv-hub__tip cv-hub__tip--top"    style={{ background: color, boxShadow: `0 0 10px 3px ${color}` }} />
      <span className="cv-hub__tip cv-hub__tip--right"  style={{ background: color, boxShadow: `0 0 10px 3px ${color}` }} />
      <span className="cv-hub__tip cv-hub__tip--bottom" style={{ background: color, boxShadow: `0 0 10px 3px ${color}` }} />
      <span className="cv-hub__tip cv-hub__tip--left"   style={{ background: color, boxShadow: `0 0 10px 3px ${color}` }} />

      {/* ── Centre badge ── */}
      <div
        className="cv-hub__badge"
        style={{
          background: circleBg,
          border: `1.8px solid ${color}aa`,
          boxShadow: `0 0 24px ${color}55, 0 0 6px ${color}33, inset 0 0 10px ${color}1a`,
        }}
      >
        <span className="cv-hub__badge-ring" style={{ borderColor: `${color}33` }} />
        {line2 ? (
          <>
            <span className="cv-hub__label" style={{ color }}>{compactBadgeText(line1).toUpperCase()}</span>
            <span className="cv-hub__label" style={{ color }}>{compactBadgeText(line2).toUpperCase()}</span>
          </>
        ) : (
          <span className="cv-hub__label" style={{ color }}>{compactBadgeText(line1).toUpperCase()}</span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   L2 DOMAIN CARD
═══════════════════════════════════════════ */
function L2DomainCard({ domain, taxonomy, onSubfieldClick, onProposeSubject }) {
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

      {onProposeSubject && (
        <motion.button
          type="button"
          className="cv-add-btn"
          title={`Suggest a new subject under ${domain.label} — it goes through the same 3-reviewer approval as every submission.`}
          onClick={() => onProposeSubject(domain.id)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
        >
          <span>Suggest a subject</span>
        </motion.button>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   L2 VIEW
═══════════════════════════════════════════ */
function CompassL2({ taxonomy, isDark, onSubfieldClick, onExitToL1, onDrillToL3, onProposeSubject }) {
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
        <span className="cv-hint">4 domains · 16 subfields · click any tile to drill deeper</span>
      </div>

      <div className="cv-l2-wrapper">
        <motion.div className="cv-l2-grid" variants={stagger} initial="hidden" animate="show">
          {taxonomy.domains.map((dom) => (
            <L2DomainCard
              key={dom.id}
              domain={dom}
              taxonomy={taxonomy}
              onSubfieldClick={onSubfieldClick}
              onProposeSubject={onProposeSubject}
            />
          ))}
        </motion.div>
        <CompassHub taxonomy={taxonomy} isDark={isDark} />
      </div>

      {/* ── Layer navigation bar ── */}
      <div className="cv-nav-bar">
        <motion.button
          type="button"
          className="cv-nav-btn cv-nav-btn--back"
          onClick={onExitToL1}
          whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={14} />
          <span>L1 Overview</span>
        </motion.button>

        <div className="cv-nav-pips">
          <span className="cv-nav-pip cv-nav-pip--active" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="cv-nav-pip" />
        </div>

        <motion.button
          type="button"
          className="cv-nav-btn cv-nav-btn--fwd"
          onClick={onDrillToL3}
          whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}
          style={{ color, borderColor: `${color}44`, background: `${color}12` }}
        >
          <span>Subfields</span>
          <ChevronRight size={14} />
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   L3 SUBFIELD PANEL
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
   L3 VIEW
═══════════════════════════════════════════ */
function CompassL3({ taxonomy, isDark, activeSubfieldId, onBack, onTopicClick, onAdvanceToL4, onProposeSubject }) {
  const domain = taxonomy.domains.find((d) => d.id === taxonomy._activeDomainId)
  if (!domain) return null

  const sorted = [...subfieldsForDomain(taxonomy, domain.id)].sort(
    (a, b) => L3_SLOT_ORDER.indexOf(a.l3Slot) - L3_SLOT_ORDER.indexOf(b.l3Slot),
  )

  // Reuse CompassHub with the domain's taxonomy-like object
  const domainTaxonomy = {
    accentColor: domain.color,
    discipline: domain.label,
    centerLabel: domain.label,
  }

  return (
    <motion.div
      className={`cv-layer cv-layer--l3 ${isDark ? 'cv-dark' : 'cv-light'}`}
      style={{ '--domain-color': domain.color }}
      initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cv-header cv-header--l3">
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

        {/* Same full-span star for L3 */}
        <CompassHub taxonomy={domainTaxonomy} isDark={isDark} />
      </div>

      {/* ── Layer navigation bar ── */}
      <div className="cv-nav-bar">
        <motion.button
          type="button"
          className="cv-nav-btn cv-nav-btn--back"
          onClick={onBack}
          whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={14} />
          <span>All domains</span>
        </motion.button>

        <div className="cv-nav-pips">
          <span className="cv-nav-pip" />
          <span className="cv-nav-pip cv-nav-pip--active" style={{ background: domain.color, boxShadow: `0 0 8px ${domain.color}` }} />
        </div>

        {onProposeSubject && (
          <motion.button
            type="button"
            className="cv-nav-btn cv-add-btn cv-add-btn--nav"
            title={`Suggest a new subject under ${domain.label} — reviewed by 3 reviewers before it appears in the archive.`}
            onClick={() => onProposeSubject(domain.id, activeSubfieldId || undefined)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
            style={{ color: domain.color, borderColor: `${domain.color}55` }}
          >
            <span>Suggest a subject</span>
          </motion.button>
        )}

        <motion.button
          type="button"
          className="cv-nav-btn cv-nav-btn--fwd"
          onClick={onAdvanceToL4}
          whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}
          style={{ color: domain.color, borderColor: `${domain.color}44`, background: `${domain.color}12` }}
        >
          <span>Open L4</span>
          <ChevronRight size={14} />
        </motion.button>
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
  onExitToL1,
  onAdvanceToL4,
  onProposeSubject,
  onOpenTopic,
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
    if (typeof onOpenTopic === 'function') {
      // anchor the subfield block to its own compass corner on L4
      onOpenTopic(leaf, subfield)
      return
    }
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
            onExitToL1={onExitToL1}
            onDrillToL3={onDrillToL3}
            onProposeSubject={onProposeSubject}
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
            onAdvanceToL4={onAdvanceToL4}
            onProposeSubject={onProposeSubject}
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
