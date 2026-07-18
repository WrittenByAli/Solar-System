import React, { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { useCommunityReviews } from '../../hooks/useCommunityReviews.js'
import {
  COMMUNITY_REVIEW_SORTS,
  difficultyFilterOptions,
  planetFilterOptions,
} from '../../utils/communityReviews.js'
import {
  CommunityReviewCard,
  CommunityReviewSkeleton,
  FilterPill,
  StickyFilterBar,
} from './SharedReviewUI.jsx'

const reveal = (reduce, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
})

function ReviewsEmptyState() {
  return (
    <div className="rv-feed-empty" data-testid="reviews-empty">
      <p className="rv-feed-empty__title">No community reviews yet</p>
      <p className="rv-feed-empty__body">
        When archive submissions earn three independent grades and are approved, reviewer feedback will appear here automatically.
      </p>
    </div>
  )
}

function ReviewsErrorState({ message, onRetry }) {
  return (
    <div className="rv-feed-error" role="alert" data-testid="reviews-error">
      <p className="rv-feed-error__title">Could not load reviews</p>
      <p className="rv-feed-error__body">{message}</p>
      <button type="button" className="rv-btn rv-btn--primary" onClick={onRetry}>
        <RefreshCw size={16} aria-hidden />
        Try again
      </button>
    </div>
  )
}

export default function CommunityReviewFeed() {
  const reduce = useReducedMotion()
  const [sort, setSort] = useState('newest')
  const [planetId, setPlanetId] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [reviewer, setReviewer] = useState('')
  const [search, setSearch] = useState('')

  const filters = useMemo(
    () => ({ planetId, difficulty, reviewerUsername: reviewer, search }),
    [planetId, difficulty, reviewer, search],
  )

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    connectionState,
    reload,
    loadMore,
  } = useCommunityReviews({ sort, filters })

  useEffect(() => {
    const title = 'Community Reviews — The SOLAR Archive'
    const description = 'Real peer-review feedback from archive validators on approved research entries across every hub and layer.'
    document.title = title

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)

    let script = document.getElementById('sa-reviews-jsonld')
    if (!script) {
      script = document.createElement('script')
      script.id = 'sa-reviews-jsonld'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      isPartOf: { '@type': 'WebSite', name: 'The SOLAR Archive' },
    })

    return () => {
      document.title = 'The SOLAR Archive'
    }
  }, [])

  const planetOptions = planetFilterOptions()
  const difficultyOptions = difficultyFilterOptions()

  return (
    <section id="sa-reviews-feed" className="rv-feed" data-testid="reviews-feed" aria-busy={loading}>
      <motion.header className="rv-feed__head" {...reveal(reduce, 0)}>
        <p className="rv-eyebrow">Peer review</p>
        <h2 className="rv-feed__title">What reviewers are saying</h2>
        <p className="rv-feed__subtitle">
          Live feedback from archive validators on approved entries — pulled directly from the review consensus workflow.
        </p>
        <p className="rv-feed__live" aria-live="polite">
          {connectionState === 'connected' ? (
            <><Wifi size={14} aria-hidden /> Live updates on</>
          ) : (
            <><WifiOff size={14} aria-hidden /> Reconnecting…</>
          )}
        </p>
      </motion.header>

      <StickyFilterBar className="rv-feed-filters">
        <div className="rv-feed-toolbar">
          <label className="rv-feed-search">
            <Search size={16} aria-hidden className="rv-feed-search__icon" />
            <input
              type="search"
              className="rv-feed-search__input"
              placeholder="Search title, reviewer, notes, planet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search community reviews"
              data-testid="reviews-search"
            />
          </label>

          <label className="rv-feed-sort">
            <span className="rv-feed-sort__label">Sort</span>
            <select
              className="rv-feed-sort__select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort reviews"
              data-testid="reviews-sort"
            >
              {COMMUNITY_REVIEW_SORTS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rv-feed-filters__group" role="group" aria-label="Filter by planet">
          {planetOptions.map((opt) => (
            <FilterPill
              key={opt.id}
              active={planetId === opt.id}
              onClick={() => setPlanetId(opt.id)}
              variant={opt.id === 'all' ? 'gold' : 'default'}
            >
              {opt.label}
            </FilterPill>
          ))}
        </div>

        <div className="rv-feed-filters__group" role="group" aria-label="Filter by difficulty">
          {difficultyOptions.map((opt) => (
            <FilterPill
              key={opt.id}
              active={difficulty === opt.id}
              onClick={() => setDifficulty(opt.id)}
            >
              {opt.label}
            </FilterPill>
          ))}
        </div>

        <label className="rv-feed-reviewer">
          <span className="rv-feed-reviewer__label">Reviewer</span>
          <input
            type="text"
            className="rv-feed-reviewer__input"
            placeholder="Filter by username"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            aria-label="Filter by reviewer username"
            data-testid="reviews-reviewer-filter"
          />
        </label>
      </StickyFilterBar>

      {loading && items.length === 0 ? (
        <div className="rv-feed__grid" data-testid="reviews-skeleton">
          {Array.from({ length: 6 }, (_, i) => (
            <CommunityReviewSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <ReviewsErrorState message={error} onRetry={reload} />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <ReviewsEmptyState />
      ) : null}

      {!error && items.length > 0 ? (
        <>
          <div className="rv-feed__grid">
            {items.map((rev) => (
              <CommunityReviewCard key={rev.id} rev={rev} />
            ))}
          </div>

          {hasMore ? (
            <div className="rv-feed__more">
              <button
                type="button"
                className="rv-btn rv-btn--ghost"
                onClick={loadMore}
                disabled={loadingMore}
                data-testid="reviews-load-more"
              >
                {loadingMore ? (
                  <><Loader2 size={16} className="rv-spin" aria-hidden /> Loading…</>
                ) : (
                  'Load more reviews'
                )}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
