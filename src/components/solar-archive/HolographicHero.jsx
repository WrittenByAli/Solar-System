import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

export default function HolographicHero({ visible, onEnter, scrollProgress }) {
  const brokenCount = Math.min(8, Math.floor(scrollProgress * 10))

  return (
    <div className="solar-archive-hero" aria-label="The Solar Archive">
      <motion.div
        className="solar-archive-hero__panel"
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={visible ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 1.3, ease: EASE, delay: 0.15 }}
      >
        <div className="solar-archive-hero__scanline" aria-hidden="true" />
        <p className="solar-archive-hero__eyebrow">Forbidden Cosmic Museum</p>
        <h1 className="solar-archive-hero__title">The Solar Archive</h1>
        <p className="solar-archive-hero__subtitle">
          Scroll to fracture the asteroid belt — each fragment reveals deeper coordinates
        </p>

        {brokenCount > 0 && (
          <motion.p
            className="solar-archive-hero__telemetry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Fragments detached: {brokenCount} / 8
          </motion.p>
        )}

        <motion.button
          type="button"
          className="solar-archive-hero__cta"
          onClick={onEnter}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : {}}
          transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
        >
          Enter the Archive
          <ArrowRight size={14} />
        </motion.button>
      </motion.div>

      <motion.div
        className="solar-archive-hero__hint"
        initial={{ opacity: 0 }}
        animate={visible ? { opacity: 1 } : {}}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <span>Scroll — meteoroids fracture on approach</span>
        <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 2.2, repeat: Infinity }}>
          ↓
        </motion.span>
      </motion.div>
    </div>
  )
}
