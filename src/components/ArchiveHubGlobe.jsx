import { useRef, useEffect, useCallback, memo } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'

/* ─── colour helpers ─── */
function hexRgb(hex) {
  const h = (hex || '').replace('#', '')
  return [parseInt(h.slice(0,2),16)||128, parseInt(h.slice(2,4),16)||128, parseInt(h.slice(4,6),16)||128]
}
function lighten(hex, f=0.44) {
  const [r,g,b]=hexRgb(hex)
  return `rgb(${Math.round(r+(255-r)*f)},${Math.round(g+(255-g)*f)},${Math.round(b+(255-b)*f)})`
}
function darken(hex, f=0.60) {
  const [r,g,b]=hexRgb(hex)
  return `rgb(${Math.round(r*(1-f))},${Math.round(g*(1-f))},${Math.round(b*(1-f))})`
}
function rgba(hex, a) {
  const [r,g,b]=hexRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * ArchiveHubGlobe
 * ─ Soft CSS sphere rendered via layered radial-gradients + blur.
 * ─ Drag to move freely; clamped to viewport so it never leaves the screen.
 * ─ +ZOOM / -ZOOM scale it smoothly (CSS transition on width/height).
 * ─ ORIGIN button triggers spring-animated return to centre.
 */
const ArchiveHubGlobe = memo(function ArchiveHubGlobe({
  hubId,
  planet,
  isDark,
  accentColor,
  vpSize,
  zoom         = 1,
  resetTrigger = 0,
  moverRef     = null,
}) {
  const color  = accentColor || planet?.color || '#4fc3f7'
  const bright = lighten(color, 0.44)
  const deep   = darken(color, 0.60)

  /* framer-motion values for position — set() is instant (zero lag during drag) */
  const mvX = useMotionValue(0)
  const mvY = useMotionValue(0)
  const dragRef = useRef(null)

  /* planet size (reacts to zoom prop) */
  const minDim  = Math.min(vpSize?.w ?? 640, vpSize?.h ?? 640)
  const size    = Math.max(180, Math.min(minDim * 0.38 * zoom, minDim * 0.88))
  const hs      = size / 2   // half-size
  const vpW     = vpSize?.w ?? 900
  const vpH     = vpSize?.h ?? 600

  /* ── bounds: keep planet fully inside the stage ── */
  const clampXY = useCallback((x, y) => {
    // motion.div is centred at (50%, 50%) of stage.
    // x/y are offsets from that centre.
    // Planet extends hs in each direction, so clamp to keep it on-screen.
    const marginX = vpW / 2 - hs
    const marginY = vpH / 2 - hs
    return {
      x: Math.max(-marginX, Math.min(marginX, x)),
      y: Math.max(-marginY, Math.min(marginY, y)),
    }
  }, [hs, vpW, vpH])

  /* keep latest bounds in a ref so the stable moverRef callback is never stale */
  const boundsRef = useRef({ hs, vpW, vpH })
  useEffect(() => { boundsRef.current = { hs, vpW, vpH } }, [hs, vpW, vpH])

  /* register a stable movement callback used by the D-pad buttons at L1 */
  useEffect(() => {
    if (!moverRef) return
    moverRef.current = (dx, dy) => {
      const { hs: h, vpW: w, vpH: v } = boundsRef.current
      const maxX = w / 2 - h, maxY = v / 2 - h
      mvX.set(Math.max(-maxX, Math.min(maxX, mvX.get() + dx)))
      mvY.set(Math.max(-maxY, Math.min(maxY, mvY.get() + dy)))
    }
    return () => { if (moverRef) moverRef.current = null }
  }, [moverRef]) // registered once; reads from boundsRef for fresh bounds

  /* reset to centre when hub changes */
  useEffect(() => { mvX.set(0); mvY.set(0) }, [hubId])

  /* ORIGIN button → spring bounce back to centre */
  useEffect(() => {
    if (resetTrigger <= 0) return
    animate(mvX, 0, { type: 'spring', stiffness: 210, damping: 26, restDelta: 0.5 })
    animate(mvY, 0, { type: 'spring', stiffness: 210, damping: 26, restDelta: 0.5 })
  }, [resetTrigger])

  /* ── pointer handlers ── */
  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: mvX.get(),
      oy: mvY.get(),
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const raw = {
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    }
    const clamped = clampXY(raw.x, raw.y)
    mvX.set(clamped.x)
    mvY.set(clamped.y)
  }, [clampXY])

  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  /* ── render ── */
  return (
    /*
     * Zero-size anchor centred in the stage.
     * x/y MotionValues translate it; children hang off this point.
     */
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top:  '50%',
        x: mvX,
        y: mvY,
        width: 0,
        height: 0,
        overflow: 'visible',
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* planet shell — pull up by half-size to visually centre on the anchor */}
      <div
        style={{
          position: 'relative',
          width:      size,
          height:     size,
          marginTop: -hs * 1.08,   /* slight upward offset for the hint below */
          cursor: dragRef.current ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none',
          flexShrink: 0,
          /* smooth size transitions for zoom */
          transition: 'width 0.28s cubic-bezier(0.22,1,0.36,1), height 0.28s cubic-bezier(0.22,1,0.36,1), margin-top 0.28s cubic-bezier(0.22,1,0.36,1)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* ── outer hazy atmosphere (large blurred disc) ── */}
        <div aria-hidden style={{
          position:     'absolute',
          inset:        '-28%',
          borderRadius: '50%',
          background:   `radial-gradient(circle, ${rgba(color,0.45)} 10%, ${rgba(color,0.14)} 50%, transparent 72%)`,
          filter:       `blur(${Math.round(size * 0.14)}px)`,
          pointerEvents:'none',
        }} />

        {/* ── tight rim glow ── */}
        <div aria-hidden style={{
          position:     'absolute',
          inset:        '-6%',
          borderRadius: '50%',
          background:   `radial-gradient(circle, transparent 50%, ${rgba(color,0.28)} 70%, transparent 84%)`,
          filter:       `blur(${Math.round(size * 0.04)}px)`,
          pointerEvents:'none',
        }} />

        {/* ── planet body ── */}
        <div className="archive-hub-globe__body" style={{
          position:     'absolute',
          inset:        0,
          borderRadius: '50%',
          background:   `radial-gradient(circle at 37% 33%, ${bright} 0%, ${color} 44%, ${deep} 100%)`,
          boxShadow: [
            `0 0 ${Math.round(size*.055)}px ${rgba(color,.80)}`,
            `0 0 ${Math.round(size*.20)}px  ${rgba(color,.30)}`,
            `0 0 ${Math.round(size*.50)}px  ${rgba(color,.11)}`,
          ].join(', '),
          overflow:     'hidden',
          pointerEvents:'none',
        }}>
          <div className="archive-hub-globe__surface archive-hub-globe__surface--slow" aria-hidden style={{
            background: `linear-gradient(90deg, transparent 0%, ${rgba(bright, 0.16)} 18%, transparent 34%, ${rgba(deep, 0.18)} 52%, transparent 74%, ${rgba(bright, 0.12)} 100%)`,
          }} />
          <div className="archive-hub-globe__surface archive-hub-globe__surface--fast" aria-hidden style={{
            background: `linear-gradient(90deg, ${rgba(deep, 0.12)} 0%, transparent 20%, ${rgba(bright, 0.18)} 38%, transparent 58%, ${rgba(deep, 0.16)} 78%, transparent 100%)`,
          }} />
          {/* specular highlight — upper left */}
          <div aria-hidden style={{
            position:     'absolute',
            top: '9%', left: '15%',
            width: '44%', height: '44%',
            borderRadius: '50%',
            background:   'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.06) 50%, transparent 70%)',
          }} />
          {/* limb shadow — lower right */}
          <div aria-hidden style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            background:   'radial-gradient(circle at 68% 68%, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 38%, transparent 62%)',
          }} />
          {/* equatorial haze band */}
          <div aria-hidden style={{
            position:   'absolute',
            top: '40%', left: 0, right: 0,
            height:     '18%',
            background: `linear-gradient(to bottom, transparent, ${rgba(color,0.14)} 50%, transparent)`,
          }} />
        </div>
      </div>

    </motion.div>
  )
})

export default ArchiveHubGlobe
