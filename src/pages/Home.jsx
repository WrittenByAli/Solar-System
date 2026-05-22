import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Globe, BookOpen, Users, Shield, ImagePlus, Layers } from 'lucide-react'
import { useTheme } from '../App.jsx'
import FoundationLogo from '../components/FoundationLogo.jsx'
import SolarBrandA from '../components/SolarBrandA.jsx'
import { primaryArchivePath, ARCHIVE_SOLAR_PUBLIC_URL } from '../config/archiveFrontend.js'

const FEATURES = [
    { icon: Layers, title: 'Your canvas from one image', desc: 'Upload any image on Start archive — width × height in pixels becomes your coordinate grid. Layer 1 is the welcome surface; zoom deeper for detail.', color: '#4fc3f7' },
    { icon: Globe, title: 'Alternate scientific lenses', desc: 'The Solar map links the same big ideas across domains (energy, biology, AI…). Jump to another hub to read the same themes from a different view.', color: '#67e8f9' },
    { icon: BookOpen, title: 'Coordinate-Based Archive', desc: 'Every research entry lives at a specific X,Y coordinate, explorable through infinite zoom levels.', color: '#f5a623' },
    { icon: Shield, title: '4-Level Deep Zoom', desc: 'From 256×256 subject index to 16384×16384 archival depth — knowledge at every scale.', color: '#7c3aed' },
    { icon: Users, title: 'Community Driven', desc: 'Submit entries, review research, and climb the leaderboard as a SOLAR contributor.', color: '#34d399' },
]

const DOMAINS = [
    { planet: 'North Star', domain: 'Foundation', color: '#f5a623', emoji: '📜' },
    { planet: 'Sun', domain: 'Energy', color: '#ff6b35', emoji: '☀️' },
    { planet: 'Mercury', domain: 'Industry', color: '#9ca3af', emoji: '⚙️' },
    { planet: 'Venus', domain: 'Agriculture', color: '#fbbf24', emoji: '🌾' },
    { planet: 'Earth', domain: 'Biology', color: '#34d399', emoji: '🧬' },
    { planet: 'Mars', domain: 'Engineering', color: '#f87171', emoji: '🔧' },
    { planet: 'Jupiter', domain: 'Intelligence', color: '#fb923c', emoji: '🧠' },
    { planet: 'Saturn', domain: 'Ecology', color: '#fde68a', emoji: '♻️' },
    { planet: 'Uranus', domain: 'Society', color: '#67e8f9', emoji: '⚖️' },
    { planet: 'Neptune', domain: 'Water', color: '#818cf8', emoji: '🌊' },
]

export default function Home() {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <div className="solar-page">
            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center px-4 py-20 text-center overflow-hidden">
                {/* Background gradient orb */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,92vw)] h-[min(600px,92vw)] rounded-full opacity-20 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(79,195,247,0.4) 0%, rgba(124,58,237,0.3) 50%, transparent 70%)' }}
                />

                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="relative z-10"
                >
                    {/* Logo badge */}
                    <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.8 }}
                        className="w-24 h-24 md:w-28 md:h-28 rounded-full mx-auto mb-6 flex items-center justify-center overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #f5a623, #ff6b35)', boxShadow: '0 0 40px rgba(245,166,35,0.5)' }}
                    >
                        <FoundationLogo fillCircle />
                    </motion.div>

                    <p className="font-solar text-xs font-semibold tracking-[0.28em] uppercase mb-4" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                        S.O.L.A.R. Foundation
                    </p>

                    <h1
                        className="font-solar text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-none mb-6 inline-flex flex-wrap items-center justify-center text-center max-w-full"
                    >
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: isDark
                                    ? 'linear-gradient(135deg, #e2e8f0 0%, #4fc3f7 50%, #f5a623 100%)'
                                    : 'linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #d97706 100%)',
                            }}
                        >
                            THE
                        </span>
                        <span className="inline-block w-[0.25em] shrink-0 max-md:w-[0.2em]" aria-hidden="true" />
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: isDark
                                    ? 'linear-gradient(135deg, #e2e8f0 0%, #4fc3f7 50%, #f5a623 100%)'
                                    : 'linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #d97706 100%)',
                            }}
                        >
                            SOL
                        </span>
                        <SolarBrandA
                            gradientStops={
                                isDark
                                    ? [
                                          { offset: '0%', color: '#e2e8f0' },
                                          { offset: '50%', color: '#4fc3f7' },
                                          { offset: '100%', color: '#f5a623' },
                                      ]
                                    : [
                                          { offset: '0%', color: '#0f172a' },
                                          { offset: '50%', color: '#0284c7' },
                                          { offset: '100%', color: '#d97706' },
                                      ]
                            }
                        />
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: isDark
                                    ? 'linear-gradient(135deg, #e2e8f0 0%, #4fc3f7 50%, #f5a623 100%)'
                                    : 'linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #d97706 100%)',
                            }}
                        >
                            R
                        </span>
                        <span className="inline-block w-[0.25em] shrink-0 max-md:w-[0.2em]" aria-hidden="true" />
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: isDark
                                    ? 'linear-gradient(135deg, #e2e8f0 0%, #4fc3f7 50%, #f5a623 100%)'
                                    : 'linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #d97706 100%)',
                            }}
                        >
                            ARCHIVE
                        </span>
                    </h1>

                    <p className="text-base md:text-lg max-w-2xl mx-auto mb-2 leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                        <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>Sustainable Off-grid Living-labs for Autonomy and Research</strong>
                    </p>
                    <p className="text-sm md:text-base max-w-xl mx-auto mb-8" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        One coordinate archive you shape from an image. Explore deeper zoom layers for detail — then visit other hubs on the map for the same topics through another scientific lens. Hosting discovery on{' '}
                        <a href={ARCHIVE_SOLAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: isDark ? '#67e8f9' : '#0284c7' }}>
                            archive.solar
                        </a>{' '}
                        is a future federation layer (this demo stays frontend-only).
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(primaryArchivePath())}
                            className="flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}
                        >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden bg-white/20">
                                <FoundationLogo size={20} fillCircle circleFill="88%" alt="" />
                            </span>
                            Open archive
                            <ArrowRight size={14} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/create-archive')}
                            className="flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold"
                            style={{
                                background: isDark ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.1)',
                                border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(180,83,9,0.3)'}`,
                                color: isDark ? '#fbbf24' : '#b45309',
                            }}
                        >
                            <ImagePlus size={16} /> Start your archive
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/leaderboard')}
                            className="flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold"
                            style={{
                                background: isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.1)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.3)' : 'rgba(2,132,199,0.3)'}`,
                                color: isDark ? '#4fc3f7' : '#0284c7',
                            }}
                        >
                            <Users size={16} /> View Leaderboard
                        </motion.button>
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="max-w-5xl mx-auto px-4 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {FEATURES.map((feat, i) => {
                        const Icon = feat.icon
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-5 rounded-2xl card-hover"
                                style={{
                                    background: isDark ? 'rgba(7,20,40,0.7)' : 'rgba(255,255,255,0.8)',
                                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.08)'}`,
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                                    style={{ background: `${feat.color}22`, border: `1px solid ${feat.color}44` }}
                                >
                                    <Icon size={18} style={{ color: feat.color }} />
                                </div>
                                <h3 className="font-bold text-sm mb-1.5" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{feat.title}</h3>
                                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{feat.desc}</p>
                            </motion.div>
                        )
                    })}
                </motion.div>
            </section>

            {/* About SOLAR */}
            <section className="max-w-4xl mx-auto px-4 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="p-6 md:p-8 rounded-2xl"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.8)' : 'rgba(255,255,255,0.85)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'}`,
                    }}
                >
                    <div className="mb-3 flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.35)' }}>
                        <FoundationLogo size={28} alt="" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black mb-4" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>What is S.O.L.A.R.?</h2>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                        S.O.L.A.R. is a plan for a future where society works together to survive and thrive, even in the face of climate change, resource limits, and social inequality. It is based on the idea of closed-loop, connected systems — where nothing is wasted, energy is renewable, and knowledge is shared freely.
                    </p>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                        The system is inspired by the solar system itself: each hub focuses on a different key area of survival, like energy, materials, food, water, governance, or knowledge. It is not a normal lab, but a network of living systems that work together.
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                        Each hub focuses on something important for survival: the Sun hub for energy, Mercury for materials, Venus for food, Earth for health, Mars for resilience, Jupiter for information, Saturn for agriculture and waste, Uranus for culture and governance, and Neptune for water. Each hub is self-sufficient, but they also support one another.
                    </p>
                </motion.div>
            </section>

            {/* Domains strip */}
            <section className="max-w-5xl mx-auto px-4 pb-20">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center text-lg font-bold mb-6"
                    style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
                >
                    Research domains & Foundation archive
                </motion.h2>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-2">
                    {DOMAINS.map((d, i) => (
                        <motion.button
                            key={d.planet}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.08, y: -3 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(`/archive/${d.planet.toLowerCase()}`)}
                            className="flex flex-col items-center gap-1 p-2 xs:gap-1.5 xs:p-3 rounded-xl min-w-0"
                            style={{
                                background: isDark ? 'rgba(7,20,40,0.6)' : 'rgba(255,255,255,0.7)',
                                border: `1px solid ${d.color}33`,
                            }}
                        >
                            <span className="text-xl">{d.emoji}</span>
                            <span className="text-xs font-bold leading-none" style={{ color: d.color }}>{d.planet}</span>
                            <span className="text-[9px] text-center leading-tight line-clamp-2 break-words max-w-full" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{d.domain}</span>
                        </motion.button>
                    ))}
                </div>
            </section>
        </div>
    )
}
