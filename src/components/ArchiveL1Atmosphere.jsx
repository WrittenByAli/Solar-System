import { useRef, useEffect, memo } from 'react'

function parseAccent(hex, fallback = [79, 195, 247]) {
  try {
    const h = String(hex || '').replace('#', '')
    if (h.length < 6) return fallback
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]
  } catch {
    return fallback
  }
}

/** Deterministic 0–1 from index */
function hash01(i, salt = 1) {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return (v - Math.floor(v) + 1) % 1
}

/**
 * Full-bleed L1 space atmosphere: tiny twinkling stars, soft bokeh, accent dust, aurora CSS.
 * pointer-events: none — does not block viewport pan or globe drag.
 */
const ArchiveL1Atmosphere = memo(function ArchiveL1Atmosphere({
  hubId,
  accentColor = '#4fc3f7',
  isDark = true,
}) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const startRef = useRef(Date.now())
  const hubSeed = (hubId || 'star').split('').reduce((a, c) => a + c.charCodeAt(0), 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let dpr = window.devicePixelRatio || 1
    const [R, G, B] = parseAccent(accentColor)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const fitSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fitSize()
    const ro = new ResizeObserver(fitSize)
    ro.observe(canvas)

    const STAR_COUNT = 420
    const STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
      const hi = hash01(i + hubSeed, 1)
      const hj = hash01(i + hubSeed, 2)
      return {
        x: hi,
        y: hj,
        r: 0.15 + hash01(i, 3) * 0.65,
        speed: 0.35 + hash01(i, 4) * 1.8,
        offset: hash01(i, 5) * Math.PI * 2,
        layer: hash01(i, 6) < 0.22 ? 1 : 0,
        hue:
          i % 17 === 0 ? '#fff9e8'
            : i % 11 === 0 ? '#d4e4ff'
              : i % 7 === 0 ? '#ffe8dc'
                : isDark ? '#f8fafc' : '#64748b',
      }
    })

    const DUST = Array.from({ length: 110 }, (_, i) => ({
      x: hash01(i, 10),
      y: hash01(i, 11),
      r: 0.25 + hash01(i, 12) * 0.55,
      vx: (hash01(i, 13) - 0.5) * 0.00008,
      vy: (hash01(i, 14) - 0.5) * 0.00008,
      alpha: 0.08 + hash01(i, 15) * 0.22,
      phase: hash01(i, 16) * Math.PI * 2,
    }))

    const BOKEH = Array.from({ length: 14 }, (_, i) => ({
      x: hash01(i, 20),
      y: hash01(i, 21),
      r: 28 + hash01(i, 22) * 52,
      vx: (hash01(i, 23) - 0.5) * 0.00004,
      vy: (hash01(i, 24) - 0.5) * 0.00004,
      alpha: 0.018 + hash01(i, 25) * 0.035,
      phase: hash01(i, 26) * Math.PI * 2,
    }))

    const SHOOTING = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, nextAt: 5 }

    const draw = () => {
      const t = (Date.now() - startRef.current) / 1000
      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      if (!W || !H) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const cx = W * (0.5 + Math.sin(t * 0.07) * 0.04)
      const cy = H * (0.48 + Math.cos(t * 0.05) * 0.03)
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.35)

      ctx.clearRect(0, 0, W, H)

      if (!isDark) {
        const sky = ctx.createLinearGradient(0, 0, 0, H)
        sky.addColorStop(0, '#f8fafc')
        sky.addColorStop(0.55, `rgba(${R},${G},${B},0.06)`)
        sky.addColorStop(1, '#eef2ff')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, W, H)
      }

      const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * (0.55 + breathe * 0.12))
      if (isDark) {
        neb.addColorStop(0, `rgba(${R},${G},${B},${0.14 + breathe * 0.06})`)
        neb.addColorStop(0.35, `rgba(${R},${G},${B},0.04)`)
        neb.addColorStop(0.7, 'rgba(30,20,60,0.08)')
        neb.addColorStop(1, 'rgba(0,0,0,0)')
      } else {
        neb.addColorStop(0, `rgba(${R},${G},${B},0.12)`)
        neb.addColorStop(0.5, `rgba(${R},${G},${B},0.03)`)
        neb.addColorStop(1, 'rgba(255,255,255,0)')
      }
      ctx.fillStyle = neb
      ctx.fillRect(0, 0, W, H)

      if (isDark) {
        const vNeb = ctx.createRadialGradient(
          W * (0.82 + Math.sin(t * 0.04) * 0.03),
          H * (0.2 + Math.cos(t * 0.03) * 0.02),
          0,
          W * 0.82,
          H * 0.2,
          W * 0.45,
        )
        vNeb.addColorStop(0, 'rgba(99,60,180,0.09)')
        vNeb.addColorStop(1, 'rgba(99,60,180,0)')
        ctx.fillStyle = vNeb
        ctx.fillRect(0, 0, W, H)
      }

      BOKEH.forEach((b, i) => {
        if (!reducedMotion) {
          b.x += b.vx
          b.y += b.vy
          if (b.x < -0.1) b.x = 1.1
          if (b.x > 1.1) b.x = -0.1
          if (b.y < -0.1) b.y = 1.1
          if (b.y > 1.1) b.y = -0.1
        }
        const pulse = 0.85 + 0.15 * Math.sin(t * 0.25 + b.phase)
        const px = b.x * W
        const py = b.y * H
        const grd = ctx.createRadialGradient(px, py, 0, px, py, b.r * pulse)
        grd.addColorStop(0, `rgba(${R},${G},${B},${b.alpha * pulse})`)
        grd.addColorStop(0.55, `rgba(${R},${G},${B},${b.alpha * 0.35 * pulse})`)
        grd.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grd
        ctx.fillRect(px - b.r, py - b.r, b.r * 2, b.r * 2)
      })

      STARS.forEach((s) => {
        const parallax = s.layer ? 0.012 * Math.sin(t * 0.2 + s.offset) : 0
        const tw = 0.4 + 0.6 * Math.sin(t * s.speed + s.offset)
        const px = (s.x + parallax) * W
        const py = (s.y + parallax * 0.7) * H
        const alpha = isDark ? 0.25 + tw * 0.7 : 0.15 + tw * 0.45
        ctx.globalAlpha = alpha
        ctx.fillStyle = s.hue
        ctx.beginPath()
        ctx.arc(px, py, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (s.r > 0.55 && isDark) {
          ctx.globalAlpha = (0.06 + tw * 0.12) * alpha
          ctx.beginPath()
          ctx.arc(px, py, s.r * 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      DUST.forEach((p) => {
        if (!reducedMotion) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < -0.05) p.x = 1.05
          if (p.x > 1.05) p.x = -0.05
          if (p.y < -0.05) p.y = 1.05
          if (p.y > 1.05) p.y = -0.05
        }
        const flicker = 0.7 + 0.3 * Math.sin(t * 1.2 + p.phase)
        const px = p.x * W
        const py = p.y * H
        ctx.globalAlpha = p.alpha * flicker
        ctx.fillStyle = `rgba(${R},${G},${B},1)`
        ctx.beginPath()
        ctx.arc(px, py, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      if (!reducedMotion) {
        SHOOTING.nextAt -= 1 / 60
        if (!SHOOTING.active && SHOOTING.nextAt <= 0) {
          SHOOTING.active = true
          SHOOTING.x = Math.random() * W * 0.7
          SHOOTING.y = Math.random() * H * 0.35
          const ang = Math.PI * 0.2 + Math.random() * Math.PI * 0.1
          const v = 3.5 + Math.random() * 2.5
          SHOOTING.vx = Math.cos(ang) * v
          SHOOTING.vy = Math.sin(ang) * v
          SHOOTING.life = 1
          SHOOTING.nextAt = 8 + Math.random() * 12
        }
        if (SHOOTING.active) {
          SHOOTING.x += SHOOTING.vx
          SHOOTING.y += SHOOTING.vy
          SHOOTING.life -= 0.014
          if (SHOOTING.life <= 0 || SHOOTING.x > W || SHOOTING.y > H) {
            SHOOTING.active = false
          } else {
            const tail = 48
            const grd = ctx.createLinearGradient(
              SHOOTING.x,
              SHOOTING.y,
              SHOOTING.x - SHOOTING.vx * tail / 5,
              SHOOTING.y - SHOOTING.vy * tail / 5,
            )
            grd.addColorStop(0, `rgba(255,255,255,${SHOOTING.life * 0.85})`)
            grd.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.globalAlpha = 1
            ctx.strokeStyle = grd
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(SHOOTING.x, SHOOTING.y)
            ctx.lineTo(
              SHOOTING.x - SHOOTING.vx * tail / 5,
              SHOOTING.y - SHOOTING.vy * tail / 5,
            )
            ctx.stroke()
          }
        }
      }

      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(draw)
    }

    if (reducedMotion) {
      draw()
    } else {
      animRef.current = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [accentColor, isDark, hubId])

  return (
    <div
      className={`archive-l1-atmosphere ${isDark ? 'archive-l1-atmosphere--dark' : 'archive-l1-atmosphere--light'}`}
      style={{ '--l1-accent': accentColor }}
      aria-hidden
    >
      <div className="archive-l1-atmosphere__aurora archive-l1-atmosphere__aurora--a" />
      <div className="archive-l1-atmosphere__aurora archive-l1-atmosphere__aurora--b" />
      <div className="archive-l1-atmosphere__ring archive-l1-atmosphere__ring--1" />
      <div className="archive-l1-atmosphere__ring archive-l1-atmosphere__ring--2" />
      <div className="archive-l1-atmosphere__vignette" />
      <canvas ref={canvasRef} className="archive-l1-atmosphere__canvas" />
    </div>
  )
})

export default ArchiveL1Atmosphere
