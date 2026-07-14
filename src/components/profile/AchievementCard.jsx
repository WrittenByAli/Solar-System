import { motion, useReducedMotion } from 'framer-motion'
import {
    Sparkles, Rocket, Archive, CheckCircle2, Landmark,
    ClipboardCheck, Medal, Star, ShieldCheck, Trophy,
} from 'lucide-react'

const ICONS = {
    sparkles: Sparkles,
    rocket: Rocket,
    archive: Archive,
    check: CheckCircle2,
    landmark: Landmark,
    clipboard: ClipboardCheck,
    medal: Medal,
    star: Star,
    shield: ShieldCheck,
    trophy: Trophy,
}

const RARITY = {
    common: { color: '#98989d', label: 'Common' },
    rare: { color: '#6ac4f0', label: 'Rare' },
    epic: { color: '#b58ae6', label: 'Epic' },
    legendary: { color: '#f5a623', label: 'Distinguished' },
}

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** One badge: real progress toward a real threshold; earn date only when the data records one. */
export default function AchievementCard({ ach, index = 0 }) {
    const reduce = useReducedMotion()
    const Icon = ICONS[ach.icon] || Star
    const rarity = RARITY[ach.rarity] || RARITY.common
    const earned = ach.progress >= ach.target
    const pct = Math.min(1, ach.progress / ach.target)

    return (
        <motion.div
            className="sp-ach"
            data-rarity={ach.rarity}
            data-locked={!earned}
            style={{ '--rar': rarity.color }}
            initial={reduce ? false : { opacity: 0, scale: 0.88, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 170, damping: 19, delay: reduce ? 0 : Math.min(index * 0.05, 0.4) }}
            whileHover={reduce ? undefined : { y: -4, scale: 1.02 }}
        >
            <div className="sp-ach__top">
                <span className="sp-ach__icon" style={{ color: earned ? rarity.color : '#64748b' }}>
                    <Icon size={19} aria-hidden />
                </span>
                <span className="sp-ach__rarity" style={{ color: rarity.color }}>{rarity.label}</span>
            </div>
            <p className="sp-ach__title">{ach.title}</p>
            <p className="sp-ach__desc">{ach.desc}</p>
            <div className="sp-ach__bar">
                <motion.span
                    initial={reduce ? { width: `${pct * 100}%` } : { width: 0 }}
                    whileInView={{ width: `${pct * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
                    style={{ background: rarity.color, boxShadow: earned ? `0 0 8px ${rarity.color}` : 'none' }}
                />
            </div>
            <p className="sp-ach__meta">
                {earned
                    ? ach.earnedAt ? `Earned ${fmtDate(ach.earnedAt)}` : 'Unlocked'
                    : `${Math.round(ach.progress).toLocaleString()} / ${ach.target.toLocaleString()}`}
            </p>
        </motion.div>
    )
}
