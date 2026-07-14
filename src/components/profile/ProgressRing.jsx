import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/** SVG gradient progress ring that sweeps in on first view. value: 0–1. */
export default function ProgressRing({ value = 0, size = 108, stroke = 9, from = '#4fc3f7', to = '#7c3aed', track = 'rgba(148,163,184,0.15)', label, children }) {
    const gradId = useId()
    const reduce = useReducedMotion()
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const clamped = Math.max(0, Math.min(1, value))

    return (
        <div className="sp-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
            <svg width={size} height={size}>
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={from} />
                        <stop offset="100%" stopColor={to} />
                    </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    initial={{ strokeDashoffset: c }}
                    whileInView={{ strokeDashoffset: c * (1 - clamped) }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ filter: `drop-shadow(0 0 6px ${from}55)` }}
                />
            </svg>
            <div className="sp-ring__center">{children}</div>
        </div>
    )
}
