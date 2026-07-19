import React from 'react'
import { Clock, MapPin, User } from 'lucide-react'
import { REVIEWERS_REQUIRED } from '../../constants/reviewWorkflow.js'
import { LAYER_SHORT_NAMES } from '../../utils/archiveLayerSpecs.js'
import { coordSlotLabel, timeAgo } from '../reviews/queue/queueUtils.js'

export default function QueueRail({
  items,
  selectedId,
  reviewsByEntry,
  usernamesById,
  planetTitleById,
  onSelect,
  disabled = false,
}) {
  return (
    <nav className="rq-rail" aria-label="Pending submissions" data-testid="rq-list">
      <div className="rq-rail__label">
        <span>Submission Queue</span>
        <span className="rq-rail__count">{items.length}</span>
      </div>
      <ul className="rq-list rq-list--rail">
        {items.map(({ entry, isStale }, idx) => {
          const reviews = reviewsByEntry[entry.id] || []
          const n = reviews.length
          const selected = entry.id === selectedId
          const layerName = LAYER_SHORT_NAMES[entry.layer] || 'Entry'
          const planetTitle = planetTitleById[String(entry.planet_id).toLowerCase()] || entry.planet_id
          const authorName = usernamesById[entry.submitted_by] || 'unknown'
          const pct = Math.round((n / REVIEWERS_REQUIRED) * 100)

          return (
            <li
              key={entry.id}
              className={`rq-mission sa-frost-card${selected ? ' rq-mission--sel' : ''}${isStale ? ' rq-mission--stale' : ''}`}
              data-testid="rq-queue-card"
            >
              <button
                type="button"
                className="rq-mission__btn"
                onClick={() => onSelect(entry.id, idx)}
                aria-pressed={selected}
                disabled={disabled && !selected}
                title={disabled && !selected ? 'Finish transmitting the current review first' : undefined}
              >
                <div className="rq-mission__top">
                  <span className="rq-mission__layer" title={layerName}>L{entry.layer}</span>
                  {isStale && (
                    <span className="rq-mission__stale">
                      <Clock size={11} aria-hidden />
                      Stale
                    </span>
                  )}
                  <span className="rq-mission__age">{timeAgo(entry.created_at)}</span>
                </div>

                <h3 className="rq-mission__title">{entry.title || 'Untitled'}</h3>

                <div className="rq-mission__meta">
                  <span className="rq-mission__meta-item">
                    <MapPin size={11} aria-hidden />
                    {planetTitle}
                  </span>
                  <span className="rq-mission__meta-item rq-mission__meta-item--mono">
                    {coordSlotLabel(entry)}
                  </span>
                  <span className="rq-mission__meta-item">
                    <User size={11} aria-hidden />
                    @{authorName}
                  </span>
                </div>

                <div className="rq-mission__progress">
                  <div className="rq-mission__progress-head">
                    <span>{n}/{REVIEWERS_REQUIRED} reviews</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="rq-mission__track" role="img" aria-label={`${n} of ${REVIEWERS_REQUIRED} reviews`}>
                    <div className="rq-mission__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function QueueRailSkeleton({ rows = 5 }) {
  return (
    <div className="rq-rail rq-rail--skeleton" aria-hidden="true">
      <div className="rq-rail__label">
        <span>Submission Queue</span>
      </div>
      <ul className="rq-list rq-list--rail">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="rq-mission rq-mission--skeleton sa-frost-card">
            <div className="rq-skeleton__bar" style={{ width: '30%', height: 12, marginBottom: 12 }} />
            <div className="rq-skeleton__bar" style={{ width: '85%', height: 18, marginBottom: 10 }} />
            <div className="rq-skeleton__bar" style={{ width: '60%', height: 10 }} />
          </li>
        ))}
      </ul>
    </div>
  )
}
