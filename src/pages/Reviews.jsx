import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import LazyVantaFogBackground from '../components/solar-archive/LazyVantaFogBackground.jsx'
import { useTheme } from '../App.jsx'
import { ClipboardCheck, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import CommunityReviewFeed from '../components/reviews/CommunityReviewFeed.jsx'
import '../styles/solar-reviews.css'

const INTRO_LINES = [
  { text: 'Every entry earns', accent: false },
  { text: 'three independent grades.', accent: true },
  { text: 'Before research joins the live archive.', accent: false },
]

const reveal = (reduce, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 44 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.45 },
  transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] },
})

function ScrollIntroSection({ canReview }) {
  const reduce = useReducedMotion()

  return (
    <section className="rv-scroll-intro" data-testid="reviews-intro">
      <div className="rv-scroll-intro__inner">
        <div className="rv-scroll-intro__statement">
          {INTRO_LINES.map((line, i) => (
            <motion.p
              key={line.text}
              className={`rv-scroll-intro__line${line.accent ? ' rv-scroll-intro__line--accent' : ''}`}
              {...reveal(reduce, i * 0.14)}
            >
              {line.text}
            </motion.p>
          ))}
        </div>

        <motion.p className="rv-scroll-intro__lede" {...reveal(reduce, 0.42)}>
          Fact-check citations, rate difficulty, and confirm coordinate placement across the archive grid.
        </motion.p>

        <motion.div className="rv-scroll-intro__actions" {...reveal(reduce, 0.56)}>
          {canReview ? (
            <Link to="/review-queue" className="rv-btn rv-btn--primary" data-testid="reviews-cta-queue">
              <ClipboardCheck size={16} aria-hidden />
              Review Queue
            </Link>
          ) : (
            <Link to="/leaderboard" className="rv-btn rv-btn--primary" data-testid="reviews-cta-leaderboard">
              <Trophy size={16} aria-hidden />
              Reviewer Access
            </Link>
          )}
          <a
            href="#sa-reviews-feed"
            className="rv-btn rv-btn--ghost"
            data-testid="reviews-cta-feed"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('sa-reviews-feed')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
            }}
          >
            Browse reviews
          </a>
        </motion.div>
      </div>
    </section>
  )
}

export default function Reviews() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { canAccessReviewerQueue } = useAuth()
  const [sceneReveal, setSceneReveal] = useState(0)

  useEffect(() => {
    window.scrollTo(0, 0)
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

  return (
    <div className={`rv-page${isDark ? ' rv-page--dark' : ' rv-page--light'}`} data-testid="reviews-page">
      <LazyVantaFogBackground
        isDark={isDark}
        entryReveal={sceneReveal}
        className="rv-page__vanta"
      />
      <div
        className="rv-page__veil"
        style={{ opacity: Math.max(0, (isDark ? 0.14 : 0.1) - sceneReveal * (isDark ? 0.22 : 0.16)) }}
        aria-hidden="true"
      />
      <div
        className="rv-page__vignette"
        style={{ opacity: isDark ? 0.2 + sceneReveal * 0.06 : 0.14 + sceneReveal * 0.04 }}
        aria-hidden="true"
      />
      <div className="rv-page__inner" style={{ opacity: sceneReveal }}>
        <ScrollIntroSection canReview={canAccessReviewerQueue} />
        <CommunityReviewFeed />
      </div>
    </div>
  )
}
