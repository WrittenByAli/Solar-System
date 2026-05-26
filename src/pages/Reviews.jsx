import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, ShieldCheck, Target, Zap, Globe, LayoutGrid,
  Award, Trophy, CheckCircle2, TrendingUp, Activity,
  ChevronDown, ChevronUp, ThumbsUp, Clock, Eye,
  Crosshair, Search,
} from 'lucide-react'
import { useTheme } from '../App.jsx'
import '../styles/solar-reviews.css'

/* ═══════════════════════════════════════════════════════
   STATIC DATA
   ═══════════════════════════════════════════════════════ */

const HUB_COLORS = {
  'Sun Hub':     '#f5a623',
  'Earth Hub':   '#34d399',
  'Mars Hub':    '#f87171',
  'Mercury Hub': '#94a3b8',
  'Neptune Hub': '#818cf8',
  'Saturn Hub':  '#fde68a',
  'Jupiter Hub': '#fb923c',
  'Venus Hub':   '#f472b6',
  'Uranus Hub':  '#67e8f9',
}

const REVIEWER_RANKS = [
  { name: 'New Reviewer',      min: 0,    max: 200,      color: '#94a3b8', icon: '⭐' },
  { name: 'Coordinate Scout',  min: 200,  max: 500,      color: '#34d399', icon: '🗺️' },
  { name: 'Citation Analyst',  min: 500,  max: 1200,     color: '#4fc3f7', icon: '🔬' },
  { name: 'Archive Validator', min: 1200, max: 3000,     color: '#a78bfa', icon: '🛡️' },
  { name: 'Knowledge Steward', min: 3000, max: 6000,     color: '#f5a623', icon: '🌟' },
  { name: 'Archive Legend',    min: 6000, max: Infinity,  color: '#ff6b35', icon: '🌞' },
]

const FEATURE_CARDS = [
  { icon: BookOpen,   color: '#4fc3f7', badge: 'Source Integrity', title: 'Citation Review',            desc: 'Verify source accuracy, check publication dates, and confirm all citations link to accessible, peer-reviewed content.' },
  { icon: ShieldCheck,color: '#34d399', badge: 'Quality Gate',     title: 'Source Quality Scoring',     desc: 'Rate information density, citation depth, and methodological rigor of submitted archive entries on a 10-point scale.' },
  { icon: Crosshair,  color: '#f5a623', badge: 'Placement Verified',title: 'Coordinate Validation',    desc: 'Confirm each entry is filed at the correct coordinate within the archive grid taxonomy for its planetary hub.' },
  { icon: LayoutGrid, color: '#a78bfa', badge: 'Open Queue',       title: 'Peer Review Queue',          desc: 'Browse pending submissions across all hubs, claim entries for review, and track your full review history.' },
  { icon: Award,      color: '#f5a623', badge: 'Points System',    title: 'Reviewer Rewards',           desc: 'Earn XP, advance reviewer ranks, and unlock holographic achievement badges for quality, accurate reviews.' },
  { icon: Globe,      color: '#67e8f9', badge: 'Impact Direct',    title: 'Verified Public Knowledge',  desc: 'Your reviews determine which entries graduate from pending to trusted public status inside the live archive.' },
]

const REVIEW_FEED = [
  {
    id: 1, reviewer: 'aurora_field', avatar: '🌟', rank: 'Knowledge Steward', xp: 2840,
    title: 'Passive Solar Building Design Principles', hub: 'Earth Hub', coord: '142, 088', layer: 'L5',
    citationScore: 9.4, clarityScore: 8.8, difficulty: 4, status: 'approved', date: '2026-05-24', helpful: 48,
    notes: 'Exceptional entry. All 6 cited sources are peer-reviewed and current (2020–2025). Coordinate placement at 142,088 is precise — correctly falls within the Thermal Architecture domain of the Earth Hub taxonomy. Methodology is replicable and the coordinate drill from L3 to L5 reveals excellent progression of detail.',
    sources: ['buildingscience.com', 'ashrae.org', 'nrel.gov'],
  },
  {
    id: 2, reviewer: 'orbit_cartographer', avatar: '🗺️', rank: 'Archive Validator', xp: 2360,
    title: 'Vertical Axis Wind Turbine Arrays — Off-Grid Deployment', hub: 'Sun Hub', coord: '067, 201', layer: 'L6',
    citationScore: 8.2, clarityScore: 9.1, difficulty: 5, status: 'approved', date: '2026-05-23', helpful: 39,
    notes: 'Strong technical depth. Two citations from 2019 slightly reduce freshness but core engineering data remains valid. Coordinate 067,201 correctly placed in the Wind Energy sub-sector. Difficulty 5/5 is justified — this entry requires advanced turbine engineering knowledge.',
    sources: ['wind-energy.eu', 'irena.org', 'sciencedirect.com'],
  },
  {
    id: 3, reviewer: 'solar_factcheck', avatar: '🔬', rank: 'Citation Analyst', xp: 1980,
    title: 'Seawater Desalination via Concentrated Solar Thermal', hub: 'Neptune Hub', coord: '234, 156', layer: 'L4',
    citationScore: 6.3, clarityScore: 7.1, difficulty: 4, status: 'revision', date: '2026-05-22', helpful: 27,
    notes: 'Revision requested. Two of four citations resolve to dead links — source validation failed. Coordinate 234,156 appears misplaced; this entry better fits the Solar Thermal domain of the Sun Hub. Requesting author to fix citations and verify coordinate placement before re-submission.',
    sources: ['iwa-network.org'],
  },
  {
    id: 4, reviewer: 'signal_bridge', avatar: '📡', rank: 'Archive Validator', xp: 1540,
    title: 'LoRa Mesh Networks for Rural Autonomy Infrastructure', hub: 'Mercury Hub', coord: '089, 113', layer: 'L5',
    citationScore: 9.7, clarityScore: 9.4, difficulty: 3, status: 'approved', date: '2026-05-21', helpful: 31,
    notes: 'Outstanding citation quality — all 5 sources are live, verified, and current. LoRa Alliance technical documentation citations link to exact specification versions referenced. Coordinate 089,113 optimally placed in the Long-Range Radio domain. Clarity score is the highest in this review cycle.',
    sources: ['lora-alliance.org', 'semtech.com', 'thethingsnetwork.org'],
  },
  {
    id: 5, reviewer: 'bio_dome_archivist', avatar: '🌿', rank: 'Coordinate Scout', xp: 780,
    title: 'Biochar Soil Amendment for Carbon Sequestration', hub: 'Earth Hub', coord: '178, 044', layer: 'L4',
    citationScore: 7.8, clarityScore: 8.2, difficulty: 3, status: 'pending', date: '2026-05-20', helpful: 14,
    notes: 'Review in progress. Initial citation check: 4/6 sources verified. Two sources require deeper validation against original research databases. Coordinate placement looks correct for the Regenerative Agriculture domain. Requesting second reviewer from a soil science specialist before final decision.',
    sources: ['nature.com', 'soilsociety.org'],
  },
]

const ACHIEVEMENT_BADGES = [
  { icon: '⭐', name: 'First Review',    desc: 'Complete your first review',     earned: true,  color: '#f5a623' },
  { icon: '🔥', name: '7-Day Streak',   desc: 'Review 7 days in a row',          earned: true,  color: '#ff6b35' },
  { icon: '🎯', name: 'Citation Expert',desc: '20 citation checks passed',        earned: true,  color: '#4fc3f7' },
  { icon: '🛡️', name: 'Validator',      desc: '10 entries approved',             earned: true,  color: '#a78bfa' },
  { icon: '🌍', name: 'Earth Specialist',desc: 'Review 15 Earth Hub entries',    earned: false, color: '#34d399' },
  { icon: '⚡', name: 'Speed Reviewer', desc: 'Review 5 entries in one day',     earned: false, color: '#fbbf24' },
]

const TOP_REVIEWERS = [
  { username: 'aurora_field',       rank: 'Knowledge Steward', xp: 2840, reviews: 47, accuracy: 94, avatar: '🌟' },
  { username: 'orbit_cartographer', rank: 'Archive Validator', xp: 2360, reviews: 32, accuracy: 91, avatar: '🗺️' },
  { username: 'solar_factcheck',    rank: 'Citation Analyst',  xp: 1980, reviews: 38, accuracy: 89, avatar: '🔬' },
  { username: 'signal_bridge',      rank: 'Archive Validator', xp: 1540, reviews: 24, accuracy: 96, avatar: '📡' },
  { username: 'bio_dome_archivist', rank: 'Coordinate Scout',  xp: 780,  reviews: 11, accuracy: 88, avatar: '🌿' },
]

const HUB_ANALYTICS = [
  { hub: 'Earth',   reviews: 18, color: '#34d399' },
  { hub: 'Sun',     reviews: 12, color: '#f5a623' },
  { hub: 'Mercury', reviews: 9,  color: '#94a3b8' },
  { hub: 'Neptune', reviews: 7,  color: '#818cf8' },
  { hub: 'Mars',    reviews: 5,  color: '#f87171' },
  { hub: 'Jupiter', reviews: 4,  color: '#fb923c' },
]

const HUB_FILTERS   = ['All Hubs', 'Sun Hub', 'Earth Hub', 'Mercury Hub', 'Neptune Hub', 'Mars Hub']
const STATUS_FILTERS = ['All', 'Approved', 'Revision', 'Pending']

/* ═══════════════════════════════════════════════════════
   SMALL HELPERS
   ═══════════════════════════════════════════════════════ */

function SectionLabel({ children, centered = false }) {
  return (
    <div className="sa-reviews-section-label" style={centered ? { justifyContent: 'center' } : {}}>
      <span style={{ color: '#f5a623', fontSize: 8 }}>◆</span>
      {children}
    </div>
  )
}

function Headline({ children, centered = false, style = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <h2 style={{
      fontFamily: "'Anton', 'Impact', sans-serif",
      fontSize: 'clamp(1.8rem, 4vw, 2.9rem)',
      fontWeight: 400,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      color: isDark ? '#f8fafc' : '#0f172a',
      lineHeight: 1.08,
      textAlign: centered ? 'center' : undefined,
      ...style,
    }}>
      {children}
    </h2>
  )
}

function Sub({ children, centered = false }) {
  return (
    <p style={{
      fontSize: 15, color: '#64748b', lineHeight: 1.7,
      maxWidth: centered ? 560 : undefined,
      margin: centered ? '0 auto' : undefined,
    }}>
      {children}
    </p>
  )
}

function StarDiff({ n }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          fontSize: 13,
          color: i <= n ? '#f5a623' : 'rgba(245,166,35,0.15)',
          filter: i <= n ? 'drop-shadow(0 0 4px rgba(245,166,35,0.55))' : 'none',
        }}>★</span>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    approved: { cls: 'sa-reviews-status--approved', dot: '#34d399', label: '✓ Approved' },
    revision: { cls: 'sa-reviews-status--revision', dot: '#fbbf24', label: '⟳ Revision' },
    pending:  { cls: 'sa-reviews-status--pending',  dot: '#4fc3f7', label: '◌ Pending'  },
  }
  const s = map[status] || map.pending
  return (
    <span className={`sa-reviews-status ${s.cls}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, boxShadow: `0 0 6px ${s.dot}`, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function HubPill({ hub }) {
  const c = HUB_COLORS[hub] || '#4fc3f7'
  return (
    <span className="sa-reviews-hub-pill" style={{ background: `${c}18`, border: `1px solid ${c}28`, color: c }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, flexShrink: 0 }} />
      {hub}
    </span>
  )
}

function ProgressFill({ pct, gradient, delay = 0 }) {
  return (
    <motion.div
      className="sa-reviews-progress-fill"
      initial={{ width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      style={{ background: gradient }}
    />
  )
}

/* ═══════════════════════════════════════════════════════
   COSMIC BACKGROUND (shared hero bg)
   ═══════════════════════════════════════════════════════ */

const PARTICLES = [
  { top: '14%', left: '7%',  sz: 3, c: '#4fc3f7', dur: 7,  del: 0 },
  { top: '48%', left: '93%', sz: 2, c: '#f5a623', dur: 9,  del: 2.5 },
  { top: '72%', left: '13%', sz: 2, c: '#a78bfa', dur: 8,  del: 4.5 },
  { top: '22%', left: '77%', sz: 3, c: '#4fc3f7', dur: 10, del: 1.5 },
  { top: '83%', left: '58%', sz: 2, c: '#34d399', dur: 6,  del: 3 },
  { top: '37%', left: '42%', sz: 2, c: '#f5a623', dur: 11, del: 6 },
]

function CosmicBg() {
  return (
    <div className="sa-reviews-cosmic-bg">
      <div className="sa-reviews-grid-bg" />

      {/* Orbit rings */}
      {[600, 920, 1250, 1580].map((sz, i) => (
        <div
          key={i}
          className={`sa-reviews-orbit-ring${i % 2 === 1 ? ' sa-reviews-orbit-ring--rev' : ''}`}
          style={{
            width: sz, height: sz,
            animationDuration: `${32 + i * 18}s`,
            opacity: 0.05 + i * 0.01,
          }}
        />
      ))}

      {/* Scan line */}
      <div className="sa-reviews-scan-line" />

      {/* Gradient orbs */}
      <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', animation: 'sa-reviews-float-slow 22s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '5%',  left: '-6%',  width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,195,247,0.05) 0%, transparent 70%)',  animation: 'sa-reviews-float-slow 16s ease-in-out infinite', animationDelay: '-8s',  pointerEvents: 'none' }} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="sa-reviews-particle"
          style={{
            top: p.top, left: p.left,
            width: p.sz, height: p.sz,
            background: p.c,
            boxShadow: `0 0 6px ${p.c}`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${-p.del}s`,
          }}
        />
      ))}

      {/* Solar bloom */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */

const HERO_STATS = [
  { label: 'Pending Reviews',    value: '247',   color: '#4fc3f7', Icon: Clock },
  { label: 'Approved Entries',   value: '1,834', color: '#34d399', Icon: CheckCircle2 },
  { label: 'Reviewer Points',    value: '48.2K', color: '#f5a623', Icon: Zap },
  { label: 'Citation Checks',    value: '9,621', color: '#a78bfa', Icon: BookOpen },
  { label: 'Community Accuracy', value: '91.4%', color: '#67e8f9', Icon: Target },
]

function HeroSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <section className="sa-reviews-hero">
      <CosmicBg />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 940, width: '100%' }}>
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(2.6rem, 7.5vw, 5.8rem)',
            fontWeight: 400,
            lineHeight: 1.02,
            letterSpacing: '0.025em',
            textTransform: 'uppercase',
            color: isDark ? '#f8fafc' : '#0f172a',
            marginBottom: 6,
          }}
        >
          Review Knowledge.{' '}
          <span>
            Strengthen
          </span>
          {' '}the Archive.
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          style={{ fontSize: 'clamp(1rem, 2.4vw, 1.18rem)', color: isDark ? '#64748b' : '#475569', lineHeight: 1.72, maxWidth: 680, margin: '18px auto 42px' }}
        >
          Validate submissions, check citations, reward high-quality research, and help build a trusted coordinate archive for off-grid autonomy and public knowledge.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46 }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 68 }}
        >
          <Link to="/review-queue">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="sa-reviews-btn-primary">
              <Zap size={17} /> Start Reviewing
            </motion.button>
          </Link>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="sa-reviews-btn-secondary">
            <Eye size={17} /> Explore Public Reviews
          </motion.button>
        </motion.div>

        {/* Floating stat cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.58 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {HERO_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62 + i * 0.09 }}
              className="sa-reviews-stat-card"
              style={{ animationDuration: `${5.5 + i * 1.4}s`, animationDelay: `${-i * 1.1}s` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}18`, border: `1px solid ${s.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.Icon size={13} color={s.color} />
                </div>
                <span style={{ fontSize: 9.5, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 23, fontWeight: 900, color: s.color, fontFamily: "'JetBrains Mono', monospace", filter: `drop-shadow(0 0 8px ${s.color}55)` }}>
                {s.value}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll nudge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ delay: 1.6 }}
        style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
      >
        <span style={{ fontSize: 9, color: isDark ? '#334155' : '#94a3b8', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scroll</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={18} color={isDark ? '#334155' : '#94a3b8'} />
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════════ */

function FeaturesSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <section style={{ padding: '96px 24px', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 60 }}>
          <SectionLabel centered>Review Capabilities</SectionLabel>
          <Headline centered style={{ marginBottom: 16 }}>Built for Archive Integrity</Headline>
          <Sub centered>Six precision tools for validating research quality, source accuracy, and coordinate placement across all planetary hubs.</Sub>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 22 }}>
          {FEATURE_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="sa-reviews-feat-card"
            >
              {/* Top-corner glow */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 130, height: 130, borderRadius: '0 22px 0 50%', background: `radial-gradient(circle at top right, ${card.color}09, transparent 70%)`, pointerEvents: 'none' }} />

              <div className="sa-reviews-feat-icon" style={{ background: `${card.color}15`, border: `1px solid ${card.color}28` }}>
                <card.icon size={24} color={card.color} />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 5, background: `${card.color}10`, border: `1px solid ${card.color}22`, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", color: card.color, textTransform: 'uppercase', marginBottom: 12 }}>
                {card.badge}
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: 10, letterSpacing: '-0.01em' }}>{card.title}</h3>
              <p style={{ fontSize: 13.5, color: isDark ? '#64748b' : '#475569', lineHeight: 1.7 }}>{card.desc}</p>

              {/* Micro orbit */}
              <div style={{ position: 'absolute', bottom: 14, right: 14, opacity: 0.18, pointerEvents: 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${card.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: card.color }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   REVIEW FEED
   ═══════════════════════════════════════════════════════ */

function ReviewFeedSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [hubFilter,    setHubFilter]    = useState('All Hubs')
  const [statusFilter, setStatusFilter] = useState('All')
  const [expandedId,   setExpandedId]   = useState(null)
  const [liked,        setLiked]        = useState({})

  const filtered = REVIEW_FEED.filter(r => {
    const hubOk    = hubFilter    === 'All Hubs' || r.hub    === hubFilter
    const statusOk = statusFilter === 'All'      || r.status === statusFilter.toLowerCase()
    return hubOk && statusOk
  })

  return (
    <section style={{ padding: '80px 24px', position: 'relative' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 36 }}>
          <SectionLabel>Archive Review Feed</SectionLabel>
          <Headline style={{ marginBottom: 10 }}>Peer Reviews in Progress</Headline>
          <Sub>Community validators reviewing and grading submitted archive entries across all planetary hubs.</Sub>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {HUB_FILTERS.map(f => (
              <button key={f} onClick={() => setHubFilter(f)} style={{ padding: '6px 14px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: hubFilter === f ? 'rgba(79,195,247,0.16)' : isDark ? 'rgba(7,20,40,0.6)' : 'rgba(243,244,246,0.9)', border: `1px solid ${hubFilter === f ? 'rgba(79,195,247,0.38)' : isDark ? 'rgba(79,195,247,0.08)' : 'rgba(15,23,42,0.12)'}`, color: hubFilter === f ? '#4fc3f7' : isDark ? '#475569' : '#64748b', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '6px 14px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: statusFilter === f ? 'rgba(245,166,35,0.14)' : isDark ? 'rgba(7,20,40,0.6)' : 'rgba(243,244,246,0.9)', border: `1px solid ${statusFilter === f ? 'rgba(245,166,35,0.32)' : isDark ? 'rgba(79,195,247,0.08)' : 'rgba(15,23,42,0.12)'}`, color: statusFilter === f ? '#f5a623' : isDark ? '#475569' : '#64748b', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AnimatePresence>
            {filtered.map((rev, i) => {
              const isExp = expandedId === rev.id
              const hc    = HUB_COLORS[rev.hub] || '#4fc3f7'
              const rankColor = REVIEWER_RANKS.find(r => r.name === rev.rank)?.color || '#4fc3f7'
              return (
                <motion.div
                  key={rev.id}
                  layout
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.06 }}
                  className="sa-reviews-queue-card"
                >
                  {/* Hub accent line */}
                  <div style={{ height: 2, background: `linear-gradient(90deg, ${hc}55, transparent)` }} />

                  <div style={{ padding: '20px 24px' }}>
                    {/* Top row: reviewer + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(240,244,248,0.95)', border: `2px solid ${rankColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, boxShadow: `0 0 14px ${rankColor}18` }}>
                          {rev.avatar}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#f1f5f9' : '#111827' }}>{rev.reviewer}</span>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: `${rankColor}12`, border: `1px solid ${rankColor}22`, color: rankColor, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em' }}>{rev.rank}</span>
                          </div>
                          <div style={{ fontSize: 11, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{rev.xp.toLocaleString()} XP · {rev.date}</div>
                        </div>
                      </div>
                      <StatusBadge status={rev.status} />
                    </div>

                    {/* Entry info box */}
                    <div style={{ padding: '13px 16px', borderRadius: 12, marginBottom: 16, background: isDark ? 'rgba(2,4,8,0.55)' : 'rgba(243,244,246,0.9)', border: `1px solid ${hc}28` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#e2e8f0' : '#111827', marginBottom: 10, lineHeight: 1.4 }}>{rev.title}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <HubPill hub={rev.hub} />
                        <span className="sa-reviews-coord">◎ {rev.coord}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.14)', color: '#a78bfa' }}>{rev.layer}</span>
                        <span style={{ fontSize: 10, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{rev.sources.length} verified sources</span>
                      </div>
                    </div>

                    {/* Score trio */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {[
                        { label: 'Citation', value: rev.citationScore.toFixed(1), color: '#4fc3f7' },
                        { label: 'Clarity',  value: rev.clarityScore.toFixed(1),  color: '#34d399' },
                      ].map(sc => (
                        <div key={sc.label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(243,244,246,0.8)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.06)'}` }}>
                          <div style={{ fontSize: 9, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{sc.label}</div>
                          <div style={{ fontSize: 21, fontWeight: 900, color: sc.color, fontFamily: "'JetBrains Mono', monospace", filter: `drop-shadow(0 0 6px ${sc.color}50)` }}>{sc.value}</div>
                          <div style={{ fontSize: 9, color: isDark ? '#334155' : '#64748b' }}>/10</div>
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(243,244,246,0.8)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.06)'}` }}>
                        <div style={{ fontSize: 9, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Difficulty</div>
                        <StarDiff n={rev.difficulty} />
                      </div>
                    </div>

                    {/* Notes */}
                    <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#374151', lineHeight: 1.65, marginBottom: 14, display: isExp ? 'block' : '-webkit-box', WebkitLineClamp: isExp ? undefined : 2, WebkitBoxOrient: 'vertical', overflow: isExp ? 'visible' : 'hidden' }}>
                      {rev.notes}
                    </p>

                    {/* Expanded: sources */}
                    {isExp && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Verified Sources</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {rev.sources.map(d => (
                            <span key={d} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.16)', color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>✓ {d}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setLiked(l => ({ ...l, [rev.id]: !l[rev.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: liked[rev.id] ? 'rgba(79,195,247,0.1)' : 'transparent', border: `1px solid ${liked[rev.id] ? 'rgba(79,195,247,0.28)' : isDark ? 'rgba(79,195,247,0.08)' : 'rgba(15,23,42,0.1)'}`, color: liked[rev.id] ? '#4fc3f7' : isDark ? '#475569' : '#64748b', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
                        <ThumbsUp size={12} fill={liked[rev.id] ? '#4fc3f7' : 'none'} />
                        {rev.helpful + (liked[rev.id] ? 1 : 0)} helpful
                      </button>
                      <button onClick={() => setExpandedId(isExp ? null : rev.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: `1px solid ${isDark ? 'rgba(79,195,247,0.08)' : 'rgba(15,23,42,0.1)'}`, color: isDark ? '#475569' : '#64748b', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
                        {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isExp ? 'Collapse' : 'Full Review'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '56px 24px', color: isDark ? '#475569' : '#94a3b8' }}>
              <Search size={30} style={{ margin: '0 auto 12px', opacity: 0.25, display: 'block' }} />
              <p style={{ fontSize: 14 }}>No reviews match these filters.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   GAMIFICATION
   ═══════════════════════════════════════════════════════ */

const DEMO_XP         = 2840
const DEMO_RANK_IDX   = 3
const DEMO_NEXT_RANK  = REVIEWER_RANKS[DEMO_RANK_IDX + 1]
const DEMO_RANK       = REVIEWER_RANKS[DEMO_RANK_IDX]
const DEMO_XP_PROGRESS = Math.min(100, ((DEMO_XP - DEMO_RANK.min) / (DEMO_NEXT_RANK.min - DEMO_RANK.min)) * 100)

function GamificationSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <section style={{ padding: '80px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(124,58,237,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel centered>Reviewer Progression</SectionLabel>
          <Headline centered style={{ marginBottom: 12 }}>Earn Your Rank</Headline>
          <Sub centered>Build expertise, earn recognition, and advance from New Reviewer to Archive Legend.</Sub>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

          {/* Rank progress */}
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="sa-reviews-card" style={{ padding: 28 }}>
            <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 18 }}>Current Rank</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              <div style={{ width: 66, height: 66, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${DEMO_RANK.color}1e, ${DEMO_RANK.color}07)`, border: `2px solid ${DEMO_RANK.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: `0 0 22px ${DEMO_RANK.color}28` }}>
                {DEMO_RANK.icon}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: DEMO_RANK.color, marginBottom: 4, filter: `drop-shadow(0 0 8px ${DEMO_RANK.color}45)` }}>{DEMO_RANK.name}</div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: isDark ? '#f1f5f9' : '#111827' }}>
                  {DEMO_XP.toLocaleString()} <span style={{ fontSize: 12, color: isDark ? '#475569' : '#64748b', fontWeight: 400 }}>XP</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>To {DEMO_NEXT_RANK.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: DEMO_NEXT_RANK.color }}>{Math.round(DEMO_XP_PROGRESS)}%</span>
            </div>
            <div className="sa-reviews-progress-track" style={{ height: 8, marginBottom: 7 }}>
              <ProgressFill pct={DEMO_XP_PROGRESS} gradient={`linear-gradient(90deg, ${DEMO_RANK.color}, ${DEMO_NEXT_RANK.color})`} delay={0.4} />
            </div>
            <div style={{ fontSize: 10, color: '#475569', fontFamily: "'JetBrains Mono', monospace", marginBottom: 24 }}>
              {(DEMO_NEXT_RANK.min - DEMO_XP).toLocaleString()} XP to next rank
            </div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Reviews Done',    value: '47',   color: '#4fc3f7' },
                { label: 'Accuracy',        value: '94.2%',color: '#34d399' },
                { label: 'Review Streak',   value: '14d',  color: '#f5a623' },
                { label: 'Entries Approved',value: '38',   color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{ padding: '11px 13px', borderRadius: 10, background: isDark ? 'rgba(2,4,8,0.5)' : 'rgba(243,244,246,0.8)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.06)'}` }}>
                  <div style={{ fontSize: 9, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: s.color, fontFamily: "'JetBrains Mono', monospace", filter: `drop-shadow(0 0 6px ${s.color}45)` }}>{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Rank ladder */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="sa-reviews-card" style={{ padding: 28 }}>
            <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 20 }}>Rank Ladder</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {REVIEWER_RANKS.map((rank, i) => {
                const isActive = i === DEMO_RANK_IDX
                const isPast   = i < DEMO_RANK_IDX
                return (
                  <div key={rank.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: isActive ? `${rank.color}1c` : isPast ? `${rank.color}0e` : isDark ? 'rgba(2,4,8,0.6)' : 'rgba(243,244,246,0.8)', border: `1.5px solid ${isActive ? rank.color : isPast ? `${rank.color}38` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: isActive ? `0 0 14px ${rank.color}38` : 'none', transition: 'all 0.3s' }}>
                      {rank.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? rank.color : isPast ? (isDark ? '#64748b' : '#4b5563') : (isDark ? '#94a3b8' : '#1e293b'), filter: isActive ? `drop-shadow(0 0 6px ${rank.color}55)` : 'none' }}>{rank.name}</div>
                      <div style={{ fontSize: 9.5, color: isDark ? '#475569' : '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{rank.min === 0 ? '0' : rank.min.toLocaleString()}{rank.max === Infinity ? '+ XP' : `–${rank.max.toLocaleString()} XP`}</div>
                    </div>
                    {isPast   && <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />}
                    {isActive && <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: '2px 7px', borderRadius: 4, background: `${rank.color}14`, border: `1px solid ${rank.color}28`, color: rank.color, flexShrink: 0 }}>CURRENT</span>}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Achievement badges */}
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="sa-reviews-card" style={{ padding: 28 }}>
            <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 20 }}>Achievement Badges</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {ACHIEVEMENT_BADGES.map((badge, i) => (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, scale: 0.82 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className={badge.earned ? 'sa-reviews-ach-badge' : ''}
                  style={{ padding: '14px 12px', borderRadius: 14, textAlign: 'center', background: badge.earned ? `${badge.color}09` : 'rgba(2,4,8,0.4)', border: `1px solid ${badge.earned ? `${badge.color}22` : 'rgba(255,255,255,0.03)'}`, opacity: badge.earned ? 1 : 0.38, transition: 'all 0.3s' }}
                >
                  <div style={{ fontSize: 28, marginBottom: 7, filter: badge.earned ? `drop-shadow(0 0 10px ${badge.color}55)` : 'none' }}>{badge.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: badge.earned ? badge.color : (isDark ? '#94a3b8' : '#1e293b'), marginBottom: 3 }}>{badge.name}</div>
                  <div style={{ fontSize: 10, color: isDark ? '#475569' : '#64748b', lineHeight: 1.3 }}>{badge.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   ANALYTICS
   ═══════════════════════════════════════════════════════ */

const METRICS = [
  { label: 'Reviews This Week', value: 12,    suffix: '',   color: '#4fc3f7', Icon: Activity,     change: '+3' },
  { label: 'Approval Rate',     value: 94,    suffix: '%',  color: '#34d399', Icon: CheckCircle2, change: '+2%' },
  { label: 'Citation Pass Rate',value: 87,    suffix: '%',  color: '#a78bfa', Icon: BookOpen,     change: '+5%' },
  { label: 'Avg Difficulty',    value: 3.8,   suffix: '/5', color: '#f5a623', Icon: Target,       change: '0.2↑' },
  { label: 'Entries Upgraded',  value: 8,     suffix: '',   color: '#67e8f9', Icon: TrendingUp,   change: '+2' },
  { label: 'Impact Score',      value: 847,   suffix: '',   color: '#ff6b35', Icon: Zap,          change: '+47' },
]

const HUB_MAX = Math.max(...HUB_ANALYTICS.map(h => h.reviews))

function AnalyticsSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <section style={{ padding: '80px 24px', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 44 }}>
          <SectionLabel>Performance Analytics</SectionLabel>
          <Headline style={{ marginBottom: 10 }}>Your Review Impact</Headline>
          <Sub>Track citation pass rates, approval velocity, and contribution depth across every planetary hub.</Sub>
        </motion.div>

        {/* Metric grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="sa-reviews-card"
              style={{ padding: '18px 16px', textAlign: 'center' }}
            >
              <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: `radial-gradient(circle at 50% 0%, ${m.color}09, transparent 60%)`, pointerEvents: 'none' }} />
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.color}14`, border: `1px solid ${m.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <m.Icon size={16} color={m.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: m.color, fontFamily: "'JetBrains Mono', monospace", filter: `drop-shadow(0 0 9px ${m.color}48)`, lineHeight: 1, marginBottom: 5 }}>
                {m.value}{m.suffix}
              </div>
              <div style={{ fontSize: 10.5, color: isDark ? '#475569' : '#64748b', lineHeight: 1.3, marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>{m.change}</div>
            </motion.div>
          ))}
        </div>

        {/* Hub bar chart */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="sa-reviews-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 24 }}>Hub-by-Hub Contribution Map</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {HUB_ANALYTICS.map((h, i) => (
              <div key={h.hub} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 76, fontSize: 12, fontWeight: 600, color: h.color, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{h.hub}</div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(h.reviews / HUB_MAX) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.3, delay: i * 0.09, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${h.color}70, ${h.color})`, boxShadow: `0 0 8px ${h.color}38` }}
                  />
                </div>
                <div style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: 700, color: h.color, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{h.reviews}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   COMMUNITY
   ═══════════════════════════════════════════════════════ */

const ACTIVITY_STREAM = [
  { user: 'orbit_cartographer', action: 'approved',  entry: 'Biogas Digester Design',          hub: 'Earth Hub',   time: '2m ago',  color: '#34d399', icon: '✓' },
  { user: 'aurora_field',       action: 'reviewed',  entry: 'HF Radio Propagation Models',      hub: 'Mercury Hub', time: '7m ago',  color: '#4fc3f7', icon: '◎' },
  { user: 'neptune_waterlab',   action: 'flagged',   entry: 'Tidal Energy Converters',          hub: 'Neptune Hub', time: '14m ago', color: '#fbbf24', icon: '⟳' },
  { user: 'solar_factcheck',    action: 'approved',  entry: 'Photovoltaic Array Wiring',        hub: 'Sun Hub',     time: '22m ago', color: '#34d399', icon: '✓' },
  { user: 'red_horizon',        action: 'submitted', entry: 'Earthship Thermal Wrap',           hub: 'Mars Hub',    time: '31m ago', color: '#a78bfa', icon: '+' },
  { user: 'signal_bridge',      action: 'approved',  entry: 'LoRa Node Placement Strategy',     hub: 'Mercury Hub', time: '45m ago', color: '#34d399', icon: '✓' },
]

const MILESTONES = [
  { label: '2,000 entries approved',                done: true  },
  { label: '10,000 citation checks completed',      done: true  },
  { label: '90% community accuracy achieved',       done: true  },
  { label: 'All 9 planetary hubs have active reviewers', done: false },
  { label: '5,000 active reviewers worldwide',      done: false },
]

function CommunitySection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <section style={{ padding: '80px 24px', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel centered>Community Network</SectionLabel>
          <Headline centered style={{ marginBottom: 12 }}>Archive Guardians</Headline>
          <Sub centered>The community validators keeping the Solar Archive's knowledge accurate, trusted, and alive.</Sub>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

          {/* Top reviewers */}
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="sa-reviews-card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em' }}>Top Reviewers</div>
              <Trophy size={15} color="#f5a623" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {TOP_REVIEWERS.map((r, i) => {
                const rc = REVIEWER_RANKS.find(rk => rk.name === r.rank)?.color || '#4fc3f7'
                return (
                  <motion.div key={r.username} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(240,244,248,0.95)', border: `1.5px solid ${rc}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? 18 : 14 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : r.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#e2e8f0' : '#111827', marginBottom: 1 }}>{r.username}</div>
                      <div style={{ fontSize: 10, color: rc, fontFamily: "'JetBrains Mono', monospace" }}>{r.rank}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: rc, fontFamily: "'JetBrains Mono', monospace" }}>{r.xp.toLocaleString()}</div>
                      <div style={{ fontSize: 9.5, color: isDark ? '#334155' : '#64748b' }}>{r.reviews} reviews</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Weekly challenge + milestones */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="sa-reviews-card" style={{ padding: 28 }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em' }}>Weekly Challenge</div>
              <Zap size={15} color="#f5a623" />
            </div>

            <div style={{ padding: '16px', borderRadius: 12, marginBottom: 22, background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.14)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f5a623', marginBottom: 6 }}>Energy Hub Sprint</div>
              <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#374151', lineHeight: 1.5, marginBottom: 12 }}>Review 5 entries from the Sun Hub or Earth Hub energy domains this week. Bonus XP for citation-perfect reviews.</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>3 / 5 complete</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#f5a623' }}>+200 XP</div>
              </div>
              <div className="sa-reviews-progress-track" style={{ height: 5 }}>
                <ProgressFill pct={60} gradient="linear-gradient(90deg, #f5a623aa, #f5a623)" delay={0.4} />
              </div>
            </div>

            <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Community Milestones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MILESTONES.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: m.done ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.03)', border: `1px solid ${m.done ? 'rgba(52,211,153,0.38)' : 'rgba(255,255,255,0.05)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.done && <span style={{ fontSize: 10, color: '#34d399' }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: m.done ? (isDark ? '#64748b' : '#4b5563') : (isDark ? '#94a3b8' : '#1e293b'), textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.7 : (isDark ? 0.45 : 0.7) }}>{m.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Live activity */}
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="sa-reviews-card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 9.5, color: '#475569', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em' }}>Live Activity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#34d399', fontWeight: 700 }}>
                <div className="sa-reviews-live-dot" style={{ background: '#34d399', color: '#34d399' }} />
                Live
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ACTIVITY_STREAM.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: `${a.color}14`, border: `1px solid ${a.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: a.color, marginTop: 1 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#374151', lineHeight: 1.4 }}>
                      <span style={{ color: isDark ? '#e2e8f0' : '#111827', fontWeight: 600 }}>{a.user}</span>{' '}{a.action}{' '}
                      <span style={{ color: isDark ? '#cbd5e1' : '#374151', fontStyle: 'italic' }}>{a.entry}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <HubPill hub={a.hub} />
                      <span style={{ fontSize: 10, color: isDark ? '#334155' : '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{a.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════ */

export default function Reviews() {
  useTheme() // keeps theme context alive for global chrome

  return (
    <div className="sa-reviews-page">
      <HeroSection />
      <FeaturesSection />
      <ReviewFeedSection />
      <GamificationSection />
      <AnalyticsSection />
      <CommunitySection />
    </div>
  )
}
