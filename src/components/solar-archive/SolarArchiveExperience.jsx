import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '../../App.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import LazyVantaFogBackground from './LazyVantaFogBackground.jsx'
import ScrollStoryUI from './ScrollStoryUI.jsx'
import ArchiveLoader from './ArchiveLoader.jsx'
import { SCROLL_CHAPTERS } from './homeContent.js'
import { SCROLL_CHAPTER_COUNT } from './scrollChapters.js'
import {
  chapterIndexToProgress,
  scrollYToChapterIndex,
  snapScrollToChapter,
} from '../../utils/homeChapterScroll.js'
import {
  getHomeIntroKey,
  hasSeenHomeIntro,
  markHomeIntroSeen,
} from '../../utils/homeIntroStorage.js'
import '../../styles/solar-archive-home.css'

// The animated WebGL fog is loaded via LazyVantaFogBackground, which defers
// three.js (~189 kB gzip) off the initial-render critical path and skips it
// for reduced-motion / Save-Data. The static CSS fallback below
// (.solar-archive-root__vanta-fallback) covers the interim and is the
// permanent backdrop when the fog is skipped.

function shouldPlayIntroLoader(authLoaded, introKey) {
  if (!authLoaded || !introKey) return false
  return !hasSeenHomeIntro(introKey)
}

export default function SolarArchiveExperience() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion()
  const { isGuest, authLoaded, clerkId } = useAuth()

  const containerRef = useRef(null)
  const activeChapterRef = useRef(0)
  const syncingRef = useRef(false)
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseSmooth = useRef({ x: 0, y: 0 })
  const usedFullIntroRef = useRef(false)

  const introKey = authLoaded ? getHomeIntroKey({ isGuest, clerkId }) : null

  const [contentReady, setContentReady] = useState(() => authLoaded)
  const [showIntroLoader, setShowIntroLoader] = useState(() => shouldPlayIntroLoader(authLoaded, introKey))
  const [activeChapter, setActiveChapter] = useState(0)
  const [sceneReveal, setSceneReveal] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  const setChapterState = useCallback((index) => {
    const clamped = Math.max(0, Math.min(SCROLL_CHAPTER_COUNT - 1, index))
    if (clamped === activeChapterRef.current) return false
    activeChapterRef.current = clamped
    setActiveChapter(clamped)
    const progress = chapterIndexToProgress(clamped)
    setScrollProgress(progress)
    const root = containerRef.current
    if (root) root.style.setProperty('--home-sp', String(progress))
    return true
  }, [])

  const goToChapter = useCallback((index, behavior = 'smooth') => {
    const clamped = Math.max(0, Math.min(SCROLL_CHAPTER_COUNT - 1, index))
    setChapterState(clamped)
    syncingRef.current = true
    snapScrollToChapter(clamped, reduceMotion ? 'auto' : behavior)
    window.setTimeout(() => {
      syncingRef.current = false
    }, reduceMotion ? 0 : 620)
  }, [reduceMotion, setChapterState])

  useEffect(() => {
    if (!authLoaded) return
    setContentReady(true)
    setShowIntroLoader(shouldPlayIntroLoader(true, introKey))
  }, [authLoaded, introKey])

  const handleLoaderDone = useCallback(() => {
    if (introKey) markHomeIntroSeen(introKey)
    usedFullIntroRef.current = true
    setShowIntroLoader(false)
  }, [introKey])

  useEffect(() => {
    if (!contentReady || showIntroLoader) return

    let frame
    const start = performance.now()
    const duration = usedFullIntroRef.current ? 2400 : 850

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setSceneReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    setSceneReveal(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [contentReady, showIntroLoader])

  useEffect(() => {
    if (!contentReady || showIntroLoader) return
    document.documentElement.classList.add('sa-home-scroll')
    window.scrollTo({ top: 0, behavior: 'auto' })
    setChapterState(0)
    return () => document.documentElement.classList.remove('sa-home-scroll')
  }, [contentReady, showIntroLoader, setChapterState])

  useEffect(() => {
    if (!contentReady || showIntroLoader) return

    let settleTimer
    let wheelTimer
    let wheelDelta = 0

    const syncFromScroll = () => {
      if (syncingRef.current) return
      const idx = scrollYToChapterIndex(window.scrollY)
      setChapterState(idx)
    }

    const onScroll = () => {
      syncFromScroll()
      clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (syncingRef.current) return
        const idx = scrollYToChapterIndex(window.scrollY)
        setChapterState(idx)
        snapScrollToChapter(idx, reduceMotion ? 'auto' : 'smooth')
      }, 90)
    }

    const onWheel = (e) => {
      if (syncingRef.current) return
      wheelDelta += e.deltaY
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelDelta = 0
      }, 120)
      if (Math.abs(wheelDelta) < 36) return

      const dir = wheelDelta > 0 ? 1 : -1
      wheelDelta = 0
      const next = activeChapterRef.current + dir
      if (next < 0 || next >= SCROLL_CHAPTER_COUNT) return

      e.preventDefault()
      goToChapter(next)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    syncFromScroll()

    return () => {
      clearTimeout(settleTimer)
      clearTimeout(wheelTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
    }
  }, [contentReady, showIntroLoader, reduceMotion, goToChapter, setChapterState])

  useEffect(() => {
    if (!contentReady || showIntroLoader) return

    const onMove = (e) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let frame
    const smoothTick = () => {
      mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * 0.05
      mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * 0.05

      const root = containerRef.current
      if (root) {
        root.style.setProperty('--home-px', String(mouseSmooth.current.x))
        root.style.setProperty('--home-py', String(mouseSmooth.current.y))
      }

      frame = requestAnimationFrame(smoothTick)
    }
    frame = requestAnimationFrame(smoothTick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [contentReady, showIntroLoader])

  useEffect(() => {
    if (!contentReady || showIntroLoader) return

    const onResize = () => {
      snapScrollToChapter(activeChapterRef.current, 'auto')
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [contentReady, showIntroLoader])

  useEffect(() => {
    if (!contentReady || showIntroLoader) return
    if (typeof window === 'undefined' || window.innerWidth > 640) return

    let startY = 0
    let touchStartChapter = 0

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY
      touchStartChapter = activeChapterRef.current
    }

    const onTouchEnd = (e) => {
      const deltaY = startY - e.changedTouches[0].clientY
      if (Math.abs(deltaY) < 48) return
      const dir = deltaY > 0 ? 1 : -1
      const next = touchStartChapter + dir
      if (next < 0 || next >= SCROLL_CHAPTER_COUNT) return
      goToChapter(next)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [contentReady, showIntroLoader, goToChapter])

  return (
    <div ref={containerRef} className={`solar-archive-root ${isDark ? 'solar-archive-root--dark' : 'solar-archive-root--light'}`}>
      {contentReady && (
        <>
          {/* Static fog fallback — paints instantly, and is the permanent
              backdrop for reduced-motion / Save-Data visitors. */}
          <div className="solar-archive-root__vanta-fallback" aria-hidden="true" />
          <LazyVantaFogBackground isDark={isDark} scrollProgress={scrollProgress} entryReveal={sceneReveal} />


          <div className="solar-archive-root__veil" style={{ opacity: Math.max(0, (isDark ? 0.18 : 0.12) - sceneReveal * (isDark ? 0.28 : 0.2)) }} aria-hidden="true" />
          <div className="solar-archive-root__vignette" style={{ opacity: isDark ? 0.22 + scrollProgress * 0.12 : 0.16 + scrollProgress * 0.08 }} aria-hidden="true" />

          <ScrollStoryUI
            activeChapter={activeChapter}
            scrollProgress={scrollProgress}
            sceneReveal={sceneReveal}
          />

          <div className="solar-archive-root__chapters" aria-hidden="true">
            {SCROLL_CHAPTERS.map((ch) => (
              <div key={ch.id} className="solar-archive-root__chapter" style={{ height: ch.height }} />
            ))}
          </div>
        </>
      )}

      {showIntroLoader && <ArchiveLoader onComplete={handleLoaderDone} />}
    </div>
  )
}
