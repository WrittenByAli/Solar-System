import { motion } from 'framer-motion'
import { useMemo } from 'react'

export const LINE_SPRING = { type: 'spring', stiffness: 280, damping: 32, mass: 0.85 }
export const WORD_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }
export const ITEM_SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }

export function itemState(i, activeIndex) {
  if (i < activeIndex) return 'past'
  if (i === activeIndex) return 'active'
  return 'future'
}

/** Keep the active item hidden until the section transition finishes. */
export function effectiveItemState(i, activeIndex, enterLocal, threshold = 0.02) {
  const state = itemState(i, activeIndex)
  if (state === 'active' && enterLocal < threshold) return 'future'
  return state
}

export function lineVariants(reduceMotion) {
  if (reduceMotion) {
    return {
      future: { opacity: 0.2 },
      active: { opacity: 1 },
      past: { opacity: 0.45 },
    }
  }
  return {
    future: { opacity: 0.14, y: 28, filter: 'blur(8px)', scale: 0.98 },
    active: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 },
    past: { opacity: 0.36, y: -10, filter: 'blur(0px)', scale: 0.99 },
  }
}

export function itemVariants(reduceMotion) {
  if (reduceMotion) {
    return {
      future: { opacity: 0.18 },
      active: { opacity: 1 },
      past: { opacity: 0.42 },
    }
  }
  return {
    future: { opacity: 0.12, y: 24, filter: 'blur(6px)', scale: 0.96 },
    active: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 },
    past: { opacity: 0.38, y: -6, filter: 'blur(0px)', scale: 0.98 },
  }
}

/** One-at-a-time cards — only the active step is visible. */
export function singleItemVariants(reduceMotion) {
  if (reduceMotion) {
    return {
      future: { opacity: 0 },
      active: { opacity: 1 },
      past: { opacity: 0 },
    }
  }
  return {
    future: { opacity: 0, y: 22, filter: 'blur(8px)', scale: 0.96 },
    active: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 },
    past: { opacity: 0, y: -14, filter: 'blur(6px)', scale: 0.98 },
  }
}

export function RevealKicker({ children, className = '' }) {
  return (
    <div className={`scroll-story__kicker scroll-text-reveal__kicker ${className}`.trim()}>
      <div className="scroll-story__kicker-line" />
      <span>{children}</span>
    </div>
  )
}

export function RevealProgress({ count, activeIndex, getKey = (i) => i }) {
  return (
    <div className="scroll-text-reveal__progress" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={getKey(i)}
          className="scroll-text-reveal__progress-dot"
          animate={{
            scale: i === activeIndex ? 1 : 0.55,
            opacity: i <= activeIndex ? 1 : 0.28,
          }}
          transition={LINE_SPRING}
        />
      ))}
    </div>
  )
}

export function RevealShell({ sceneReveal, reduceMotion, className = '', children, ariaLive = 'polite' }) {
  return (
    <motion.div
      className={`scroll-text-reveal ${className}`.trim()}
      initial={false}
      animate={{
        opacity: sceneReveal,
        y: reduceMotion ? 0 : (1 - sceneReveal) * 16,
      }}
      transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-live={ariaLive}
    >
      <div className="scroll-text-reveal__sticky">{children}</div>
    </motion.div>
  )
}

export function RevealLine({ text, accent = false, index, activeIndex, enterLocal, reduceMotion }) {
  const state = itemState(index, activeIndex)
  const isActive = state === 'active'
  const words = useMemo(() => text.split(' '), [text])
  const variants = lineVariants(reduceMotion)

  return (
    <motion.div
      className={`scroll-text-reveal__line${accent ? ' scroll-text-reveal__line--accent' : ''}`}
      animate={variants[state]}
      transition={LINE_SPRING}
      aria-current={isActive ? 'step' : undefined}
    >
      <span className="scroll-text-reveal__line-inner">
        {words.map((word, wi) => {
          const wordDelay = isActive ? wi * 0.045 : 0
          const wordVisible = state !== 'future'

          return (
            <span key={`${word}-${wi}`} className="scroll-text-reveal__word-wrap">
              <motion.span
                className="scroll-text-reveal__word"
                initial={reduceMotion ? false : { y: '112%', opacity: 0 }}
                animate={
                  wordVisible
                    ? { y: '0%', opacity: 1 }
                    : { y: '112%', opacity: 0 }
                }
                transition={{
                  ...WORD_SPRING,
                  delay: wordDelay * enterLocal,
                }}
              >
                {word}
              </motion.span>
              {wi < words.length - 1 ? '\u00a0' : null}
            </span>
          )
        })}
      </span>
    </motion.div>
  )
}
