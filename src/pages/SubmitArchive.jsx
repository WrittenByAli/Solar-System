import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, ChevronDown, AlertCircle } from 'lucide-react'
import { useTheme } from '../App.jsx'

const PLANETS = [
    { id: 'sun', label: 'Sun', domain: 'Energy Research', color: '#ff6b35' },
    { id: 'mercury', label: 'Mercury', domain: 'Communication Systems', color: '#9ca3af' },
    { id: 'venus', label: 'Venus', domain: 'Atmospheric Sciences', color: '#fbbf24' },
    { id: 'earth', label: 'Earth', domain: 'Ecology & Food Systems', color: '#34d399' },
    { id: 'mars', label: 'Mars', domain: 'Resilience & Adaptation', color: '#f87171' },
    { id: 'jupiter', label: 'Jupiter', domain: 'Systems & Autonomy', color: '#fb923c' },
    { id: 'saturn', label: 'Saturn', domain: 'Materials & Fabrication', color: '#fde68a' },
    { id: 'uranus', label: 'Uranus', domain: 'Magnetism & Geophysics', color: '#67e8f9' },
    { id: 'neptune', label: 'Neptune', domain: 'Marine & Ocean Systems', color: '#818cf8' },
]

function Field({ label, children, required }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold flex items-center gap-1" style={{ color: 'inherit' }}>
                {label}{required && <span style={{ color: '#f87171' }}>*</span>}
            </label>
            {children}
        </div>
    )
}

export default function SubmitArchive() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [searchParams] = useSearchParams()
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState({
        planet: '',
        subject: '',
        coordX: '',
        coordY: '',
        summary: '',
        detail: '',
        difficulty: 3,
    })
    const [errors, setErrors] = useState({})
    const [availableSlots, setAvailableSlots] = useState([])
    const [occupiedSlots, setOccupiedSlots] = useState(new Set())

    useEffect(() => {
        const p = searchParams.get('planet')
        const x = searchParams.get('coordX')
        const y = searchParams.get('coordY')
        if (!p && !x && !y) return
        setForm(f => ({
            ...f,
            ...(p ? { planet: p } : {}),
            ...(x ? { coordX: String(x).padStart(3, '0') } : {}),
            ...(y ? { coordY: String(y).padStart(3, '0') } : {}),
        }))
    }, [searchParams])

    useEffect(() => {
        const persisted = JSON.parse(localStorage.getItem('submittedArchiveEntries') || '[]')
        const occupied = new Set(persisted.map(item => `${String(item.coordX).padStart(3, '0')}:${String(item.coordY).padStart(3, '0')}`))

        const nextSlots = []
        // Larger range for the coordinated grid
        for (let x = 100; x <= 160; x += 1) {
            for (let y = 130; y <= 180; y += 1) {
                const x3 = String(x).padStart(3, '0')
                const y3 = String(y).padStart(3, '0')
                const key = `${x3}:${y3}`
                if (!occupied.has(key)) nextSlots.push({ coordX: x3, coordY: y3, label: `X=${x3}, Y=${y3}` })
            }
        }

        // Always ensure the pre-filled form coordinate is available in the list if not occupied
        if (form.coordX && form.coordY) {
            const currentKey = `${String(form.coordX).padStart(3, '0')}:${String(form.coordY).padStart(3, '0')}`
            if (!occupied.has(currentKey) && !nextSlots.find(s => `${s.coordX}:${s.coordY}` === currentKey)) {
                nextSlots.unshift({ 
                    coordX: String(form.coordX).padStart(3, '0'), 
                    coordY: String(form.coordY).padStart(3, '0'), 
                    label: `X=${String(form.coordX).padStart(3, '0')}, Y=${String(form.coordY).padStart(3, '0')} (Selected)` 
                })
            }
        }

        setOccupiedSlots(occupied)
        setAvailableSlots(nextSlots)
    }, [form.coordX, form.coordY, submitted])

    const validate = () => {
        const errs = {}
        if (!form.planet) errs.planet = 'Select a planet/domain'
        if (!form.subject.trim()) errs.subject = 'Subject is required'
        if (!form.coordX || !form.coordY) {
            errs.coordX = 'Select an available grid coordinate (X,Y)'
            errs.coordY = 'Select an available grid coordinate (X,Y)'
        } else {
            if (isNaN(parseInt(form.coordX)) || isNaN(parseInt(form.coordY))) {
                errs.coordX = 'Valid X coordinate required'
                errs.coordY = 'Valid Y coordinate required'
            }
        }
        if (!form.summary.trim() || form.summary.length < 50) errs.summary = 'Summary must be at least 50 characters'
        if (!form.detail.trim() || form.detail.length < 100) errs.detail = 'Detail must be at least 100 characters'
        return errs
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        const persisted = JSON.parse(localStorage.getItem('submittedArchiveEntries') || '[]')
        const entry = {
            ...form,
            coordX: String(form.coordX).padStart(3, '0'),
            coordY: String(form.coordY).padStart(3, '0'),
            createdAt: new Date().toISOString(),
        }
        localStorage.setItem('submittedArchiveEntries', JSON.stringify([...persisted, entry]))
        setSubmitted(true)
    }

    const selectedPlanet = PLANETS.find(p => p.id === form.planet)

    const inputStyle = {
        padding: '10px 14px',
        borderRadius: 12,
        border: `1px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)'}`,
        background: isDark ? 'rgba(2,4,8,0.6)' : 'rgba(240,244,248,0.8)',
        color: isDark ? '#e2e8f0' : '#0f172a',
        fontSize: 13,
        outline: 'none',
        width: '100%',
        fontFamily: 'Inter, sans-serif',
    }

    const labelColor = isDark ? '#94a3b8' : '#475569'
    const errorColor = '#f87171'

    if (submitted) {
        return (
            <div className="min-h-screen pt-20 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    className="text-center max-w-md"
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-6xl mb-6"
                    >
                        🚀
                    </motion.div>
                    <CheckCircle size={48} className="mx-auto mb-4" color="#34d399" />
                    <h2 className="text-2xl font-black mb-2" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        Entry Submitted!
                    </h2>
                    <p className="mb-2" style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
                        Your archive entry for <strong style={{ color: selectedPlanet?.color }}>{selectedPlanet?.label}</strong> has been received.
                    </p>
                    <p className="text-sm mb-6" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                        It will be reviewed and added to the coordinate grid at ({form.coordX}, {form.coordY}).
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="px-8 py-3 rounded-full font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)' }}
                        onClick={() => { setSubmitted(false); setForm({ planet: '', subject: '', coordX: '', coordY: '', summary: '', detail: '', difficulty: 3 }) }}
                    >
                        Submit Another
                    </motion.button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Upload size={28} color={isDark ? '#4fc3f7' : '#0284c7'} />
                        <h1 className="text-3xl md:text-4xl font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                            Submit Archive
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        Contribute a research entry to the SOLAR coordinate grid
                    </p>
                </motion.div>

                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onSubmit={handleSubmit}
                    className="p-6 rounded-2xl flex flex-col gap-5"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)'}`,
                        boxShadow: isDark ? '0 0 40px rgba(79,195,247,0.06)' : '0 4px 40px rgba(0,0,0,0.08)',
                    }}
                >
                    {/* Planet selector */}
                    <Field label="Planet / Research Domain" required>
                        <div className="relative">
                            <select
                                value={form.planet}
                                onChange={e => set('planet', e.target.value)}
                                style={{ ...inputStyle, appearance: 'none', paddingRight: 36 }}
                            >
                                <option value="">Select a planet...</option>
                                {PLANETS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label} — {p.domain}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                        </div>
                        {selectedPlanet && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs px-3 py-1.5 rounded-lg w-fit" style={{ background: `${selectedPlanet.color}22`, color: selectedPlanet.color, border: `1px solid ${selectedPlanet.color}44` }}>
                                ● {selectedPlanet.domain}
                            </motion.div>
                        )}
                        {errors.planet && <p className="text-xs" style={{ color: errorColor }}>{errors.planet}</p>}
                    </Field>

                    {/* Subject */}
                    <Field label="Subject Title" required>
                        <input
                            type="text"
                            placeholder="e.g. Solar Panel Efficiency Optimization"
                            value={form.subject}
                            onChange={e => set('subject', e.target.value)}
                            style={inputStyle}
                            maxLength={80}
                        />
                        {errors.subject && <p className="text-xs" style={{ color: errorColor }}>{errors.subject}</p>}
                    </Field>

                    {/* Available grid selection */}
                    <Field label="Choose an available grid slot" required>
                        <select
                            value={`${form.coordX || ''}:${form.coordY || ''}`}
                            onChange={e => {
                                const [x, y] = e.target.value.split(':')
                                set('coordX', x)
                                set('coordY', y)
                            }}
                            style={{ ...inputStyle, appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
                        >
                            <option value=":">Select an open slot...</option>
                            {availableSlots.length > 0 ? availableSlots.map(slot => (
                                <option key={`${slot.coordX}:${slot.coordY}`} value={`${slot.coordX}:${slot.coordY}`}>
                                    {slot.label}
                                </option>
                            )) : (
                                <option value=":" disabled>No slots available (reset localStorage to free)</option>
                            )}
                        </select>
                        <p className="text-xs mt-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            Only empty grid records are selectable here.
                        </p>
                        {(errors.coordX || errors.coordY) && <p className="text-xs" style={{ color: errorColor }}>{errors.coordX || errors.coordY}</p>}
                    </Field>

                    {/* Summary */}
                    <Field label="Short Summary" required>
                        <textarea
                            rows={3}
                            placeholder="A concise overview of the research entry (min. 50 characters)..."
                            value={form.summary}
                            onChange={e => set('summary', e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div className="flex justify-between">
                            {errors.summary
                                ? <p className="text-xs" style={{ color: errorColor }}>{errors.summary}</p>
                                : <span />
                            }
                            <span className="text-xs" style={{ color: form.summary.length < 50 ? (isDark ? '#475569' : '#94a3b8') : '#34d399' }}>
                                {form.summary.length}/50+
                            </span>
                        </div>
                    </Field>

                    {/* Detail */}
                    <Field label="Technical Deep Detail" required>
                        <textarea
                            rows={6}
                            placeholder="In-depth technical analysis, methodologies, data, citations... (min. 100 characters)"
                            value={form.detail}
                            onChange={e => set('detail', e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div className="flex justify-between">
                            {errors.detail
                                ? <p className="text-xs" style={{ color: errorColor }}>{errors.detail}</p>
                                : <span />
                            }
                            <span className="text-xs" style={{ color: form.detail.length < 100 ? (isDark ? '#475569' : '#94a3b8') : '#34d399' }}>
                                {form.detail.length}/100+
                            </span>
                        </div>
                    </Field>

                    {/* Difficulty */}
                    <Field label={`Difficulty Level: ${form.difficulty}/5`}>
                        <input
                            type="range"
                            min={1} max={5} step={1}
                            value={form.difficulty}
                            onChange={e => set('difficulty', parseInt(e.target.value))}
                            className="w-full"
                            style={{ accentColor: isDark ? '#4fc3f7' : '#0284c7' }}
                        />
                        <div className="flex justify-between text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                            <span>1 — Beginner</span>
                            <span>3 — Intermediate</span>
                            <span>5 — Expert</span>
                        </div>
                        <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <span key={i} style={{ fontSize: 18, color: i <= form.difficulty ? '#f5a623' : 'rgba(245,166,35,0.15)', transition: 'color 0.1s' }}>★</span>
                            ))}
                        </div>
                    </Field>

                    {/* Guidelines note */}
                    <div
                        className="flex items-start gap-2 p-3 rounded-xl"
                        style={{
                            background: isDark ? 'rgba(79,195,247,0.06)' : 'rgba(2,132,199,0.05)',
                            border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.15)'}`,
                        }}
                    >
                        <AlertCircle size={14} style={{ color: isDark ? '#4fc3f7' : '#0284c7', flexShrink: 0, marginTop: 1 }} />
                        <p className="text-xs leading-relaxed" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            All entries are reviewed for accuracy and relevance before being added to the archive. Entries with citations and real-world examples are prioritised. Coordinates are checked against the existing grid to avoid collisions.
                        </p>
                    </div>

                    {/* Submit */}
                    <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                            boxShadow: '0 0 24px rgba(124,58,237,0.4)',
                            fontSize: 15,
                        }}
                    >
                        <Upload size={17} />
                        Submit to the Archive
                    </motion.button>
                </motion.form>
            </div>
        </div>
    )
}
