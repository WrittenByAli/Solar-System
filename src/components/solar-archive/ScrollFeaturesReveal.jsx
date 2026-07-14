import { motion, useReducedMotion } from 'framer-motion'
import { FEATURES } from './homeContent.js'
import {
  ITEM_SPRING,
  RevealKicker,
  RevealProgress,
  RevealShell,
  effectiveItemState,
  itemState,
  singleItemVariants,
} from './scrollRevealShared.jsx'

function RevealFeature({ feature, index, activeIndex, enterLocal, reduceMotion }) {
  const state = effectiveItemState(index, activeIndex, enterLocal)
  const isActive = itemState(index, activeIndex) === 'active'
  const variants = singleItemVariants(reduceMotion)

  return (
    <motion.article
      className="scroll-features-reveal__step"
      initial={variants.future}
      animate={variants[state]}
      transition={ITEM_SPRING}
      aria-current={isActive && enterLocal > 0.02 ? 'step' : undefined}
      aria-hidden={state !== 'active'}
    >
      <motion.span
        className="scroll-features-reveal__num"
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{
          opacity: isActive && enterLocal > 0.02 ? 1 : 0,
          scale: isActive && enterLocal > 0.02 ? 1 : 0.86,
        }}
        transition={{ ...ITEM_SPRING, delay: isActive ? 0.04 * enterLocal : 0 }}
        aria-hidden
      >
        {feature.n}
      </motion.span>
      <div className="scroll-features-reveal__content">
        <motion.h3
          className="scroll-features-reveal__title"
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: isActive && enterLocal > 0.02 ? 1 : 0,
            y: isActive && enterLocal > 0.02 ? 0 : 12,
          }}
          transition={{ ...ITEM_SPRING, delay: isActive ? 0.06 * enterLocal : 0 }}
        >
          {feature.title}
        </motion.h3>
        <motion.p
          className="scroll-features-reveal__body"
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isActive && enterLocal > 0.02 ? 1 : 0,
            y: isActive && enterLocal > 0.02 ? 0 : 10,
          }}
          transition={{ ...ITEM_SPRING, delay: isActive ? 0.12 * enterLocal : 0 }}
        >
          {feature.body}
        </motion.p>
      </div>
    </motion.article>
  )
}

export default function ScrollFeaturesReveal({ activeIndex, enterLocal, sceneReveal = 1 }) {
  const reduceMotion = useReducedMotion()
  const isIntro = activeIndex === 0
  const cardActiveIndex = activeIndex - 1
  const showCards = cardActiveIndex >= 0
  const textVisible = isIntro ? enterLocal > 0.02 : true
  const textReveal = isIntro ? enterLocal : 1

  return (
    <RevealShell sceneReveal={sceneReveal} reduceMotion={reduceMotion} className="scroll-features-reveal">
      <RevealKicker>How it works</RevealKicker>

      <motion.h2
        className="scroll-features-reveal__headline"
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: textVisible ? Math.min(1, textReveal * 1.3) : 0,
          y: reduceMotion ? 0 : textVisible ? 0 : 12,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        Four steps to archive
        <span className="scroll-features-reveal__headline-accent"> knowledge.</span>
      </motion.h2>

      <motion.p
        className="scroll-features-reveal__lede"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: textVisible ? Math.min(1, textReveal * 1.2) : 0,
          y: reduceMotion ? 0 : textVisible ? 0 : 10,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        Explore a coordinate universe, zoom through layers, submit adjacent entries, and earn review standing.
      </motion.p>

      {showCards && (
        <div className="scroll-features-reveal__steps scroll-features-reveal__steps--single">
          {FEATURES.map((feature, i) => (
            <RevealFeature
              key={feature.n}
              feature={feature}
              index={i}
              activeIndex={cardActiveIndex}
              enterLocal={enterLocal}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      )}

      <RevealProgress
        count={FEATURES.length}
        activeIndex={showCards ? cardActiveIndex : -1}
        getKey={(i) => FEATURES[i].n}
      />
    </RevealShell>
  )
}
