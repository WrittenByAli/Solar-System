import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../App.jsx'
import { WORD_SPRING } from './scrollRevealShared.jsx'
import { ARCHIVE_MECHANICS } from './homeContent.js'
import SolarBrandA from '../SolarBrandA.jsx'
import ScrollTextReveal from './ScrollTextReveal.jsx'
import ScrollStatsReveal from './ScrollStatsReveal.jsx'
import ScrollFeaturesReveal from './ScrollFeaturesReveal.jsx'
import ScrollHubsReveal from './ScrollHubsReveal.jsx'
import ScrollCtaReveal from './ScrollCtaReveal.jsx'
import {
  SCROLL_CHAPTER_COUNT,
  getChapterMeta,
  getChapterFromProgress,
  getChapterFromIndex,
  smoothstep,
} from './scrollChapters.js'
import { chapterIndexToProgress } from '../../utils/homeChapterScroll.js'

/** Fade/slide content in as user scrolls within a chapter (0 = hidden). */
function revealStyle(local, start = 0.06, span = 0.22, reduceMotion = false) {
  const t = smoothstep(Math.max(0, Math.min(1, (local - start) / span)))
  if (reduceMotion) return { opacity: t, transform: 'none' }
  return {
    opacity: t,
    transform: `translateY(${(1 - t) * 18}px)`,
  }
}

/** Scene backdrop motion — does not reveal text (scroll-only). */
function chapterMotion(opacity, local, reduceMotion, sceneReveal = 1) {
  if (reduceMotion) {
    return { opacity: opacity * sceneReveal, transform: 'none', filter: 'none' }
  }
  const enter = 1 - opacity
  const sceneLift = (1 - sceneReveal) * 18
  const driftY = enter * 36 - (local > 0.78 ? (local - 0.78) / 0.22 * 18 : 0) + sceneLift
  const scale = (0.96 + opacity * 0.04) * (0.99 + sceneReveal * 0.01)
  const blur = enter * 8
  return {
    opacity: opacity * sceneReveal,
    transform: `translate3d(0, ${driftY}px, 0) scale(${scale})`,
    filter: blur > 0.4 ? `blur(${blur}px)` : 'none',
  }
}

function Kicker({ children, style }) {
  return (
    <div className="scroll-story__kicker" style={style}>
      <div className="scroll-story__kicker-line" />
      <span>{children}</span>
    </div>
  )
}

function ChapterRail({ index, local, scrollProgress }) {
  if (scrollProgress < 0.02) return null

  const current = String(index + 1).padStart(2, '0')
  const total = String(SCROLL_CHAPTER_COUNT).padStart(2, '0')
  const fill = Math.round(((index + local) / SCROLL_CHAPTER_COUNT) * 100)

  return (
    <div className="scroll-story__rail" aria-hidden="true">
      <span className="scroll-story__rail-num">{current}</span>
      <div className="scroll-story__rail-track">
        <div className="scroll-story__rail-fill" style={{ height: `${Math.min(100, Math.max(0, fill))}%` }} />
      </div>
      <span>{total}</span>
    </div>
  )
}

function BrandLetter({ children, index, reveal, reduceMotion, className = '' }) {
  const show = reveal > 0.02

  return (
    <span className={`scroll-story__brand-letter-wrap ${className}`.trim()} aria-hidden="true">
      <motion.span
        className="scroll-story__brand-letter"
        initial={reduceMotion ? false : { y: '112%', opacity: 0 }}
        animate={show ? { y: '0%', opacity: 1 } : { y: '112%', opacity: 0 }}
        transition={{
          ...WORD_SPRING,
          delay: reduceMotion ? 0 : (show ? index * 0.048 * reveal : 0),
        }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function HeroBrandTitle({ local, reduceMotion }) {
  const letterReveal = Math.max(0, Math.min(1, (local - 0.1) / 0.9))

  return (
    <h1 className="scroll-story__brand" aria-label="The Solar Archive">
      <span className="scroll-story__brand-the">
        <BrandLetter index={0} reveal={letterReveal} reduceMotion={reduceMotion}>T</BrandLetter>
        <BrandLetter index={1} reveal={letterReveal} reduceMotion={reduceMotion}>h</BrandLetter>
        <BrandLetter index={2} reveal={letterReveal} reduceMotion={reduceMotion}>e</BrandLetter>
      </span>
      <span className="scroll-story__brand-mark scroll-story__brand-word">
        <BrandLetter index={3} reveal={letterReveal} reduceMotion={reduceMotion}>S</BrandLetter>
        <BrandLetter index={4} reveal={letterReveal} reduceMotion={reduceMotion}>O</BrandLetter>
        <BrandLetter index={5} reveal={letterReveal} reduceMotion={reduceMotion}>L</BrandLetter>
        <BrandLetter
          index={6}
          reveal={letterReveal}
          reduceMotion={reduceMotion}
          className="scroll-story__brand-letter-a"
        >
          {/* Inline SVG glyph (star-cut A), NOT a font character: renders
              pixel-identically on every device regardless of installed fonts.
              The old font+CSS-mask approach depended on Impact (Windows-only)
              and broke on Android/iOS/Linux. Same component as the navbar
              logo's A, so the brand mark is now consistent everywhere. */}
          <SolarBrandA />
        </BrandLetter>
        <BrandLetter index={7} reveal={letterReveal} reduceMotion={reduceMotion}>R</BrandLetter>
      </span>
      <span className="scroll-story__brand-archive">
        {'Archive'.split('').map((ch, i) => (
          <BrandLetter key={ch + i} index={8 + i} reveal={letterReveal} reduceMotion={reduceMotion}>
            {ch}
          </BrandLetter>
        ))}
      </span>
    </h1>
  )
}

function HeroContent({ navigate, local, snapChapter = false }) {
  const reduceMotion = useReducedMotion()
  const exit = snapChapter ? 0 : Math.max(0, (local - 0.72) / 0.28)

  const fadeOut = (base) => ({
    opacity: Math.max(0, base.opacity * (1 - exit * 1.15)),
    transform: reduceMotion ? 'none' : `${base.transform} translateY(${exit * -20}px)`,
  })

  const kicker = fadeOut(revealStyle(local, 0.08, 0.2, reduceMotion))
  const actions = fadeOut(revealStyle(local, 0.52, 0.26, reduceMotion))
  const hint = fadeOut(revealStyle(local, 0.62, 0.22, reduceMotion))

  return (
    <div className={`scroll-story__layer scroll-story__layer--hero${local < 0.04 ? ' scroll-story__layer--fog-only' : ''}`}>
      <div className="scroll-story__hero">
        <div style={kicker}>
          <Kicker>Coordinate knowledge network</Kicker>
        </div>

        <HeroBrandTitle local={local} reduceMotion={reduceMotion} />

        <div
          className="scroll-story__hero-actions"
          style={{
            ...actions,
            pointerEvents: actions.opacity > 0.35 ? 'auto' : 'none',
          }}
        >
          <button type="button" className="scroll-story__btn scroll-story__btn--solid" onClick={() => navigate('/map')}>
            Enter the map <ArrowRight size={14} />
          </button>
          <button type="button" className="scroll-story__btn scroll-story__btn--ghost" onClick={() => navigate('/deploy')}>
            Deploy your own <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      <div className="scroll-story__scroll-hint" style={hint} aria-hidden="true">
        <span>Scroll through space</span>
        <motion.span
          animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="scroll-story__scroll-hint-arrow"
        />
      </div>
    </div>
  )
}

const REVEAL_COMPONENTS = {
  stats: ScrollStatsReveal,
  statement: ScrollTextReveal,
  features: ScrollFeaturesReveal,
  hubs: ScrollHubsReveal,
  cta: ScrollCtaReveal,
}

function MechanicsContent({ local }) {
  const reduceMotion = useReducedMotion()
  const head = revealStyle(local, 0.06, 0.2, reduceMotion)

  return (
    <div className="scroll-story__layer scroll-story__layer--editorial scroll-story__layer--long">
      <div className="scroll-story__editorial scroll-story__editorial--wide">
        <div className="scroll-story__section-head" style={head}>
          <Kicker>Archive Structure</Kicker>
          <h2 className="scroll-story__display-title">Archive Workflow</h2>
        </div>
        <div className="scroll-story__mechanics">
          {ARCHIVE_MECHANICS.map((item, i) => (
            <article
              key={item.title}
              className="scroll-story__mechanic scroll-story__mechanic--title-only"
              style={revealStyle(local, 0.14 + i * 0.06, 0.2, reduceMotion)}
            >
              <span className="scroll-story__mechanic-index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ScrollStoryUI({ scrollProgress, activeChapter, sceneReveal = 1 }) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion()
  const [enterLocal, setEnterLocal] = useState(0)

  const discrete = activeChapter != null
  const { index, opacity } = discrete
    ? getChapterFromIndex(activeChapter)
    : getChapterFromProgress(scrollProgress)
  const scrollLocal = getChapterFromProgress(scrollProgress).local
  const local = discrete ? enterLocal : scrollLocal

  useEffect(() => {
    if (!discrete) {
      setEnterLocal(1)
      return
    }
    if (reduceMotion) {
      setEnterLocal(1)
      return
    }

    setEnterLocal(0)
    let frame
    const start = performance.now()
    const duration = 580

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setEnterLocal(smoothstep(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [index, discrete, reduceMotion])

  const motionStyle = chapterMotion(opacity, local, reduceMotion, sceneReveal)
  const chapterMeta = getChapterMeta(index)
  const onRevealChapter = chapterMeta.type === 'reveal'
  const RevealComponent = onRevealChapter ? REVEAL_COMPONENTS[chapterMeta.group] : null

  const chapterById = {
    hero: <HeroContent key="hero" navigate={navigate} local={local} snapChapter={discrete} />,
    mechanics: <MechanicsContent key="mechanics" local={local} />,
  }

  const stageContent = onRevealChapter ? null : chapterById[chapterMeta.id]
  const stageKey = onRevealChapter ? chapterMeta.group : index

  return (
    <div className={`scroll-story ${isDark ? 'scroll-story--dark' : 'scroll-story--light'}`}>
      {RevealComponent && (
        <RevealComponent
          activeIndex={chapterMeta.groupIndex}
          enterLocal={local}
          sceneReveal={sceneReveal}
        />
      )}

      <div
        className={`scroll-story__stage${onRevealChapter ? ' scroll-story__stage--reveal' : ''}`}
        key={stageKey}
        style={{
          ...motionStyle,
          visibility: opacity > 0.02 ? 'visible' : 'hidden',
          willChange: 'opacity, transform, filter',
        }}
      >
        {stageContent}
      </div>

      <ChapterRail
        index={index}
        local={discrete ? enterLocal : scrollLocal}
        scrollProgress={discrete ? chapterIndexToProgress(index) + enterLocal / SCROLL_CHAPTER_COUNT : scrollProgress}
      />
    </div>
  )
}
