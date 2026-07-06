import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    ShieldCheck, KeyRound, Smartphone, Fingerprint, Monitor,
    LogOut, Trash2, Copy, Check, RefreshCw,
} from 'lucide-react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import OtpInput from '../components/auth/OtpInput.jsx'

function Card({ title, icon: Icon, isDark, children }) {
    return (
        <section
            className="rounded-2xl p-5 sm:p-6"
            style={{
                background: isDark ? 'rgba(7,20,40,0.85)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${isDark ? 'rgba(79,195,247,0.16)' : 'rgba(15,23,42,0.1)'}`,
            }}
        >
            <h2 className="flex items-center gap-2.5 text-sm font-bold mb-4"
                style={{ color: isDark ? '#f1f5f9' : '#111827' }}>
                <Icon size={17} style={{ color: isDark ? '#4fc3f7' : '#0284c7' }} aria-hidden />
                {title}
            </h2>
            {children}
        </section>
    )
}

function SectionError({ message }) {
    if (!message) return null
    return (
        <p className="text-xs px-3 py-2 rounded-lg mb-3" role="alert" style={{
            color: '#f87171', background: 'rgba(239,68,68,0.09)',
            border: '1px solid rgba(239,68,68,0.22)',
        }}>
            {message}
        </p>
    )
}

const btnStyle = (isDark, variant = 'primary') => ({
    padding: '9px 16px',
    borderRadius: 11,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: variant === 'danger'
        ? '1px solid rgba(239,68,68,0.3)'
        : `1px solid ${isDark ? 'rgba(79,195,247,0.3)' : 'rgba(2,132,199,0.25)'}`,
    background: variant === 'danger'
        ? 'rgba(239,68,68,0.08)'
        : isDark ? 'rgba(79,195,247,0.1)' : 'rgba(2,132,199,0.08)',
    color: variant === 'danger' ? '#ef4444' : isDark ? '#4fc3f7' : '#0284c7',
})

export default function AccountSecurity() {
    const { user, isLoaded } = useUser()
    const { session: currentSession } = useSession()
    const { username, email, avatarUrl } = useAuth()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const muted = isDark ? '#64748b' : '#475569'
    const strong = isDark ? '#f1f5f9' : '#111827'

    /* ── TOTP state ── */
    const [totpSetup, setTotpSetup] = useState(null) // { secret, uri }
    const [totpCode, setTotpCode] = useState('')
    const [totpError, setTotpError] = useState('')
    const [totpBusy, setTotpBusy] = useState(false)
    const [backupCodes, setBackupCodes] = useState(null)
    const [copied, setCopied] = useState(false)

    /* ── Passkeys ── */
    const [passkeyError, setPasskeyError] = useState('')
    const [passkeyBusy, setPasskeyBusy] = useState(false)

    /* ── Sessions ── */
    const [sessions, setSessions] = useState([])
    const [sessionsError, setSessionsError] = useState('')
    const [sessionsBusy, setSessionsBusy] = useState(false)

    const loadSessions = useCallback(async () => {
        if (!user) return
        setSessionsError('')
        try {
            const list = await user.getSessions()
            setSessions(list.filter((s) => s.status === 'active'))
        } catch {
            setSessionsError('Could not load active sessions.')
        }
    }, [user])

    useEffect(() => { loadSessions() }, [loadSessions])

    if (!isLoaded || !user) return null

    /* ── TOTP handlers ── */
    const startTotp = async () => {
        setTotpError(''); setTotpBusy(true)
        try {
            const totp = await user.createTOTP()
            setTotpSetup({ secret: totp.secret, uri: totp.uri })
        } catch (err) {
            setTotpError(
                err?.errors?.[0]?.message ||
                'Authenticator apps are not enabled for this project yet. Ask the admin to enable TOTP in the Clerk dashboard.',
            )
        } finally { setTotpBusy(false) }
    }

    const confirmTotp = async (code) => {
        const c = (typeof code === 'string' ? code : totpCode).trim()
        if (c.length !== 6) return
        setTotpError(''); setTotpBusy(true)
        try {
            await user.verifyTOTP({ code: c })
            const backup = await user.createBackupCode()
            setBackupCodes(backup.codes)
            setTotpSetup(null)
            setTotpCode('')
        } catch {
            setTotpError('Incorrect code — check your authenticator app and try again.')
        } finally { setTotpBusy(false) }
    }

    const removeTotp = async () => {
        setTotpError(''); setTotpBusy(true)
        try {
            await user.disableTOTP()
            setBackupCodes(null)
        } catch {
            setTotpError('Could not disable two-factor authentication.')
        } finally { setTotpBusy(false) }
    }

    const regenBackupCodes = async () => {
        setTotpError(''); setTotpBusy(true)
        try {
            const backup = await user.createBackupCode()
            setBackupCodes(backup.codes)
        } catch {
            setTotpError('Could not generate backup codes.')
        } finally { setTotpBusy(false) }
    }

    const copyCodes = async () => {
        try {
            await navigator.clipboard.writeText((backupCodes || []).join('\n'))
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
        } catch { /* clipboard unavailable */ }
    }

    /* ── Passkey handlers ── */
    const addPasskey = async () => {
        setPasskeyError(''); setPasskeyBusy(true)
        try {
            await user.createPasskey()
        } catch (err) {
            setPasskeyError(
                err?.errors?.[0]?.message ||
                'Passkeys are not enabled for this project yet, or your device does not support them.',
            )
        } finally { setPasskeyBusy(false) }
    }

    const removePasskey = async (pk) => {
        setPasskeyError('')
        try { await pk.delete() } catch { setPasskeyError('Could not remove this passkey.') }
    }

    /* ── Session handlers ── */
    const revokeSession = async (s) => {
        setSessionsBusy(true)
        try { await s.revoke(); await loadSessions() } catch { setSessionsError('Could not sign out that device.') }
        setSessionsBusy(false)
    }

    const revokeAllOthers = async () => {
        setSessionsBusy(true)
        try {
            await Promise.all(
                sessions.filter((s) => s.id !== currentSession?.id).map((s) => s.revoke()),
            )
            await loadSessions()
        } catch { setSessionsError('Could not sign out other devices.') }
        setSessionsBusy(false)
    }

    const describeSession = (s) => {
        const a = s.latestActivity
        const device = a?.deviceType || (a?.isMobile ? 'Mobile' : 'Desktop')
        const browser = a?.browserName || 'Unknown browser'
        const place = [a?.city, a?.country].filter(Boolean).join(', ')
        return { device, browser, place }
    }

    return (
        <div className="solar-page">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl mx-auto px-4 pb-16 flex flex-col gap-5"
                style={{ paddingTop: 'calc(92px + env(safe-area-inset-top))' }}
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-1">
                    <span className="flex items-center justify-center rounded-full overflow-hidden shrink-0"
                        style={{
                            width: 56, height: 56,
                            background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)',
                            border: `2px solid ${isDark ? 'rgba(79,195,247,0.45)' : 'rgba(2,132,199,0.4)'}`,
                        }}>
                        {avatarUrl
                            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : <span className="text-white font-bold text-xl">{(username || '?')[0]?.toUpperCase()}</span>}
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold truncate" style={{ color: strong }}>
                            Account &amp; Security
                        </h1>
                        <p className="text-xs truncate" style={{ color: muted }}>
                            {username} · {email}
                        </p>
                    </div>
                </div>

                {/* ── Two-factor authentication ── */}
                <Card title="Two-factor authentication" icon={Smartphone} isDark={isDark}>
                    <SectionError message={totpError} />

                    {user.totpEnabled && !totpSetup ? (
                        <>
                            <p className="flex items-center gap-2 text-xs mb-4" style={{ color: '#34d399' }}>
                                <ShieldCheck size={14} /> Enabled — your account requires an authenticator code at sign-in.
                            </p>
                            <div className="flex flex-wrap gap-2.5">
                                <button type="button" style={btnStyle(isDark)} onClick={regenBackupCodes} disabled={totpBusy}>
                                    <RefreshCw size={13} /> New backup codes
                                </button>
                                <button type="button" style={btnStyle(isDark, 'danger')} onClick={removeTotp} disabled={totpBusy}>
                                    Disable 2FA
                                </button>
                            </div>
                        </>
                    ) : totpSetup ? (
                        <div className="flex flex-col gap-3.5">
                            <p className="text-xs leading-relaxed" style={{ color: muted }}>
                                1. Add this key to your authenticator app (Google Authenticator, 1Password, Authy…):
                            </p>
                            <code className="text-xs px-3 py-2.5 rounded-lg break-all select-all" style={{
                                background: isDark ? 'rgba(2,4,8,0.6)' : 'rgba(240,244,248,0.9)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'}`,
                                color: strong,
                            }}>
                                {totpSetup.secret}
                            </code>
                            <p className="text-xs" style={{ color: muted }}>
                                2. Enter the 6-digit code the app shows:
                            </p>
                            <OtpInput value={totpCode} onChange={setTotpCode} onComplete={confirmTotp}
                                disabled={totpBusy} ariaLabel="Authenticator setup code" />
                            <div className="flex gap-2.5">
                                <button type="button" style={btnStyle(isDark)}
                                    onClick={() => confirmTotp()} disabled={totpBusy || totpCode.length !== 6}>
                                    <Check size={13} /> Confirm
                                </button>
                                <button type="button" style={btnStyle(isDark, 'danger')}
                                    onClick={() => { setTotpSetup(null); setTotpCode('') }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs leading-relaxed mb-4" style={{ color: muted }}>
                                Add an extra layer of protection: after entering your password, you&apos;ll also
                                need a 6-digit code from an authenticator app on your phone.
                            </p>
                            <button type="button" style={btnStyle(isDark)} onClick={startTotp} disabled={totpBusy}>
                                <Smartphone size={13} /> Set up authenticator app
                            </button>
                        </>
                    )}

                    {backupCodes && (
                        <div className="mt-4 p-3.5 rounded-xl" style={{
                            background: isDark ? 'rgba(245,166,35,0.06)' : 'rgba(245,166,35,0.07)',
                            border: '1px solid rgba(245,166,35,0.3)',
                        }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: '#f5a623' }}>
                                Backup codes — store these somewhere safe. Each works once; they will not be shown again.
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                                {backupCodes.map((c) => (
                                    <code key={c} className="text-xs px-2 py-1 rounded select-all" style={{
                                        background: isDark ? 'rgba(2,4,8,0.55)' : 'rgba(255,255,255,0.8)',
                                        color: strong,
                                    }}>{c}</code>
                                ))}
                            </div>
                            <button type="button" style={btnStyle(isDark)} onClick={copyCodes}>
                                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy all</>}
                            </button>
                        </div>
                    )}
                </Card>

                {/* ── Passkeys ── */}
                <Card title="Passkeys" icon={Fingerprint} isDark={isDark}>
                    <SectionError message={passkeyError} />
                    <p className="text-xs leading-relaxed mb-4" style={{ color: muted }}>
                        Sign in with your fingerprint, face, or device PIN — no password needed.
                    </p>
                    {user.passkeys?.length > 0 && (
                        <ul className="flex flex-col gap-2 mb-4">
                            {user.passkeys.map((pk) => (
                                <li key={pk.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl"
                                    style={{
                                        background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(243,244,246,0.8)',
                                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.07)'}`,
                                    }}>
                                    <span className="text-xs font-medium truncate" style={{ color: strong }}>
                                        {pk.name || 'Passkey'}
                                    </span>
                                    <button type="button" aria-label={`Remove ${pk.name || 'passkey'}`}
                                        onClick={() => removePasskey(pk)}
                                        className="shrink-0 p-1.5 rounded-lg"
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" style={btnStyle(isDark)} onClick={addPasskey} disabled={passkeyBusy}>
                        <Fingerprint size={13} /> Add a passkey
                    </button>
                </Card>

                {/* ── Active sessions ── */}
                <Card title="Active sessions" icon={Monitor} isDark={isDark}>
                    <SectionError message={sessionsError} />
                    <ul className="flex flex-col gap-2 mb-4">
                        {sessions.map((s) => {
                            const { device, browser, place } = describeSession(s)
                            const isCurrent = s.id === currentSession?.id
                            return (
                                <li key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl"
                                    style={{
                                        background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(243,244,246,0.8)',
                                        border: `1px solid ${isCurrent
                                            ? (isDark ? 'rgba(52,211,153,0.35)' : 'rgba(5,150,105,0.3)')
                                            : (isDark ? 'rgba(79,195,247,0.1)' : 'rgba(15,23,42,0.07)')}`,
                                    }}>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold truncate" style={{ color: strong }}>
                                            {browser} · {device}
                                            {isCurrent && (
                                                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                    style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)' }}>
                                                    THIS DEVICE
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[11px] truncate" style={{ color: muted }}>
                                            {place || 'Location unknown'} · last active{' '}
                                            {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : 'recently'}
                                        </p>
                                    </div>
                                    {!isCurrent && (
                                        <button type="button" style={btnStyle(isDark, 'danger')}
                                            onClick={() => revokeSession(s)} disabled={sessionsBusy}>
                                            <LogOut size={13} /> Sign out
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                    {sessions.filter((s) => s.id !== currentSession?.id).length > 0 && (
                        <button type="button" style={btnStyle(isDark, 'danger')} onClick={revokeAllOthers} disabled={sessionsBusy}>
                            <LogOut size={13} /> Sign out all other devices
                        </button>
                    )}
                </Card>
            </motion.div>
        </div>
    )
}
