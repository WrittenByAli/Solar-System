import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Star } from 'lucide-react'
import AvatarCircle from '../AvatarCircle.jsx'
import { hubColor } from './hubColors.js'

export function formatReviewerName(username) {
  return (username || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function scoreToStars(citation, clarity) {
  const avg = (Number(citation) + Number(clarity)) / 2
  return Math.max(1, Math.min(5, Math.round((avg / 10) * 5)))
}

export function StarRating({ count = 5, className = '' }) {
  const filled = Math.max(0, Math.min(5, count))
  return (
    <div className={`rv-star-rating ${className}`.trim()} aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          strokeWidth={0}
          fill={i < filled ? 'currentColor' : 'transparent'}
          className={i < filled ? 'rv-star-rating__star rv-star-rating__star--on' : 'rv-star-rating__star'}
          aria-hidden
        />
      ))}
    </div>
  )
}

export function ReviewTestimonialCard({ rev, className = '' }) {
  const reduce = useReducedMotion()
  const displayName = formatReviewerName(rev.reviewer)
  const stars = scoreToStars(rev.citationScore, rev.clarityScore)
  const hub = hubColor(rev.hub)

  return (
    <motion.article
      className={`rv-testimonial-card sa-frost-card${className ? ` ${className}` : ''}`}
      data-testid="review-feed-card"
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <StarRating count={stars} className="rv-testimonial-card__stars" />

      <blockquote className="rv-testimonial-card__quote">
        &ldquo;{rev.notes}&rdquo;
      </blockquote>

      <footer className="rv-testimonial-card__author">
        <AvatarCircle
          username={rev.reviewer}
          size={40}
          gradient={`linear-gradient(135deg, color-mix(in srgb, ${hub} 55%, #0f172a), color-mix(in srgb, ${hub} 28%, #020617))`}
          ringColor={`color-mix(in srgb, ${hub} 45%, transparent)`}
        />
        <div className="rv-testimonial-card__identity">
          <strong className="rv-testimonial-card__name">{displayName}</strong>
          <span className="rv-testimonial-card__role">{rev.rank}</span>
        </div>
      </footer>
    </motion.article>
  )
}

export function SectionEyebrow({ children, className = '' }) {
  return <p className={`rv-eyebrow ${className}`.trim()}>{children}</p>
}

export function HubPill({ hub, className = '' }) {
  const c = hubColor(hub)
  return (
    <span className={`rv-hub-pill ${className}`.trim()} style={{ '--hub-c': c }}>
      {hub}
    </span>
  )
}

export function LayerChip({ layer, className = '' }) {
  return <span className={`rv-layer-chip ${className}`.trim()}>{layer}</span>
}

export function CoordLabel({ coord, className = '' }) {
  return <span className={`rv-coord ${className}`.trim()}>◎ {coord}</span>
}

export function RankBadge({ rank, color, className = '' }) {
  return (
    <span className={`rv-rank-badge ${className}`.trim()} style={{ '--rank-c': color || 'var(--sa-accent-gold)' }}>
      {rank}
    </span>
  )
}

export function ReviewScoreStrip({ citation, clarity, difficulty, className = '' }) {
  return (
    <div className={`rv-score-strip ${className}`.trim()}>
      <div className="rv-score-strip__item">
        <span className="rv-score-strip__label">Citation</span>
        <span className="rv-score-strip__val rv-score-strip__val--gold">{citation.toFixed(1)}</span>
      </div>
      <div className="rv-score-strip__item">
        <span className="rv-score-strip__label">Clarity</span>
        <span className="rv-score-strip__val rv-score-strip__val--green">{clarity.toFixed(1)}</span>
      </div>
      <div className="rv-score-strip__item">
        <span className="rv-score-strip__label">Difficulty</span>
        <span className="rv-score-strip__val rv-score-strip__val--gold">{difficulty}/5</span>
      </div>
    </div>
  )
}

export function ProgressToRank({ pct, currentRank, nextRank, delay = 0 }) {
  return (
    <div className="rv-rank-progress">
      <div className="rv-rank-progress__labels">
        <span>{currentRank}</span>
        {nextRank && <span className="rv-rank-progress__next">→ {nextRank}</span>}
      </div>
      <div className="rv-rank-progress__track">
        <motion.div
          className="rv-rank-progress__fill"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function StatusBadge({ status, className = '' }) {
  const map = {
    approved: { cls: 'rv-status--ok', label: 'Approved' },
    revision: { cls: 'rv-status--warn', label: 'Revision' },
    pending: { cls: 'rv-status--pending', label: 'Pending' },
  }
  const s = map[status] || map.pending
  return <span className={`rv-status ${s.cls}${className ? ` ${className}` : ''}`}>{s.label}</span>
}

export function StickyFilterBar({ children, className = '' }) {
  return (
    <div className={`rv-filter-bar ${className}`.trim()} role="toolbar">
      {children}
    </div>
  )
}

export function FilterPill({ active, onClick, count, children, variant = 'default' }) {
  return (
    <button
      type="button"
      className={`rv-filter-pill rv-filter-pill--${variant}${active ? ' rv-filter-pill--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
      {count != null && <span className="rv-filter-pill__count">{count}</span>}
    </button>
  )
}
