import { motion, useReducedMotion } from 'framer-motion'

/** Frosted-glass container with scroll-in reveal and hover lift.
    Section headings live on the page background (see Profile.jsx's
    SectionHeader), so this stays a pure surface. */
export default function GlassCard({ hover = true, className = '', children, ...rest }) {
    const reduce = useReducedMotion()
    return (
        <motion.div
            className={`sp-glass ${className}`}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            whileHover={hover && !reduce ? { y: -3 } : undefined}
            {...rest}
        >
            {children}
        </motion.div>
    )
}
