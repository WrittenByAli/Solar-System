import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import FoundationLogo from '../FoundationLogo.jsx'
import { SolarWordCore } from '../SolarBrandA.jsx'

const EASE = [0.22, 1, 0.36, 1]

const BOOT_LINES = [
  'Initializing stellar coordinates…',
  'Calibrating orbital telemetry…',
  'Loading asteroid belt fragments…',
  'Syncing archive vault…',
  'Opening cosmic interface…',
]

export default function ArchiveLoader({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [lineIdx, setLineIdx] = useState(0)
  const [exit, setExit] = useState(false)

  useEffect(() => {
    let v = 0
    const tick = setInterval(() => {
      v += Math.random() * 2.8 + 0.9
      if (v >= 100) {
        v = 100
        clearInterval(tick)
        setTimeout(() => setExit(true), 400)
      }
      setProgress(Math.floor(v))
      setLineIdx(Math.min(BOOT_LINES.length - 1, Math.floor(v / 22)))
    }, 38)
    return () => clearInterval(tick)
  }, [])

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!exit && (
        <motion.div
          key="archive-loader"
          className="archive-loader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="archive-loader__grid" aria-hidden="true" />
          <div className="archive-loader__glow" aria-hidden="true" />

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

          <div className="archive-loader__core">
            <div className="archive-loader__ring archive-loader__ring--outer" />
            <div className="archive-loader__ring archive-loader__ring--inner" />
            <motion.span
              className="archive-loader__percent"
              key={progress}
              initial={{ opacity: 0.6, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              {String(progress).padStart(2, '0')}
            </motion.span>
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
}
