import React, { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

const CARD_WIDTH = 200

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n))
}

/**
 * Hover overlay: coordinates + difficulty in an animated glass card (portal).
 */
export default function SegmentHoverSurface({
    coordLabel,
    difficulty,
    accentColor = '#4fc3f7',
    isDark = true,
    children,
    style,
    className,
}) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ x: 0, y: 0 })

    const placeNearCursor = useCallback((clientX, clientY) => {
        const gap = 18
        const estimH = 104
        let x = clientX + gap
        let y = clientY + gap
        x = clamp(x, 12, window.innerWidth - CARD_WIDTH - 12)
        y = clamp(y, 12, window.innerHeight - estimH - 12)
        setPos({ x, y })
    }, [])

    const onEnter = useCallback(
        (e) => {
            setOpen(true)
            placeNearCursor(e.clientX, e.clientY)
        },
        [placeNearCursor],
    )

    const onMove = useCallback(
        (e) => {
            if (!open) return
            placeNearCursor(e.clientX, e.clientY)
        },
        [open, placeNearCursor],
    )

    const onLeave = useCallback(() => setOpen(false), [])

    const hasDiff = difficulty != null && Number.isFinite(Number(difficulty))
    const d = hasDiff ? Math.round(Number(difficulty)) : null

    const accent = accentColor || '#4fc3f7'
    const secondary = isDark ? '#c4b5fd' : '#6366f1'

    const portal =
        typeof document !== 'undefined'
            ? createPortal(
                  <AnimatePresence mode="wait">
                      {open && (
                          <motion.div
                              key="segment-hover-card"
                              role="tooltip"
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.93, y: 8 }}
                              transition={{
                                  type: 'spring',
                                  stiffness: 460,
                                  damping: 28,
                                  mass: 0.72,
                              }}
                              style={{
                                  position: 'fixed',
                                  left: pos.x,
                                  top: pos.y,
                                  zIndex: 100000,
                                  width: CARD_WIDTH,
                                  pointerEvents: 'none',
                              }}
                          >
                              <motion.div
                                  initial={{ opacity: 0.85 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.22 }}
                                  style={{
                                      borderRadius: 16,
                                      padding: '14px 16px 16px',
                                      background: isDark ? 'rgba(6,10,22,0.94)' : 'rgba(255,255,255,0.97)',
                                      backdropFilter: 'blur(18px)',
                                      WebkitBackdropFilter: 'blur(18px)',
                                      border: `1px solid ${accent}44`,
                                      boxShadow: isDark
                                          ? `0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05), 0 0 36px ${accent}22`
                                          : `0 18px 40px rgba(15,23,42,0.14), 0 0 0 1px rgba(15,23,42,0.06), 0 0 32px ${accent}18`,
                                  }}
                              >
                                  <div
                                      style={{
                                          fontSize: 9,
                                          fontWeight: 800,
                                          letterSpacing: '0.18em',
                                          textTransform: 'uppercase',
                                          color: accent,
                                          marginBottom: 10,
                                      }}
                                  >
                                      Coordinates
                                  </div>
                                  <div
                                      style={{
                                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                          fontSize: 14,
                                          fontWeight: 700,
                                          color: isDark ? '#f1f5f9' : '#0f172a',
                                          marginBottom: 14,
                                          letterSpacing: '0.03em',
                                          lineHeight: 1.35,
                                          wordBreak: 'break-word',
                                      }}
                                  >
                                      {coordLabel && String(coordLabel).trim() ? coordLabel : '—'}
                                  </div>
                                  <div
                                      style={{
                                          fontSize: 9,
                                          fontWeight: 800,
                                          letterSpacing: '0.18em',
                                          textTransform: 'uppercase',
                                          color: accent,
                                          marginBottom: 6,
                                      }}
                                  >
                                      Difficulty
                                  </div>
                                  {d != null ? (
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                          <span
                                              style={{
                                                  fontSize: 32,
                                                  fontWeight: 900,
                                                  lineHeight: 1,
                                                  letterSpacing: '-0.03em',
                                                  background: `linear-gradient(125deg, ${accent}, ${secondary})`,
                                                  WebkitBackgroundClip: 'text',
                                                  WebkitTextFillColor: 'transparent',
                                                  backgroundClip: 'text',
                                              }}
                                          >
                                              {d}
                                          </span>
                                          <span
                                              style={{
                                                  fontSize: 15,
                                                  fontWeight: 700,
                                                  color: isDark ? '#94a3b8' : '#64748b',
                                              }}
                                          >
                                              /5
                                          </span>
                                      </div>
                                  ) : (
                                      <div
                                          style={{
                                              fontSize: 22,
                                              fontWeight: 800,
                                              color: isDark ? '#475569' : '#94a3b8',
                                              letterSpacing: '0.06em',
                                          }}
                                      >
                                          —
                                      </div>
                                  )}
                                  <div
                                      style={{
                                          fontSize: 9,
                                          marginTop: 8,
                                          fontWeight: 600,
                                          color: isDark ? '#64748b' : '#94a3b8',
                                          letterSpacing: '0.04em',
                                      }}
                                  >
                                      comprehension scale · 1 easiest → 5 hardest
                                  </div>
                              </motion.div>
                          </motion.div>
                      )}
                  </AnimatePresence>,
                  document.body,
              )
            : null

    return (
        <>
            <div
                className={className}
                style={{ cursor: 'inherit', ...style }}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                onMouseMove={onMove}
            >
                {children}
            </div>
            {portal}
        </>
    )
}
