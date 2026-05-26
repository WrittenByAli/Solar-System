import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../App.jsx'
import SolarBrandA from '../SolarBrandA.jsx'
import { ARCHIVE_SOLAR_PUBLIC_URL } from '../../config/archiveFrontend.js'
import {
  PLANETARY_HUBS,
  STATS,
  STATEMENT_LINES,
  ARCHIVE_MECHANICS,
  FEATURES,
  HERO_BULLETS,
  DOMAIN_HIGHLIGHTS,
} from './homeContent.js'
import {
  SCROLL_CHAPTER_COUNT,
  SCROLL_FADE_RATIO,
  smoothstep,
} from './scrollChapters.js'

function getActiveChapter(scrollProgress) {
  const raw = scrollProgress * SCROLL_CHAPTER_COUNT
  const index = Math.min(SCROLL_CHAPTER_COUNT - 1, Math.max(0, Math.floor(raw)))
  const local = raw - index

  let opacity = 1
  if (local < SCROLL_FADE_RATIO) {
    opacity = smoothstep(local / SCROLL_FADE_RATIO)
  } else if (local > 1 - SCROLL_FADE_RATIO) {
    opacity = smoothstep((1 - local) / SCROLL_FADE_RATIO)
  }

  return { index, opacity: Math.max(0, Math.min(1, opacity)), local }
}

function PlanetOrb({ color, grad, size = 36 }) {
  return (
    <div
      className="scroll-story__orb"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${grad[0]}, ${grad[1]} 55%, ${grad[2]})`,
        boxShadow: `0 0 ${size * 0.45}px ${color}44`,
      }}
    />
  )
}

function Kicker({ children }) {
  return (
    <div className="scroll-story__kicker">
      <div className="scroll-story__kicker-line" />
      <span>{children}</span>
    </div>
  )
}

function HeroContent({ scrollProgress, isDark, navigate, local }) {
  const titleColor = isDark ? '#f8fafc' : '#111827'
  const exit = Math.max(0, (local - 0.72) / 0.28)

  const lineStyle = (i) => ({
    opacity: 1 - exit * 0.95,
    transform: `
      translateY(${-exit * (28 + i * 14)}px)
      translateX(${(i - 1) * exit * 40}px)
      scale(${1 - exit * 0.05})
    `,
    filter: exit > 0.35 ? `blur(${exit * 2.5}px)` : 'none',
  })

  const bodyStyle = {
    opacity: Math.max(0, 1 - exit * 1.1),
    transform: `translateY(${exit * -20}px)`,
  }

  return (
    <div className="scroll-story__layer scroll-story__layer--hero">
      <div className="scroll-story__hero-layout">
        <article className="scroll-story__hero-card">
          <div style={bodyStyle}>
            <Kicker>Coordinate Archive · 10 Domains · 8 Layers</Kicker>
          </div>

          <h1 className="scroll-story__mega-title" aria-label="The Solar Archive">
            <span className="scroll-story__mega-row scroll-story__mega-line" style={lineStyle(0)}>
              <span className="scroll-story__mega-the">THE</span>
              <span className="scroll-story__mega-solar">
                SOL
                <SolarBrandA
                  gradientStops={[
                    { offset: '0%', color: titleColor },
                    { offset: '55%', color: titleColor },
                    { offset: '100%', color: titleColor },
                  ]}
                  className="-mx-[0.02em]"
                />
                R
              </span>
            </span>
            <span className="scroll-story__mega-line" style={lineStyle(2)}>ARCHIVE</span>
          </h1>

          <div className="scroll-story__hero-body" style={bodyStyle}>
            <p className="scroll-story__hero-desc">
              Sustainable Off-grid Living-labs for Autonomy and Research —
              a coordinate knowledge archive spanning 10 planetary domains, 8 zoom layers,
              community review, citations, and spatial discovery.
            </p>

            <div className="scroll-story__hero-bullets">
              {HERO_BULLETS.map((item) => (
                <div key={item} className="scroll-story__hero-bullet">{item}</div>
              ))}
            </div>

            <div className="scroll-story__hero-actions">
              <button type="button" className="scroll-story__btn scroll-story__btn--solid" onClick={() => navigate('/map')}>
                Explore Map <ArrowRight size={13} />
              </button>
              <button type="button" className="scroll-story__btn scroll-story__btn--outline" onClick={() => navigate('/create-archive')}>
                Start Archive <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </article>
        <div className="scroll-story__hero-visual" aria-hidden="true" />
      </div>
    </div>
  )
}

function StatsContent() {
  return (
    <div className="scroll-story__layer scroll-story__layer--centered scroll-story__layer--long">
      <div className="scroll-story__stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="scroll-story__stat">
            <div className="scroll-story__stat-num">{s.num}</div>
            <div className="scroll-story__stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatementContent() {
  return (
    <div className="scroll-story__layer scroll-story__layer--centered scroll-story__layer--long">
      <div className="scroll-story__panel scroll-story__panel--fit">
        <Kicker>What is SOLAR</Kicker>
        <div className="scroll-story__statement">
          {STATEMENT_LINES.map((line) => (
            <div
              key={line.text}
              className={`scroll-story__statement-line ${line.accent ? 'scroll-story__statement-line--accent' : ''}`}
            >
              {line.text}
            </div>
          ))}
        </div>
        <div className="scroll-story__highlights-grid">
          {DOMAIN_HIGHLIGHTS.map((d) => (
            <article key={d.label} className="scroll-story__highlight-card">
              <span className="scroll-story__highlight-label" style={{ color: d.color }}>{d.label}</span>
              <p>{d.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function MechanicsContent() {
  return (
    <div className="scroll-story__layer scroll-story__layer--centered scroll-story__layer--long">
      <div className="scroll-story__panel scroll-story__panel--fit">
        <Kicker>Archive Mechanics</Kicker>
        <h2 className="scroll-story__section-title scroll-story__section-title--compact">
          How the archive becomes a research universe.
        </h2>
        <p className="scroll-story__section-lead">
          The SOLAR Archive combines a visual map, a layered zoom system, structured submissions,
          and community review.
        </p>
        <div className="scroll-story__mechanics-grid">
          {ARCHIVE_MECHANICS.map((item, i) => (
            <article key={item.title} className="scroll-story__mechanics-card">
              <div className="scroll-story__mechanics-accent" data-accent={i % 2 ? 'blue' : 'gold'} />
              <span className="scroll-story__mechanics-kicker" data-accent={i % 2 ? 'blue' : 'gold'}>{item.kicker}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function HubsContent({ onEnter, navigate }) {
  return (
    <div className="scroll-story__layer scroll-story__layer--centered scroll-story__layer--long">
      <div className="scroll-story__panel scroll-story__panel--fit">
        <div className="scroll-story__hubs-header">
          <div>
            <Kicker>Research Domains</Kicker>
            <h2 className="scroll-story__section-title scroll-story__section-title--sm">10 Planetary Hubs</h2>
          </div>
          <button type="button" className="scroll-story__btn scroll-story__btn--outline scroll-story__btn--sm" onClick={onEnter}>
            View all <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="scroll-story__hubs-grid">
          {PLANETARY_HUBS.map((d) => (
            <motion.button
              key={d.id}
              type="button"
              className="scroll-story__hub-card"
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/archive/${d.id}`)}
            >
              <PlanetOrb color={d.color} grad={d.grad} size={32} />
              <div>
                <div className="scroll-story__hub-name">{d.planet}</div>
                <div className="scroll-story__hub-domain">{d.domain}</div>
              </div>
              <div className="scroll-story__hub-accent" style={{ background: d.color }} />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FeaturesContent() {
  return (
    <div className="scroll-story__layer scroll-story__layer--centered scroll-story__layer--long">
      <div className="scroll-story__panel scroll-story__panel--fit">
        <Kicker>How It Works</Kicker>
        <div className="scroll-story__features-grid">
          {FEATURES.map((item) => (
            <article key={item.n} className="scroll-story__feature-card">
              <div className="scroll-story__feature-num">{item.n}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinalContent({ navigate }) {
  return (
    <div className="scroll-story__layer scroll-story__layer--final scroll-story__layer--long">
      <div className="scroll-story__final-inner">
        <h2 className="scroll-story__final-mega">
          <span>Start exploring</span>
          <span>the archive</span>
          <span className="scroll-story__final-mega--accent">today.</span>
        </h2>
        <div className="scroll-story__hero-actions">
          <button type="button" className="scroll-story__btn scroll-story__btn--solid" onClick={() => navigate('/directory')}>
            Browse Directory <ArrowRight size={13} />
          </button>
          <button type="button" className="scroll-story__btn scroll-story__btn--outline" onClick={() => navigate('/leaderboard')}>
            Leaderboard <ArrowUpRight size={13} />
          </button>
        </div>
        <footer className="scroll-story__footer">
          <span>Solar Foundation Archive</span>
          <a href={ARCHIVE_SOLAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer">archive.solar ↗</a>
        </footer>
      </div>
    </div>
  )
}

export default function ScrollStoryUI({ scrollProgress, onEnter }) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { index, opacity, local } = getActiveChapter(scrollProgress)

  const enterY = (1 - opacity) * 14

  const chapters = [
    <HeroContent key="hero" scrollProgress={scrollProgress} isDark={isDark} navigate={navigate} local={local} />,
    <StatsContent key="stats" />,
    <StatementContent key="statement" />,
    <MechanicsContent key="mechanics" />,
    <HubsContent key="hubs" onEnter={onEnter} navigate={navigate} />,
    <FeaturesContent key="features" />,
    <FinalContent key="final" navigate={navigate} />,
  ]

  const showMarquee = index >= 1 && index <= 5

  return (
    <div className={`scroll-story ${isDark ? 'scroll-story--dark' : 'scroll-story--light'}`}>
      <div
        className="scroll-story__stage"
        style={{
          opacity,
          transform: `translate3d(0, ${enterY}px, 0)`,
          visibility: opacity > 0.02 ? 'visible' : 'hidden',
        }}
      >
        {chapters[index]}
      </div>

      {showMarquee && (
        <div className="scroll-story__marquee" style={{ opacity: opacity * 0.65 }} aria-hidden="true">
          <div className="scroll-story__marquee-track">
            {[...PLANETARY_HUBS, ...PLANETARY_HUBS].map((d, i) => (
              <span key={i} className="scroll-story__marquee-item">
                <span className="scroll-story__marquee-dot" style={{ background: d.color }} />
                {d.planet} — {d.domain}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
