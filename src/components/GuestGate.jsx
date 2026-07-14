import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, UserPlus, LogIn, ArrowLeft, Check, Eye } from 'lucide-react'
import { useTheme } from '../App.jsx'

const GUEST_CAN = [
    'Explore all nine research hubs and every archive layer',
    'Navigate the coordinate map',
    'Browse the leaderboard and archive directory',
]

const MEMBER_ONLY = [
    'Submit research entries (credited to your profile)',
    'Review submissions and vote in the 3-reviewer consensus',
    'Earn contribution points and climb the leaderboard',
]

/** Full-page stop for guests on member-only routes. Explains the boundary
    and offers the upgrade path instead of silently bouncing to /join. */
export default function GuestGate() {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const cardBg = isDark ? 'rgba(7,12,24,0.85)' : 'rgba(255,255,255,0.95)'
    const border = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.1)'
    const heading = isDark ? '#f8fafc' : '#0f172a'
    const body = isDark ? '#94a3b8' : '#334155'

    return (
        <div className="solar-page solar-page--center" style={{ padding: '96px 16px 48px' }}>
            <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                aria-labelledby="guest-gate-title"
                style={{
                    width: '100%',
                    maxWidth: 520,
                    margin: '0 auto',
                    padding: 'clamp(24px, 4vw, 40px)',
                    borderRadius: 24,
                    background: cardBg,
                    border: `1px solid ${border}`,
                    boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 12px 40px rgba(15,23,42,0.08)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div
                    aria-hidden
                    style={{
                        width: 64, height: 64, margin: '0 auto 18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(245,166,35,0.18), rgba(255,107,53,0.12))',
                        border: '1px solid rgba(245,166,35,0.35)',
                        color: '#f5a623',
                    }}
                >
                    <Lock size={26} />
                </div>

                <h1 id="guest-gate-title" style={{ fontSize: 22, fontWeight: 800, color: heading, textAlign: 'center', margin: '0 0 8px' }}>
                    This area needs an account
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: body, textAlign: 'center', margin: '0 0 24px' }}>
                    You&apos;re browsing as a <strong style={{ color: heading }}>guest</strong> — perfect for
                    exploring, but contributions are credited to a profile, so this page is members-only.
                </p>

                <div style={{ display: 'grid', gap: 16, marginBottom: 26 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Eye size={13} aria-hidden /> As a guest you can
                        </p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                            {GUEST_CAN.map((line) => (
                                <li key={line} style={{ fontSize: 13, color: body, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <Check size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} aria-hidden />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f5a623', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <UserPlus size={13} aria-hidden /> With a free account you also get
                        </p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                            {MEMBER_ONLY.map((line) => (
                                <li key={line} style={{ fontSize: 13, color: body, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <Check size={14} style={{ color: '#f5a623', flexShrink: 0, marginTop: 2 }} aria-hidden />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Link
                        to="/join?mode=signup"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            height: 48, borderRadius: 14, textDecoration: 'none',
                            fontSize: 14.5, fontWeight: 700,
                            color: '#fff',
                            background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                            boxShadow: '0 8px 24px rgba(245,166,35,0.3)',
                        }}
                    >
                        <UserPlus size={16} aria-hidden /> Create a free account
                    </Link>
                    <Link
                        to="/join"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            height: 44, borderRadius: 14, textDecoration: 'none',
                            fontSize: 13.5, fontWeight: 600,
                            color: heading,
                            border: `1px solid ${border}`,
                            background: 'transparent',
                        }}
                    >
                        <LogIn size={15} aria-hidden /> I already have an account
                    </Link>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                            color: isDark ? '#64748b' : '#475569',
                        }}
                    >
                        <ArrowLeft size={14} aria-hidden /> Keep browsing as guest
                    </button>
                </div>
            </motion.section>
        </div>
    )
}
