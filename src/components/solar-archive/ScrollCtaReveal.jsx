import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ARCHIVE_SOLAR_PUBLIC_URL } from '../../config/archiveFrontend.js'
import { CTA_LINES } from './homeContent.js'
import {
  RevealKicker,
  RevealLine,
  RevealProgress,
  RevealShell,
} from './scrollRevealShared.jsx'

export default function ScrollCtaReveal({ activeIndex, enterLocal, sceneReveal = 1 }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const showActions = activeIndex === CTA_LINES.length - 1

  return (
    <RevealShell sceneReveal={sceneReveal} reduceMotion={reduceMotion} className="scroll-cta-reveal">
      <RevealKicker>Begin</RevealKicker>

      <div className="scroll-text-reveal__lines scroll-cta-reveal__lines">
        {CTA_LINES.map((line, i) => (
          <RevealLine
            key={line.text}
            text={line.text}
            accent={line.accent}
            index={i}
            activeIndex={activeIndex}
            enterLocal={enterLocal}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <RevealProgress count={CTA_LINES.length} activeIndex={activeIndex} getKey={(i) => CTA_LINES[i].text} />

      <motion.div
        className="scroll-cta-reveal__actions"
        initial={false}
        animate={{
          opacity: showActions ? Math.min(1, enterLocal * 1.35) : 0,
          y: showActions && !reduceMotion ? (1 - Math.min(1, enterLocal * 1.35)) * 16 : 0,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: showActions && enterLocal > 0.35 ? 'auto' : 'none' }}
      >
        <button type="button" className="scroll-story__btn scroll-story__btn--solid" onClick={() => navigate('/directory')}>
          Browse directory <ArrowRight size={14} />
        </button>
        <button type="button" className="scroll-story__btn scroll-story__btn--ghost" onClick={() => navigate('/leaderboard')}>
          Leaderboard <ArrowUpRight size={14} />
        </button>
      </motion.div>

      <motion.footer
        className="scroll-cta-reveal__footer"
        initial={false}
        animate={{
          opacity: showActions ? Math.min(1, Math.max(0, (enterLocal - 0.25) * 1.6)) : 0,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden={!showActions}
      >
        <span>Solar Foundation Archive</span>
        <a href={ARCHIVE_SOLAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer">archive.solar ↗</a>
      </motion.footer>
    </RevealShell>
  )
}
