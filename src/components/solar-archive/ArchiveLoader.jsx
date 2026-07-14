import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FoundationLogo from '../FoundationLogo.jsx'
import SolarBrandA, { SolarWordCore } from '../SolarBrandA.jsx'

const EASE = [0.22, 1, 0.36, 1]
const LETTER_STAGGER = 0.13
const LETTER_START = 0.18

const BOOT_LINES = [
  'Loading coordinates…',
  'Loading research hubs…',
  'Loading archive records…',
  'Verifying index…',
  'Opening archive…',
]

const LOADER_LETTERS = ['S', 'O', 'L', 'A', 'R']

export default function ArchiveLoader({ onComplete }) {
  const reduceMotion = useReducedMotion()
  const finishedRef = useRef(false)
  const [progress, setProgress] = useState(0)
  const [lineIdx, setLineIdx] = useState(0)
  const [exit, setExit] = useState(false)
  const lettersDoneAt = LETTER_START + (LOADER_LETTERS.length - 1) * LETTER_STAGGER + 0.42

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete?.()
  }, [onComplete])

  const beginExit = useCallback(() => {
    setExit(true)
  }, [])

  useEffect(() => {
    const safety = setTimeout(() => {
      setExit(true)
      finish()
    }, 10000)
    return () => clearTimeout(safety)
  }, [finish])

  useEffect(() => {
    let v = 0
    let exitTimer
    const tick = setInterval(() => {
      v += Math.random() * 2.8 + 0.9
      if (v >= 100) {
        v = 100
        clearInterval(tick)
        exitTimer = setTimeout(beginExit, 400)
      }
      setProgress(Math.floor(v))
      setLineIdx(Math.min(BOOT_LINES.length - 1, Math.floor(v / 22)))
    }, 38)
    return () => {
      clearInterval(tick)
      clearTimeout(exitTimer)
    }
  }, [beginExit])

  const loader = (
    <AnimatePresence onExitComplete={finish}>
      {!exit && (
        <motion.div
          key="archive-loader"
          className="archive-loader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="archive-loader__grid" aria-hidden="true" />

          <div className="archive-loader__brand">
            <div className="archive-loader__logo">
              <FoundationLogo fillCircle alt="" />
            </div>
            <span className="archive-loader__title">
              <span>THE</span>
              <SolarWordCore className="archive-loader__title-solar" />
              <span>ARCHIVE</span>
            </span>
          </div>

          <div className="archive-loader__stage">
            <div className="archive-loader__letters" aria-label="SOLAR">
              {LOADER_LETTERS.map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  className="archive-loader__letter"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -22, scale: 0.82 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    duration: 0.48,
                    delay: LETTER_START + i * LETTER_STAGGER,
                    ease: EASE,
                  }}
                >
                  {ch === 'A' ? (
                    <SolarBrandA className="archive-loader__letter-a" />
                  ) : (
                    ch
                  )}
                </motion.span>
              ))}
            </div>

            <motion.p
              className="archive-loader__loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: lettersDoneAt, duration: 0.45, ease: EASE }}
            >
              Loading {String(progress).padStart(2, '0')}%
            </motion.p>
          </div>

          <div className="archive-loader__status">
            <span className="archive-loader__status-label">Accessing The Solar Archive</span>
            <motion.span
              key={lineIdx}
              className="archive-loader__status-line"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {BOOT_LINES[lineIdx]}
            </motion.span>
          </div>

          <div className="archive-loader__bar-track">
            <motion.div
              className="archive-loader__bar-fill"
              style={{ width: `${progress}%` }}
              layout
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return loader
  return createPortal(loader, document.body)
}
