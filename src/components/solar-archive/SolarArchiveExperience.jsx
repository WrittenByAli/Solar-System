import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../App.jsx'
import SolarSystemScene from './SolarSystemScene.jsx'
import ScrollStoryUI from './ScrollStoryUI.jsx'
import ArchiveLoader from './ArchiveLoader.jsx'
import { primaryArchivePath } from '../../config/archiveFrontend.js'
import { METEOROIDS } from './planetData.js'
import { SCROLL_CHAPTERS } from './homeContent.js'
import '../../styles/solar-archive-home.css'

export default function SolarArchiveExperience() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const containerRef = useRef(null)
  const mouse = useRef({ x: 0, y: 0 })
  const scrollTarget = useRef(0)
  const scrollSmooth = useRef(0)
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseSmooth = useRef({ x: 0, y: 0 })
  const prevScroll = useRef(0)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(performance.now())

  const [loading, setLoading] = useState(true)
  const [reveal, setReveal] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollVelocity, setScrollVelocity] = useState(0)
  const [shake, setShake] = useState(0)

  const handleLoaderDone = useCallback(() => setLoading(false), [])

  useEffect(() => {
    if (loading) return
    let frame
    const start = performance.now()
    const duration = 4200

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [loading])

  useEffect(() => {
    if (loading) return

    const onMove = (e) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let frame
    const smoothTick = () => {
      scrollSmooth.current += (scrollTarget.current - scrollSmooth.current) * 0.065
      mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * 0.05
      mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * 0.05

      mouse.current.x = mouseSmooth.current.x
      mouse.current.y = mouseSmooth.current.y

      setScrollProgress(scrollSmooth.current)

      const root = containerRef.current
      if (root) {
        root.style.setProperty('--home-px', String(mouseSmooth.current.x))
        root.style.setProperty('--home-py', String(mouseSmooth.current.y))
        root.style.setProperty('--home-sp', String(scrollSmooth.current))
      }

      frame = requestAnimationFrame(smoothTick)
    }
    frame = requestAnimationFrame(smoothTick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [loading])

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return

      const now = performance.now()
      const dy = window.scrollY - lastScrollY.current
      const dt = Math.max(16, now - lastScrollTime.current)
      setScrollVelocity(dy / dt)
      lastScrollY.current = window.scrollY
      lastScrollTime.current = now

      const max = el.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      scrollTarget.current = p

      METEOROIDS.forEach((m) => {
        if (prevScroll.current < m.breakAt && p >= m.breakAt) {
          setShake(1)
          setTimeout(() => setShake(0), 320)
        }
      })
      prevScroll.current = p
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleEnter = useCallback(() => navigate(primaryArchivePath()), [navigate])

  return (
    <div ref={containerRef} className={`solar-archive-root ${isDark ? 'solar-archive-root--dark' : 'solar-archive-root--light'}`}>
      {loading && <ArchiveLoader onComplete={handleLoaderDone} />}

      {!loading && (
        <>
          <SolarSystemScene
            reveal={reveal}
            scrollProgress={scrollProgress}
            scrollVelocity={scrollVelocity}
            mouse={mouse}
            shake={shake}
            isDark={isDark}
          />

          <div className="solar-archive-root__veil" style={{ opacity: Math.max(0, 0.55 - reveal * 0.65) }} aria-hidden="true" />
          <div className="solar-archive-root__gradient" aria-hidden="true" />
          <div className="solar-archive-root__vignette" style={{ opacity: 0.42 + scrollProgress * 0.18 }} aria-hidden="true" />
          <div className="solar-archive-root__bloom" style={{ opacity: 0.06 + Math.pow(scrollProgress, 1.35) * 0.62 + reveal * 0.08 }} aria-hidden="true" />
          <div className="solar-archive-root__warp" style={{ opacity: reveal * (0.06 + Math.pow(scrollProgress, 1.2) * 0.48) }} aria-hidden="true" />

          <ScrollStoryUI scrollProgress={scrollProgress} onEnter={handleEnter} />

          <div className="solar-archive-root__chapters" aria-hidden="true">
            {SCROLL_CHAPTERS.map((ch) => (
              <div key={ch.id} className="solar-archive-root__chapter" style={{ height: ch.height }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
