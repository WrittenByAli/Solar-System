import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, ThumbsUp, MessageCircle, Filter } from 'lucide-react'
import { useTheme } from '../App.jsx'

const DOMAIN_COLORS = {
    'Energy Research': '#ff6b35',
    'Communication Systems': '#9ca3af',
    'Atmospheric Sciences': '#fbbf24',
    'Ecology & Food': '#34d399',
    'Resilience & Adaptation': '#f87171',
    'Systems & Autonomy': '#fb923c',
    'Materials & Fabrication': '#fde68a',
    'Magnetism & Geophysics': '#67e8f9',
    'Marine & Ocean Systems': '#818cf8',
}

const REVIEWS = [
    {
        id: 1, user: 'aurora_field', avatar: '🌟', planet: 'Sun', domain: 'Energy Research',
        rating: 5, date: '2026-03-15', likes: 48,
        text: 'The coordinate-based system is genius. I spent hours exploring the Solar Panels and Fusion Energy entries. The nested zoom from ZL5 to ZL8 gives such an incredible sense of depth — you really feel like you\'re drilling into the knowledge.'
    },
    {
        id: 2, user: 'terra_nova', avatar: '🌿', planet: 'Earth', domain: 'Ecology & Food',
        rating: 5, date: '2026-03-14', likes: 39,
        text: 'The permaculture and aquaponics entries are thorough and well-cited. It\'s refreshing to see technical depth alongside accessibility. The difficulty rating system is perfect — 5-star entries genuinely challenge you.'
    },
    {
        id: 3, user: 'marine_depth', avatar: '🌊', planet: 'Neptune', domain: 'Marine & Ocean Systems',
        rating: 4, date: '2026-03-12', likes: 27,
        text: 'Fantastic resource for marine permaculture and seaweed biogas research. The HUD navigation makes exploring coordinates intuitive once you get the hang of it. Would love more entries in the ocean current energy section.'
    },
    {
        id: 4, user: 'signal_lost', avatar: '📡', planet: 'Mercury', domain: 'Communication Systems',
        rating: 5, date: '2026-03-10', likes: 31,
        text: 'As a radio amateur (OP: VK3AQZ), I was impressed by the accuracy of the HF propagation entry. The LoRa and mesh networking sections clearly reflect real-world deployment experience. This is a genuine research archive.'
    },
    {
        id: 5, user: 'red_horizon', avatar: '🔴', planet: 'Mars', domain: 'Resilience & Adaptation',
        rating: 4, date: '2026-03-08', likes: 22,
        text: 'The Earthship architecture and community resilience planning entries are excellent starting points. The off-grid water purification section is particularly well-structured. Great for practitioners, not just theorists.'
    },
    {
        id: 6, user: 'ring_weaver', avatar: '💍', planet: 'Saturn', domain: 'Materials & Fabrication',
        rating: 5, date: '2026-03-06', likes: 19,
        text: 'The biocomposite and 3D printing entries are cutting-edge. I appreciate that they cite actual projects (Bcomp in motorsport, CATAPULT in Uganda). This is actionable knowledge, not just theory. The solar thermal section is brilliant.'
    },
]

const FILTERS = ['All', 'Sun', 'Earth', 'Neptune', 'Mercury', 'Mars', 'Saturn', 'Jupiter', 'Venus', 'Uranus']

function StarRating({ rating, interactive, value, onChange }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <span
                    key={i}
                    style={{
                        fontSize: 16,
                        color: i <= (interactive ? value : rating) ? '#f5a623' : 'rgba(245,166,35,0.2)',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'color 0.1s',
                    }}
                    onClick={() => interactive && onChange && onChange(i)}
                >
                    ★
                </span>
            ))}
        </div>
    )
}

export default function Reviews() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [filter, setFilter] = useState('All')
    const [liked, setLiked] = useState({})
    const [newReviewRating, setNewReviewRating] = useState(5)
    const [newReviewText, setNewReviewText] = useState('')

    const filtered = filter === 'All' ? REVIEWS : REVIEWS.filter(r => r.planet === filter)

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Star size={28} color="#f5a623" />
                        <h1 className="text-3xl md:text-4xl font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                            Reviews
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        What researchers say about the SOLAR Archive
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                        <StarRating rating={4.8} />
                        <span className="text-sm font-bold ml-1" style={{ color: isDark ? '#f5a623' : '#d97706' }}>4.8</span>
                        <span className="text-xs ml-1" style={{ color: isDark ? '#475569' : '#94a3b8' }}>({REVIEWS.length} reviews)</span>
                    </div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"
                >
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
                            style={{
                                background: filter === f
                                    ? isDark ? 'rgba(79,195,247,0.2)' : 'rgba(2,132,199,0.15)'
                                    : isDark ? 'rgba(7,20,40,0.6)' : 'rgba(255,255,255,0.7)',
                                border: `1px solid ${filter === f ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)')}`,
                                color: filter === f ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#64748b' : '#94a3b8'),
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </motion.div>

                {/* Review cards */}
                <div className="flex flex-col gap-4 mb-8">
                    {filtered.map((review, i) => {
                        const domainColor = DOMAIN_COLORS[review.domain] || '#4fc3f7'
                        return (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="p-4 rounded-2xl card-hover"
                                style={{
                                    background: isDark ? 'rgba(7,20,40,0.8)' : 'rgba(255,255,255,0.85)',
                                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.08)'}`,
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                                            style={{ background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(240,244,248,0.9)', border: `1px solid ${domainColor}44` }}
                                        >
                                            {review.avatar}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{review.user}</div>
                                            <div className="text-xs" style={{ color: domainColor }}>{review.planet} · {review.domain}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <StarRating rating={review.rating} />
                                        <div className="text-xs mt-0.5" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{review.date}</div>
                                    </div>
                                </div>

                                {/* Text */}
                                <p className="text-sm leading-relaxed mb-3" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                                    {review.text}
                                </p>

                                {/* Likes */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setLiked(l => ({ ...l, [review.id]: !l[review.id] }))}
                                        className="flex items-center gap-1.5 text-xs font-medium transition-all"
                                        style={{ color: liked[review.id] ? '#4fc3f7' : (isDark ? '#475569' : '#94a3b8') }}
                                    >
                                        <ThumbsUp size={13} fill={liked[review.id] ? '#4fc3f7' : 'none'} />
                                        {review.likes + (liked[review.id] ? 1 : 0)} helpful
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                                        <MessageCircle size={13} /> Reply
                                    </button>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Write a review */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-5 rounded-2xl"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(2,132,199,0.2)'}`,
                        boxShadow: isDark ? '0 0 30px rgba(79,195,247,0.08)' : '0 4px 30px rgba(0,0,0,0.1)',
                    }}
                >
                    <h2 className="font-bold text-base mb-1" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>Write a Review</h2>
                    <p className="text-xs mb-4" style={{ color: isDark ? '#475569' : '#94a3b8' }}>Share your experience with the SOLAR Archive</p>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>Your rating:</span>
                        <StarRating interactive value={newReviewRating} onChange={setNewReviewRating} />
                    </div>
                    <textarea
                        className="w-full rounded-xl p-3 text-sm resize-none mb-3"
                        rows={4}
                        placeholder="Share your thoughts about the archive..."
                        value={newReviewText}
                        onChange={e => setNewReviewText(e.target.value)}
                        style={{
                            background: isDark ? 'rgba(2,4,8,0.6)' : 'rgba(240,244,248,0.8)',
                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)'}`,
                            color: isDark ? '#e2e8f0' : '#0f172a',
                            outline: 'none',
                        }}
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                        onClick={() => { setNewReviewText(''); setNewReviewRating(5); }}
                    >
                        Submit Review
                    </motion.button>
                </motion.div>
            </div>
        </div>
    )
}
