import { motion, useReducedMotion } from 'framer-motion'
import { STATEMENT_LINES, DOMAIN_HIGHLIGHTS } from './homeContent.js'
import {
  RevealKicker,
  RevealLine,
  RevealProgress,
  RevealShell,
} from './scrollRevealShared.jsx'

export default function ScrollTextReveal({ activeIndex, enterLocal, sceneReveal = 1 }) {
  const reduceMotion = useReducedMotion()
  const showHighlights = activeIndex === STATEMENT_LINES.length - 1

  return (
    <RevealShell sceneReveal={sceneReveal} reduceMotion={reduceMotion}>
      <RevealKicker enterLocal={enterLocal} reduceMotion={reduceMotion}>What is SOLAR</RevealKicker>

      <div className="scroll-text-reveal__lines">
        {STATEMENT_LINES.map((line, i) => (
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

      <RevealProgress count={STATEMENT_LINES.length} activeIndex={activeIndex} getKey={(i) => STATEMENT_LINES[i].text} />

      <motion.div
        className="scroll-text-reveal__highlights"
        initial={false}
        animate={{
          opacity: showHighlights ? Math.min(1, enterLocal * 1.4) : 0,
          y: showHighlights && !reduceMotion ? (1 - Math.min(1, enterLocal * 1.4)) * 18 : 0,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden={!showHighlights}
      >
        {DOMAIN_HIGHLIGHTS.map((d, i) => (
          <motion.span
            key={d.label}
            className={`scroll-text-reveal__highlight scroll-text-reveal__highlight--${d.slug}`}
            initial={false}
            animate={{
              opacity: showHighlights ? 1 : 0,
              y: showHighlights && !reduceMotion ? 0 : 10,
            }}
            transition={{
              delay: showHighlights ? i * 0.06 : 0,
              duration: reduceMotion ? 0 : 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {d.label}
          </motion.span>
        ))}
      </motion.div>
    </RevealShell>
  )
}
