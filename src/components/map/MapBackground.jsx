import { useEffect, useRef } from 'react'

function createStars(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.4 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.8 + 0.2,
    drift: (Math.random() - 0.5) * 0.015,
  }))
}

function createDust(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.08,
    r: Math.random() * 1.8 + 0.5,
    hue: Math.random() > 0.5 ? 200 : 35,
  }))
}

export default function MapBackground({ isDark = true, parallax = { x: 0, y: 0 } }) {
  const canvasRef = useRef(null)
  const starsRef = useRef([])
  const dustRef = useRef([])
  const frameRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const parallaxRef = useRef(parallax)
  parallaxRef.current = parallax

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    let mounted = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w, h }
      starsRef.current = createStars(Math.floor((w * h) / 9000), w, h)
      dustRef.current = createDust(36, w, h)
    }

    const tick = (now) => {
      if (!mounted) return
      const { w, h } = sizeRef.current
      const { x: px, y: py } = parallaxRef.current
      const parX = px * 18
      const parY = py * 12
      const t = now * 0.001

      ctx.clearRect(0, 0, w, h)

      const cx = w * 0.58 + parX * 0.5
      const cy = h * 0.48 + parY * 0.5
      const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.45)
      if (isDark) {
        wash.addColorStop(0, 'rgba(255, 120, 40, 0.07)')
        wash.addColorStop(0.35, 'rgba(255, 80, 20, 0.03)')
        wash.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else {
        wash.addColorStop(0, 'rgba(3, 105, 161, 0.05)')
        wash.addColorStop(1, 'rgba(255, 255, 255, 0)')
      }
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, w, h)

      starsRef.current.forEach((s) => {
        s.x += s.drift + parX * 0.002
        s.y += s.drift * 0.6 + parY * 0.002
        if (s.x < 0) s.x += w
        if (s.x > w) s.x -= w
        if (s.y < 0) s.y += h
        if (s.y > h) s.y -= h

        const twinkle = 0.35 + Math.sin(t * s.speed + s.phase) * 0.35
        ctx.beginPath()
        ctx.arc(s.x + parX * (s.r * 0.3), s.y + parY * (s.r * 0.3), s.r, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? `rgba(220, 235, 255, ${twinkle})`
          : `rgba(15, 23, 42, ${twinkle * 0.35})`
        ctx.fill()
      })

      dustRef.current.forEach((d) => {
        d.x += d.vx + Math.sin(t * 0.4 + d.y * 0.01) * 0.04
        d.y += d.vy + Math.cos(t * 0.35 + d.x * 0.01) * 0.03
        if (d.x < -10) d.x = w + 10
        if (d.x > w + 10) d.x = -10
        if (d.y < -10) d.y = h + 10
        if (d.y > h + 10) d.y = -10

        const alpha = isDark ? 0.22 : 0.14
        ctx.beginPath()
        ctx.arc(d.x + parX, d.y + parY, d.r, 0, Math.PI * 2)
        ctx.fillStyle = d.hue === 200
          ? `rgba(79, 195, 247, ${alpha})`
          : `rgba(245, 166, 35, ${alpha * 0.85})`
        ctx.fill()
      })

      ctx.strokeStyle = isDark ? 'rgba(79, 195, 247, 0.04)' : 'rgba(3, 105, 161, 0.05)'
      ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const r = 120 + i * 90 + Math.sin(t * 0.15 + i) * 8
        ctx.beginPath()
        ctx.ellipse(cx, cy, r * 1.4, r * 0.42, t * 0.02 + i * 0.1, 0, Math.PI * 2)
        ctx.stroke()
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      mounted = false
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameRef.current)
    }
  }, [isDark])

  const bgShift = {
    transform: `translate3d(${parallax.x * -12}px, ${parallax.y * -8}px, 0)`,
  }

  return (
    <div className="solar-map__bg" aria-hidden="true">
      <div className="solar-map__aurora-wrap" style={bgShift}>
        <div className="solar-map__aurora solar-map__aurora--1" />
        <div className="solar-map__aurora solar-map__aurora--2" />
        <div className="solar-map__aurora solar-map__aurora--3" />
      </div>
      <div className="solar-map__rays" />
      <canvas ref={canvasRef} className="solar-map__particles-canvas" />
      <div className="solar-map__vignette" />
    </div>
  )
}
