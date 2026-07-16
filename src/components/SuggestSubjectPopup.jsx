import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, CheckCircle2, Loader2, UserPlus } from 'lucide-react'
import '../styles/archive-compass-layers.css'

const MAX_TITLE_LEN = 80

/**
 * Inline "suggest a subject" popup for the L2/L3 compass -- replaces the
 * old navigate-to-/submit flow so the user never leaves the compass view.
 * Guests are blocked here explicitly: this popup writes directly to
 * archive_entries and is reachable from /archive/:planetId, which is a
 * RequireAuth (not RequireMember) route guests can browse -- the normal
 * /submit page's RequireMember gate never runs for this path, so the
 * member-only check has to happen inside the popup itself.
 */
export default function SuggestSubjectPopup({ open, isDark, isGuest, domainLabel, color, onClose, onSubmit }) {
    const [title, setTitle] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)
    const inputRef = useRef(null)
    const accent = color || '#f5a623'

    useEffect(() => {
        if (!open) return
        setTitle('')
        setBusy(false)
        setError('')
        setDone(false)
        const raf = requestAnimationFrame(() => inputRef.current?.focus())
        return () => cancelAnimationFrame(raf)
    }, [open])

    useEffect(() => {
        if (!open || !done) return
        const t = setTimeout(() => onClose?.(), 1800)
        return () => clearTimeout(t)
    }, [open, done, onClose])

    if (!open) return null

    const cardBg = isDark ? 'rgba(7,12,24,0.94)' : 'rgba(255,255,255,0.97)'
    const border = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.1)'
    const heading = isDark ? '#f8fafc' : '#0f172a'
    const muted = isDark ? '#94a3b8' : '#475569'

    const handleSubmit = async (e) => {
        e.preventDefault()
        const trimmed = title.trim()
        if (!trimmed) { setError('Enter a subject title.'); return }
        if (trimmed.length > MAX_TITLE_LEN) { setError(`Keep it under ${MAX_TITLE_LEN} characters.`); return }
        setError('')
        setBusy(true)
        const result = await onSubmit?.(trimmed)
        setBusy(false)
        if (result?.ok) {
            setDone(true)
        } else {
            setError(result?.error || "Couldn't save your suggestion. Please try again.")
        }
    }

    return (
        <div
            className="ssp-backdrop"
            role="presentation"
            onClick={onClose}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Suggest a subject"
                className="ssp-card"
                style={{ background: cardBg, borderColor: border, color: heading, '--ssp-accent': accent }}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Escape') onClose?.()
                }}
            >
                <button type="button" className="ssp-close" onClick={onClose} aria-label="Close">
                    <X size={15} />
                </button>

                {isGuest ? (
                    <div className="ssp-guest">
                        <UserPlus size={22} style={{ color: accent }} aria-hidden />
                        <p className="ssp-guest__title" style={{ color: heading }}>Sign up to suggest a subject</p>
                        <p className="ssp-guest__body" style={{ color: muted }}>
                            You&apos;re browsing as a guest. Suggestions are credited to a profile, so this needs a free account.
                        </p>
                        <Link to="/join?mode=signup" className="ssp-guest__cta" style={{ background: accent }}>
                            Create a free account
                        </Link>
                    </div>
                ) : done ? (
                    <div className="ssp-success">
                        <CheckCircle2 size={26} style={{ color: '#34d399' }} aria-hidden />
                        <p className="ssp-success__title" style={{ color: heading }}>Submitted for review</p>
                        <p className="ssp-success__body" style={{ color: muted }}>
                            Three reviewers need to approve it before it&apos;s added.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="ssp-eyebrow" style={{ color: accent }}>Suggest a subject</p>
                        <h2 className="ssp-heading" style={{ color: heading }}>
                            {domainLabel ? `Under ${domainLabel}` : 'New subject'}
                        </h2>

                        <label className="ssp-label" htmlFor="ssp-title" style={{ color: muted }}>
                            Subject title
                        </label>
                        <input
                            id="ssp-title"
                            ref={inputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={MAX_TITLE_LEN}
                            placeholder="e.g. Composting Systems for Small Farms"
                            className="ssp-input"
                            style={{ borderColor: border, color: heading }}
                            disabled={busy}
                        />
                        <p className="ssp-hint" style={{ color: muted }}>
                            Reviewed by 3 reviewers before it&apos;s added.
                        </p>

                        {error && <p className="ssp-error">{error}</p>}

                        <div className="ssp-actions">
                            <button type="button" className="ssp-btn ssp-btn--ghost" onClick={onClose} disabled={busy}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="ssp-btn ssp-btn--primary"
                                style={{ background: accent }}
                                disabled={busy || !title.trim()}
                            >
                                {busy ? <Loader2 size={14} className="ssp-spin" aria-hidden /> : null}
                                {busy ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    )
}
