import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { reportAuthError } from '../auth/logger.js'
import '../styles/solar-join.css'

/**
 * Landing route for signup email-verification links (/#/email-link-verified).
 *
 * Clerk appends its status params to the redirect URL. Depending on how the
 * URL is composed they can land either in the real query string
 * (origin/?__clerk_status=…#/email-link-verified) or inside the hash
 * (origin/#/email-link-verified?__clerk_status=…). Clerk only reads
 * location.search, so the in-hash form is normalized first.
 *
 * The original signup tab polls independently (startEmailLinkFlow) and
 * completes on its own — this page is confirmation UX for the tab the
 * link was opened in.
 */
function normalizeClerkParams() {
    const { hash, search, pathname } = window.location
    const qIdx = hash.indexOf('?')
    if (search || qIdx === -1) return
    const qs = hash.slice(qIdx)
    const cleanHash = hash.slice(0, qIdx)
    window.history.replaceState(null, '', pathname + qs + cleanHash)
}

const COPY = {
    working: {
        icon: Clock,
        title: 'Verifying your email…',
        sub: 'One moment while we confirm your verification link.',
    },
    verified: {
        icon: CheckCircle2,
        title: 'Email verified!',
        sub: 'You can return to the tab where you signed up — it continues automatically. If you signed up on this device, you can head straight in.',
    },
    expired: {
        icon: Clock,
        title: 'This link has expired',
        sub: 'Go back to the signup tab and request a fresh link, or use the 6-digit code instead.',
    },
    failed: {
        icon: XCircle,
        title: 'Verification failed',
        sub: 'This link is invalid or was already used. Return to the signup tab and use the 6-digit code instead.',
    },
}

export default function EmailLinkVerified() {
    const clerk = useClerk()
    const navigate = useNavigate()
    const { isSignedIn } = useUser()
    const [status, setStatus] = useState('working')
    const ran = useRef(false)

    useEffect(() => {
        if (ran.current) return // StrictMode double-invoke guard: the token is single-use
        ran.current = true
        normalizeClerkParams()
        clerk
            .handleEmailLinkVerification({})
            .then(() => setStatus('verified'))
            .catch((err) => {
                reportAuthError('email-link-landing', err)
                setStatus(err?.code === 'expired' ? 'expired' : 'failed')
            })
    }, [clerk])

    const { icon: Icon, title, sub } = COPY[status]

    return (
        <div className="sj-page" style={{ alignItems: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="sj-card"
                style={{ margin: '0 auto', textAlign: 'center' }}
            >
                <div className="sj-verify-icon" style={{ color: status === 'verified' ? 'var(--sj-ok)' : status === 'working' ? 'var(--sj-ink)' : 'var(--sj-danger)' }}>
                    {status === 'working' ? <span className="sj-spinner" style={{ borderColor: 'rgba(127,127,127,0.3)', borderTopColor: 'currentColor', width: 22, height: 22 }} /> : <Icon size={30} />}
                </div>
                <h1 className="sj-card__title">{title}</h1>
                <p className="sj-card__sub" style={{ marginBottom: 20 }}>{sub}</p>

                {status === 'verified' && isSignedIn && (
                    <button type="button" className="sj-submit" onClick={() => navigate('/')}>
                        Enter the Archive <ArrowRight size={14} />
                    </button>
                )}
                {(status === 'expired' || status === 'failed') && (
                    <button type="button" className="sj-submit" onClick={() => navigate('/join')}>
                        Back to sign up <ArrowRight size={14} />
                    </button>
                )}
            </motion.div>
        </div>
    )
}
