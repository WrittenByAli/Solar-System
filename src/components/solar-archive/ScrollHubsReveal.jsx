import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { primaryArchivePath } from '../../config/archiveFrontend.js'
import { PLANETARY_HUBS } from './homeContent.js'
import {
  ITEM_SPRING,
  RevealKicker,
  RevealProgress,
  RevealShell,
  itemState,
  itemVariants,
} from './scrollRevealShared.jsx'

function PlanetGlobe({ color, grad }) {
  return (
    <div
      className="scroll-hubs-reveal__globe"
      style={{
        background: `radial-gradient(circle at 35% 30%, ${grad[0]}, ${grad[1]} 55%, ${grad[2]})`,
        boxShadow: `0 0 90px ${color}33, 0 0 30px ${color}44, inset -14px -14px 40px rgba(0,0,0,0.35)`,
      }}
      aria-hidden="true"
    />
  )
}

function HubSlide({ hub, index, activeIndex, enterLocal, reduceMotion, onExplore }) {
  const state = itemState(index, activeIndex)
  const isActive = state === 'active'
  const variants = itemVariants(reduceMotion)

  return (
    <motion.button
      type="button"
      className="scroll-hubs-reveal__planet"
      animate={variants[state]}
      transition={ITEM_SPRING}
      onClick={onExplore}
      tabIndex={isActive ? 0 : -1}
      aria-hidden={!isActive}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      aria-label={`Open ${hub.planet} — ${hub.domain} archive`}
    >
      <PlanetGlobe color={hub.color} grad={hub.grad} />
      <motion.h3
        className="scroll-hubs-reveal__name"
        initial={false}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
        transition={{ ...ITEM_SPRING, delay: isActive ? 0.05 * enterLocal : 0 }}
      >
        {hub.planet}
      </motion.h3>
      <motion.span
        className="scroll-hubs-reveal__domain"
        initial={false}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 8 }}
        transition={{ ...ITEM_SPRING, delay: isActive ? 0.1 * enterLocal : 0 }}
      >
        {hub.domain}
      </motion.span>
    </motion.button>
  )
}

export default function ScrollHubsReveal({ activeIndex, enterLocal, sceneReveal = 1 }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  return (
    <RevealShell sceneReveal={sceneReveal} reduceMotion={reduceMotion} className="scroll-hubs-reveal">
      <div className="scroll-hubs-reveal__head">
        <RevealKicker>Research domains</RevealKicker>
        <h2 className="scroll-story__display-title scroll-story__display-title--sm">Planetary Hubs</h2>
      </div>

      <div className="scroll-hubs-reveal__stage">
        {PLANETARY_HUBS.map((hub, i) => (
          <HubSlide
            key={hub.id}
            hub={hub}
            index={i}
            activeIndex={activeIndex}
            enterLocal={enterLocal}
            reduceMotion={reduceMotion}
            onExplore={() => navigate(`/archive/${hub.id}`)}
          />
        ))}
      </div>

      <RevealProgress count={PLANETARY_HUBS.length} activeIndex={activeIndex} getKey={(i) => PLANETARY_HUBS[i].id} />

      <button
        type="button"
        className="scroll-story__btn scroll-story__btn--ghost scroll-hubs-reveal__viewall"
        onClick={() => navigate(primaryArchivePath())}
      >
        View all <ArrowUpRight size={12} />
      </button>
    </RevealShell>
  )
}
