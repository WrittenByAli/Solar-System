import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ChevronDown, Layers, Loader2, Send,
  ShieldCheck, ShieldX, Star, Timer,
} from 'lucide-react'
import {
  REVIEW_RECOMMENDATION_MAX_CHARS,
  POINTS_PER_REVIEW_COMPLETED,
  REVIEWERS_REQUIRED,
} from '../../../constants/reviewWorkflow.js'
import { LAYER_SHORT_NAMES } from '../../../utils/archiveLayerSpecs.js'
import { DIFFICULTY_WORDS, readingMinutes, parseSegments, coordSlotLabel } from './queueUtils.js'

export function ReviewProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="rq-prog" role="img" aria-label={`${done} of ${total} reviews complete`}>
      <span className="rq-prog__label">{done}/{total} reviews</span>
      <div className="rq-prog__track">
        <div className="rq-prog__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SegmentBlock({ seg, defaultOpen = false, reduceMotion }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <article className={`rq-segment${open ? ' rq-segment--open' : ''}`}>
      <button
        type="button"
        className="rq-segment__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{seg.title}</span>
        <ChevronDown size={16} className={open ? 'rq-segment__chev--open' : ''} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="rq-segment__body"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <p>{seg.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

export function ReviewEntryPanel({
  entry,
  reviews,
  usernamesById,
  baseEntry,
  planetTitle,
  isStale = false,
  factOk,
  setFactOk,
  difficulty,
  setDifficulty,
  notes,
  setNotes,
  notesOpen,
  setNotesOpen,
  submitErr,
  submitting,
  onSubmit,
  reduceMotion,
  compact = false,
}) {
  const n = reviews.length
  const authorName = usernamesById[entry.submitted_by] || 'unknown'
  const segments = parseSegments(entry)
  const layerName = LAYER_SHORT_NAMES[entry.layer] || 'Entry'
  const showSegments = segments.length > 0

  return (
    <div className={`rq-console${compact ? ' rq-console--compact' : ''}`} data-testid="rq-detail-panel">
      <header className="rq-console__head">
        <div className="rq-console__kicker">
          <span>Inspection console</span>
          <span className="rq-console__progress-pill">{n}/{REVIEWERS_REQUIRED} consensus</span>
        </div>
        <h2 className="rq-console__title">{entry.title || 'Untitled'}</h2>
        <div className="rq-console__meta">
          <span className="rq-chip rq-chip--layer">L{entry.layer} · {layerName}</span>
          <span className="rq-chip">{planetTitle}</span>
          <span className="rq-chip rq-chip--mono">{coordSlotLabel(entry)}</span>
          <span className="rq-chip">@{authorName}</span>
          {isStale && <span className="rq-chip rq-chip--stale">Stale</span>}
        </div>
        {baseEntry && (
          <p className="rq-console__deepen">
            <Layers size={13} aria-hidden />
            Deepens <strong>{baseEntry.title}</strong> (L{baseEntry.layer})
          </p>
        )}
      </header>

      {(entry.short_summary || entry.content) && (
        <section className="rq-console__read">
          <div className="rq-console__read-top">
            <span className="rq-console__section-label">Summary</span>
            <span className="rq-console__read-time">
              <Timer size={12} aria-hidden />
              ~{readingMinutes(entry.short_summary || '', entry.content || '')} min
            </span>
          </div>
          {entry.short_summary && (
            <p className="rq-console__summary">{entry.short_summary}</p>
          )}
          {entry.content && (
            <div className="rq-console__detail">{entry.content}</div>
          )}
        </section>
      )}

      {showSegments && (
        <section className="rq-console__segments">
          <span className="rq-console__section-label">Research sections · L{entry.layer}</span>
          {segments.map((seg, i) => (
            <SegmentBlock
              key={`${seg.title}-${i}`}
              seg={seg}
              defaultOpen={i === 0}
              reduceMotion={reduceMotion}
            />
          ))}
        </section>
      )}

      <p className="rq-console__claim">
        Author difficulty claim: <strong>{entry.difficulty ?? '—'}/5</strong>
        {entry.difficulty != null && (
          <span className="rq-console__claim-word"> · {DIFFICULTY_WORDS[entry.difficulty] || ''}</span>
        )}
      </p>

      {n > 0 && (
        <section className="rq-console__priors">
          <span className="rq-console__section-label">Previous reviewers</span>
          <div className="rq-prior-chips">
            {reviews.map((r) => {
              const name = usernamesById[r.reviewer_id] || 'unknown'
              return (
                <div
                  key={r.id}
                  className={`rq-prior-chip${r.fact_check_pass ? ' rq-prior-chip--pass' : ' rq-prior-chip--fail'}`}
                  title={r.notes?.trim() || undefined}
                >
                  <span className="rq-prior-chip__av">{name[0]?.toUpperCase() || '?'}</span>
                  <span className="rq-prior-chip__name">@{name}</span>
                  <span className="rq-prior-chip__verdict">
                    {r.fact_check_pass ? 'Pass' : 'Fail'} · {r.difficulty}/5
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <form onSubmit={onSubmit} className="rq-form" data-testid="rq-grade-form">
        <fieldset className="rq-fact-chips">
          <legend className="rq-form__label">Fact-check verdict</legend>
          <div className="rq-fact-seg">
            <button
              type="button"
              className={`rq-fact-chip${factOk ? ' rq-fact-chip--pass' : ''}`}
              aria-pressed={factOk}
              onClick={() => setFactOk(true)}
            >
              <ShieldCheck size={18} aria-hidden />
              Pass
            </button>
            <button
              type="button"
              className={`rq-fact-chip${!factOk ? ' rq-fact-chip--fail' : ''}`}
              aria-pressed={!factOk}
              onClick={() => setFactOk(false)}
            >
              <ShieldX size={18} aria-hidden />
              Fail
            </button>
          </div>
        </fieldset>

        <div className="rq-stars-wrap">
          <span className="rq-form__label" id={`rq-diff-label-${entry.id}`}>
            Difficulty · {DIFFICULTY_WORDS[difficulty]}
          </span>
          <div className="rq-stars" role="radiogroup" aria-labelledby={`rq-diff-label-${entry.id}`}>
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={difficulty === d}
                aria-label={`${d} · ${DIFFICULTY_WORDS[d]}`}
                className={`rq-star${difficulty >= d ? ' rq-star--on' : ''}${difficulty === d ? ' rq-star--active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                <Star size={22} fill={difficulty >= d ? 'currentColor' : 'none'} aria-hidden />
                <span className="rq-star__num">{d}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rq-notes-wrap">
          <button type="button" className="rq-notes-toggle" onClick={() => setNotesOpen((o) => !o)}>
            {notesOpen ? 'Hide notes' : 'Add notes (optional)'}
            <ChevronDown size={14} className={notesOpen ? 'rq-notes-toggle--open' : ''} aria-hidden />
          </button>
          {notesOpen && (
            <>
              <textarea
                id={`rq-notes-${entry.id}`}
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                rows={4}
                maxLength={REVIEW_RECOMMENDATION_MAX_CHARS}
                className="rq-notes"
                placeholder="Citations, clarity edits, or factual fixes for the author…"
              />
              <div className="rq-notes__count">{notes.length}/{REVIEW_RECOMMENDATION_MAX_CHARS}</div>
            </>
          )}
        </div>

        {submitErr && (
          <div className="rq-error" role="alert">
            <AlertTriangle size={14} aria-hidden /> {submitErr}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          className="rq-submit"
          title={`+${POINTS_PER_REVIEW_COMPLETED} XP`}
          whileHover={reduceMotion || submitting ? undefined : { scale: 1.015, y: -1 }}
          whileTap={reduceMotion || submitting ? undefined : { scale: 0.985 }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="rq-submit__spin" aria-hidden />
              Transmitting…
            </>
          ) : (
            <>
              <Send size={16} aria-hidden />
              Submit Review · +{POINTS_PER_REVIEW_COMPLETED} pts
            </>
          )}
        </motion.button>
      </form>
    </div>
  )
}
