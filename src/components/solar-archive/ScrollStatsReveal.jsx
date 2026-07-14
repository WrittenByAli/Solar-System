import { motion, useReducedMotion } from 'framer-motion'
import { STATS } from './homeContent.js'
import {
  ITEM_SPRING,
  RevealKicker,
  RevealProgress,
  RevealShell,
  itemState,
  itemVariants,
} from './scrollRevealShared.jsx'

function RevealStat({ stat, index, activeIndex, enterLocal, reduceMotion }) {
  const state = itemState(index, activeIndex)
  const isActive = state === 'active'
  const variants = itemVariants(reduceMotion)

  return (
    <motion.div
      className="scroll-stats-reveal__cell"
      animate={variants[state]}
      transition={ITEM_SPRING}
      aria-current={isActive ? 'step' : undefined}
    >
      <motion.div
        className="scroll-stats-reveal__num"
        initial={false}
        animate={{
          scale: isActive ? 1 : state === 'past' ? 0.92 : 0.86,
          opacity: state === 'future' ? 0.3 : 1,
        }}
        transition={ITEM_SPRING}
      >
        {stat.num}
      </motion.div>
      <motion.div
        className="scroll-stats-reveal__label"
        initial={reduceMotion ? false : { y: 14, opacity: 0 }}
        animate={
          state === 'future'
            ? { y: 10, opacity: 0 }
            : { y: 0, opacity: state === 'active' ? 1 : 0.55 }
        }
        transition={{ ...ITEM_SPRING, delay: isActive ? 0.08 * enterLocal : 0 }}
      >
        {stat.label}
      </motion.div>
    </motion.div>
  )
}

export default function ScrollStatsReveal({ activeIndex, enterLocal, sceneReveal = 1 }) {
  const reduceMotion = useReducedMotion()

  return (
    <RevealShell sceneReveal={sceneReveal} reduceMotion={reduceMotion} className="scroll-stats-reveal">
      <RevealKicker>At a glance</RevealKicker>

      <div className="scroll-stats-reveal__grid">
        {STATS.map((stat, i) => (
          <RevealStat
            key={stat.label}
            stat={stat}
            index={i}
            activeIndex={activeIndex}
            enterLocal={enterLocal}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <RevealProgress count={STATS.length} activeIndex={activeIndex} getKey={(i) => STATS[i].label} />
    </RevealShell>
  )
}
