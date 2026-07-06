import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    UserPlus, LogIn, Lock, Eye, EyeOff, ArrowRight,
    ShieldCheck, KeyRound, Check, Mail,
} from 'lucide-react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import FoundationLogo from '../components/FoundationLogo.jsx'
import OtpInput from '../components/auth/OtpInput.jsx'
import JoinAmbient from '../components/auth/JoinAmbient.jsx'
import { supabase } from '../utils/supabaseClient.js'
import {
    validateSignUp, validateSignIn, validateEmail, validatePassword,
    passwordChecklist, passwordStrength, STRENGTH_LEVELS,
    normalizeEmail, normalizeName,
} from '../auth/validation.js'
import { reportAuthError } from '../auth/logger.js'
import '../styles/solar-join.css'

/* ── Security constants ─────────────────────────────────── */
const CODE_TTL_MS = 10 * 60 * 1000        // verification code lifetime
const MAX_VERIFY_ATTEMPTS = 5             // wrong codes before forcing a resend
const RESEND_COOLDOWN_MS = 60 * 1000      // between resend requests
const MAX_RESENDS_PER_HOUR = 5
const RESEND_LS_PREFIX = 'sj-resend:'

/* Client-side resend budget: max N sends per rolling hour per email. */
function consumeResendBudget(email) {
    const key = RESEND_LS_PREFIX + email
    const now = Date.now()
    let stamps = []
    try { stamps = JSON.parse(localStorage.getItem(key)) || [] } catch { /* corrupt entry */ }
    stamps = stamps.filter((t) => now - t < 60 * 60 * 1000)
    if (stamps.length >= MAX_RESENDS_PER_HOUR) return false
    stamps.push(now)
    try { localStorage.setItem(key, JSON.stringify(stamps)) } catch { /* storage full */ }
    return true
}

/* Map Clerk sign-in failures to messages that never reveal whether the
   email exists or which credential was wrong. */
function signInErrorMessage(err) {
    const code = err?.errors?.[0]?.code || ''
    if (code === 'too_many_requests' || err?.status === 429) {
        return 'Too many attempts. Please wait a moment and try again.'
    }
    if (code === 'session_exists') return null // already signed in — not an error
    if (code === 'strategy_for_user_invalid') {
        // account was created via OAuth and has no password
        return 'This account uses Google or GitHub sign-in — use those buttons below.'
    }
    return 'Invalid email or password.'
}

function signUpErrorMessage(err) {
    const code = err?.errors?.[0]?.code || ''
    if (code === 'form_identifier_exists') {
        return 'An account with this email already exists — sign in instead.'
    }
    if (code === 'form_password_pwned') {
        return 'This password appears in a known data breach. Please choose a different one.'
    }
    if (code === 'too_many_requests' || err?.status === 429) {
        return 'Too many attempts. Please wait a moment and try again.'
    }
    return err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Sign up failed. Please try again.'
}

const OAUTH_PROVIDERS = [
    {
        strategy: 'oauth_google',
        label: 'Google',
        icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
        ),
    },
    {
        strategy: 'oauth_github',
        label: 'GitHub',
        icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
        ),
    },
]

const OAUTH_NAMES = { oauth_google: 'Google', oauth_github: 'GitHub' }

const EMPTY_FORM = {
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '',
    terms: false, privacy: false,
}

export default function Join() {
    const navigate = useNavigate()
    const { isLoggedIn, authLoaded } = useAuth()
    const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn()
    const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const clerkReady = signInLoaded && signUpLoaded

    // view: signin | signup | verify | mfa | forgot | reset
    const [view, setView] = useState('signin')
    const [form, setForm] = useState(EMPTY_FORM)
    const [fieldErrors, setFieldErrors] = useState({})
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(null) // 'login' | 'signup' | 'reset'

    // verification / OTP state (shared by email-verify and password-reset)
    const [otp, setOtp] = useState('')
    const [codeSentAt, setCodeSentAt] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [resendReadyAt, setResendReadyAt] = useState(0)
    const [nowTick, setNowTick] = useState(Date.now())

    // MFA second factor — `mfaFactor` is whichever strategy Clerk actually
    // offered this account (totp / phone_code / backup_code); the UI adapts
    // instead of hardcoding totp, which would dead-end phone-only accounts.
    const [mfaFactor, setMfaFactor] = useState(null)
    const [mfaHasBackup, setMfaHasBackup] = useState(false)
    const [mfaBackup, setMfaBackup] = useState(false)

    // Email-link verification (alternative to the OTP code). While
    // `linkWait` is true the verify view shows a waiting panel and
    // `linkFlowRef` holds the cancellable Clerk polling flow.
    const [linkWait, setLinkWait] = useState(false)
    const linkFlowRef = useRef(null)
    useEffect(() => () => { linkFlowRef.current?.cancelEmailLinkFlow() }, [])

    const set = (k, v) => {
        setForm((f) => ({ ...f, [k]: v }))
        setFieldErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
    }

    // 1-second tick drives the resend countdown + expiry display
    const needsTimer = view === 'verify' || view === 'reset'
    useEffect(() => {
        if (!needsTimer) return undefined
        const t = setInterval(() => setNowTick(Date.now()), 1000)
        return () => clearInterval(t)
    }, [needsTimer])

    const resendWaitSec = Math.max(0, Math.ceil((resendReadyAt - nowTick) / 1000))
    const codeExpired = codeSentAt > 0 && nowTick - codeSentAt > CODE_TTL_MS
    const attemptsExhausted = attempts >= MAX_VERIFY_ATTEMPTS
    const strength = useMemo(() => passwordStrength(form.password), [form.password])
    const checklist = useMemo(() => passwordChecklist(form.password), [form.password])

    const switchView = (v) => {
        linkFlowRef.current?.cancelEmailLinkFlow()
        setLinkWait(false)
        setView(v)
        setError('')
        setNotice('')
        setFieldErrors({})
        setOtp('')
        setShowPass(false)
        setShowConfirm(false)
        setMfaBackup(false)
        setMfaFactor(null)
        setMfaHasBackup(false)
    }

    /* Persist profile (with names) to Supabase before session activation so
       AuthContext's sync finds the completed row. Falls back to the minimal
       column set if the extended columns don't exist yet. */
    const saveProfile = async (clerkId, { firstName, lastName, email }) => {
        if (!clerkId) return
        const username = `${firstName} ${lastName}`.trim() || email.split('@')[0] || 'user'
        const base = { clerk_id: clerkId, username, email, points: 0 }
        const { error: err } = await supabase.from('users_profile').upsert(
            { ...base, first_name: firstName, last_name: lastName },
            { onConflict: 'clerk_id' },
        )
        if (err) {
            reportAuthError('profile-save', err)
            const { error: retryErr } = await supabase
                .from('users_profile')
                .upsert(base, { onConflict: 'clerk_id' })
            if (retryErr) reportAuthError('profile-save-retry', retryErr)
        }
    }

    const finish = async (setActive, sessionId, doneMode) => {
        // done must be set BEFORE setActive: activating the session flips
        // isLoggedIn mid-await, and the <Navigate> guard below would bounce
        // us away before the success screen ever rendered.
        setDone(doneMode)
        try {
            await setActive({ session: sessionId })
        } catch (err) {
            setDone(null)
            throw err
        }
        setTimeout(() => navigate('/'), 700)
    }

    /* ── Sign in ──────────────────────────────────────────── */
    const submitSignIn = async (e) => {
        e.preventDefault()
        setError('')
        if (!clerkReady) return
        const { errors, values } = validateSignIn(form)
        if (Object.keys(errors).length) { setFieldErrors(errors); return }

        setLoading(true)
        try {
            const result = await signIn.create({ identifier: values.email, password: values.password })
            if (result.status === 'complete') {
                await finish(setSignInActive, result.createdSessionId, 'login')
            } else if (result.status === 'needs_second_factor') {
                // Pick whichever factor Clerk actually enrolled this account
                // with. The Clerk dashboard's Multi-factor settings can enable
                // ANY of totp / phone_code / email_code as the second factor
                // independent of which first-factor identifiers exist, so all
                // four must be handled — hardcoding one strategy dead-ends
                // every account enrolled in a different one.
                const factors = result.supportedSecondFactors || []
                const totp = factors.find((f) => f.strategy === 'totp')
                const phone = factors.find((f) => f.strategy === 'phone_code')
                const emailFactor = factors.find((f) => f.strategy === 'email_code')
                const backup = factors.find((f) => f.strategy === 'backup_code')
                const primary = totp || phone || emailFactor || backup || null
                // phone_code and email_code are OTP strategies that must be
                // triggered (SMS/email sent) before an attempt can succeed;
                // totp and backup_code are attempted directly, no prepare step.
                if (primary?.strategy === 'phone_code') {
                    try {
                        await signIn.prepareSecondFactor({
                            strategy: 'phone_code',
                            phoneNumberId: primary.phoneNumberId,
                        })
                    } catch (err) {
                        reportAuthError('mfa-prepare', err)
                    }
                } else if (primary?.strategy === 'email_code') {
                    try {
                        await signIn.prepareSecondFactor({
                            strategy: 'email_code',
                            emailAddressId: primary.emailAddressId,
                        })
                    } catch (err) {
                        reportAuthError('mfa-prepare', err)
                    }
                }
                switchView('mfa')
                // Set AFTER switchView — it resets these fields for every
                // view change, so setting them first would be wiped out.
                setMfaFactor(primary)
                setMfaHasBackup(!!backup)
            } else {
                setError('Invalid email or password.')
            }
        } catch (err) {
            reportAuthError('signin', err)
            const msg = signInErrorMessage(err)
            if (msg === null) { navigate('/') } else { setError(msg) }
        } finally {
            setLoading(false)
        }
    }

    /* ── MFA second factor (TOTP, phone code, or backup code) ── */
    const submitMfa = async (e) => {
        e.preventDefault()
        setError('')
        const mfaCode = otp.trim()
        if (!mfaCode) { setError('Enter your verification code.'); return }
        setLoading(true)
        try {
            const strategy = mfaBackup ? 'backup_code' : (mfaFactor?.strategy || 'totp')
            const result = await signIn.attemptSecondFactor({ strategy, code: mfaCode })
            if (result.status === 'complete') {
                await finish(setSignInActive, result.createdSessionId, 'login')
            } else {
                setError('Verification failed. Please try again.')
            }
        } catch (err) {
            reportAuthError('mfa', err)
            setError('Invalid code. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    /* ── Sign up ──────────────────────────────────────────── */
    const submitSignUp = async (e) => {
        e.preventDefault()
        setError('')
        if (!clerkReady) return
        const { errors, values } = validateSignUp(form)
        if (Object.keys(errors).length) { setFieldErrors(errors); return }

        setLoading(true)
        try {
            // Build the richest payload the instance accepts. If Clerk rejects a
            // param as unknown (field disabled in dashboard), strip exactly that
            // param and retry rather than dropping everything.
            const paramToKey = {
                first_name: 'firstName',
                last_name: 'lastName',
                legal_accepted: 'legalAccepted',
                username: 'username',
            }
            const payload = {
                emailAddress: values.email,
                password: values.password,
                firstName: values.firstName,
                lastName: values.lastName,
                legalAccepted: true, // user ticked both consent boxes
            }
            let result
            for (let i = 0; i <= 4; i++) {
                try {
                    result = await signUp.create(payload)
                    break
                } catch (err) {
                    const e = err?.errors?.[0]
                    const key = paramToKey[e?.meta?.paramName]
                    if (e?.code === 'form_param_unknown' && key && key in payload) {
                        delete payload[key]
                        continue
                    }
                    throw err
                }
            }
            if (!result) throw new Error('sign-up could not be created after retries')

            if (result.status === 'complete') {
                await saveProfile(result.createdUserId, values)
                await finish(setSignUpActive, result.createdSessionId, 'signup')
            } else if (result.status === 'missing_requirements') {
                // Fields this flow can satisfy: email via the verification step,
                // the rest via fulfillMissingFields(). Anything else (e.g. a
                // dashboard-required phone_number) would dead-end AFTER the user
                // verified their email — so refuse loudly now, before sending one.
                const SATISFIABLE = new Set([
                    'email_address', 'first_name', 'last_name', 'legal_accepted', 'username',
                ])
                const blockers = (result.missingFields || []).filter((f) => !SATISFIABLE.has(f))
                if (blockers.length > 0) {
                    reportAuthError('signup-config', { message: `instance requires: ${blockers.join(', ')}` })
                    setError(
                        `Sign-up is blocked by project configuration: Clerk requires “${blockers.join(', ')}”, which this form does not collect. ` +
                        'In the Clerk dashboard → Configure → Email, phone, username, set it to optional or disabled, then try again.',
                    )
                    return
                }
                await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
                setCodeSentAt(Date.now())
                setResendReadyAt(Date.now() + RESEND_COOLDOWN_MS)
                setAttempts(0)
                consumeResendBudget(values.email)
                switchView('verify')
            } else {
                setError('Sign up could not be completed. Please try again.')
            }
        } catch (err) {
            reportAuthError('signup', err)
            setError(signUpErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    /* After a correct code, Clerk can still report missing_requirements if the
       dashboard marks fields as REQUIRED that create() didn't (or couldn't)
       set. Fill every one we can from the form and re-check. */
    const fulfillMissingFields = async () => {
        const missing = signUp.missingFields || []
        const updates = {}
        if (missing.includes('first_name')) updates.firstName = normalizeName(form.firstName) || 'User'
        if (missing.includes('last_name')) updates.lastName = normalizeName(form.lastName) || 'Account'
        if (missing.includes('legal_accepted')) updates.legalAccepted = true
        if (missing.includes('username')) {
            const base = `${normalizeName(form.firstName)}${normalizeName(form.lastName)}`
                .toLowerCase().replace(/[^a-z0-9_-]/g, '')
                || normalizeEmail(form.email).split('@')[0].replace(/[^a-z0-9_-]/g, '')
            updates.username = `${(base || 'user').slice(0, 20)}${Math.floor(1000 + Math.random() * 9000)}`
        }
        if (Object.keys(updates).length === 0) return null
        return signUp.update(updates)
    }

    /* Shared tail of every signup verification path (code or link):
       top up dashboard-required fields, persist the profile, then
       activate the session. Returns false if signup still can't finish. */
    const completeSignUp = async (resultArg) => {
        let result = resultArg
        // Correct verification, but the account still lacks required
        // fields (e.g. username/names/consent marked REQUIRED in the
        // Clerk dashboard). Supply them and re-check — this is NOT a
        // wrong code, so it must not burn a verify attempt.
        if (result.status === 'missing_requirements') {
            const updated = await fulfillMissingFields()
            if (updated) result = updated
        }
        if (result.status !== 'complete') return result
        await saveProfile(result.createdUserId, {
            firstName: normalizeName(form.firstName),
            lastName: normalizeName(form.lastName),
            email: normalizeEmail(form.email),
        })
        await finish(setSignUpActive, result.createdSessionId, 'signup')
        return true
    }

    /* ── Email verification via magic link (alternative to OTP) ── */
    const sendVerificationLink = async () => {
        setError('')
        setNotice('')
        const email = normalizeEmail(form.email)
        if (!consumeResendBudget(email)) {
            setError('Resend limit reached. Please try again in an hour.')
            return
        }
        setLinkWait(true)
        try {
            const flow = signUp.createEmailLinkFlow()
            linkFlowRef.current = flow
            // Resolves only once the user opens the emailed link (any device).
            const result = await flow.startEmailLinkFlow({
                redirectUrl: `${window.location.origin}/#/email-link-verified`,
            })
            const outcome = await completeSignUp(result)
            if (outcome !== true) {
                setLinkWait(false)
                setError('Verification did not complete. Use the 6-digit code instead.')
            }
        } catch (err) {
            reportAuthError('verify-link', err)
            setLinkWait(false)
            const code = err?.errors?.[0]?.code || ''
            setError(
                code === 'verification_strategy_not_allowed' || code === 'form_param_value_invalid'
                    ? 'Verification links are not enabled for this project yet — use the 6-digit code instead.'
                    : 'Could not send a verification link. Use the 6-digit code instead.',
            )
        }
    }

    /* ── Email verification ───────────────────────────────── */
    const submitVerify = async (codeArg) => {
        const code = (typeof codeArg === 'string' ? codeArg : otp).trim()
        setError('')
        if (code.length !== 6 || loading) return
        if (codeExpired) { setError('This code has expired. Request a new one.'); return }
        if (attemptsExhausted) { setError('Too many incorrect attempts. Request a new code.'); return }

        setLoading(true)
        try {
            const result = await signUp.attemptEmailAddressVerification({ code })
            const outcome = await completeSignUp(result)
            if (outcome !== true) {
                const missing = (outcome?.missingFields || []).join(', ')
                setError(
                    missing
                        ? `Your email is verified, but the account still needs: ${missing}. Ask the site admin to relax these fields in Clerk, then sign up again.`
                        : 'Verification did not complete. Please try again.',
                )
            }
        } catch (err) {
            reportAuthError('verify', err)
            setAttempts((a) => a + 1)
            const remaining = MAX_VERIFY_ATTEMPTS - (attempts + 1)
            setError(
                remaining > 0
                    ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                    : 'Too many incorrect attempts. Request a new code.',
            )
        } finally {
            setLoading(false)
            setOtp('')
        }
    }

    const resendCode = async () => {
        setError('')
        if (Date.now() < resendReadyAt) return
        const email = normalizeEmail(form.email)
        if (!consumeResendBudget(email)) {
            setError('Resend limit reached. Please try again in an hour.')
            return
        }
        setLoading(true)
        try {
            if (view === 'verify') {
                await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
            } else {
                await signIn.create({ strategy: 'reset_password_email_code', identifier: email })
            }
            setCodeSentAt(Date.now())
            setResendReadyAt(Date.now() + RESEND_COOLDOWN_MS)
            setAttempts(0)
            setOtp('')
            setNotice('A new code has been sent.')
        } catch (err) {
            reportAuthError('resend', err)
            setError('Could not send a new code. Please try again shortly.')
        } finally {
            setLoading(false)
        }
    }

    /* ── Forgot password ──────────────────────────────────── */
    const submitForgot = async (e) => {
        e.preventDefault()
        setError('')
        const emailErr = validateEmail(form.email)
        if (emailErr) { setFieldErrors({ email: emailErr }); return }

        setLoading(true)
        const email = normalizeEmail(form.email)
        try {
            await signIn.create({ strategy: 'reset_password_email_code', identifier: email })
        } catch (err) {
            // Swallow: response is identical whether or not the account exists,
            // so the form can't be used to enumerate registered emails.
            reportAuthError('forgot', err)
        }
        setLoading(false)
        setCodeSentAt(Date.now())
        setResendReadyAt(Date.now() + RESEND_COOLDOWN_MS)
        setAttempts(0)
        consumeResendBudget(email)
        switchView('reset')
        setNotice("If an account exists for that email, we've sent instructions.")
    }

    /* ── Reset password (code + new password) ─────────────── */
    const submitReset = async (e) => {
        e.preventDefault()
        setError('')
        const code = otp.trim()
        if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
        if (codeExpired) { setError('This code has expired. Request a new one.'); return }
        if (attemptsExhausted) { setError('Too many incorrect attempts. Request a new code.'); return }
        const pwErr = validatePassword(form.password)
        if (pwErr) { setFieldErrors({ password: pwErr }); return }
        if (form.password !== form.confirmPassword) {
            setFieldErrors({ confirmPassword: 'Passwords do not match.' })
            return
        }

        setLoading(true)
        try {
            const attempt = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code,
            })
            if (attempt.status === 'needs_new_password') {
                const result = await signIn.resetPassword({
                    password: form.password,
                    signOutOfOtherSessions: true, // invalidate every other device
                })
                if (result.status === 'complete') {
                    await finish(setSignInActive, result.createdSessionId, 'reset')
                    return
                }
            }
            if (attempt.status === 'complete') {
                await finish(setSignInActive, attempt.createdSessionId, 'reset')
                return
            }
            setError('Password reset did not complete. Please try again.')
        } catch (err) {
            reportAuthError('reset', err)
            setAttempts((a) => a + 1)
            setError(
                err?.errors?.[0]?.code === 'form_code_incorrect'
                    ? 'Incorrect code. Please try again.'
                    : 'Password reset failed. Request a new code and try again.',
            )
        } finally {
            setLoading(false)
        }
    }

    /* ── OAuth ────────────────────────────────────────────── */
    const startOAuth = async (strategy) => {
        setError('')
        if (!clerkReady) return
        const target = view === 'signup' ? signUp : signIn
        try {
            await target.authenticateWithRedirect({
                strategy,
                redirectUrl: `${window.location.origin}/#/sso-callback`,
                redirectUrlComplete: `${window.location.origin}/#/`,
            })
        } catch (err) {
            reportAuthError('oauth', err)
            const name = OAUTH_NAMES[strategy] || 'Social'
            setError(`${name} sign-in is not enabled yet. Use email and password instead.`)
        }
    }

    /* ── Redirect if already signed in ────────────────────── */
    if (authLoaded && isLoggedIn && !done) {
        return <Navigate to="/" replace />
    }

    /* ── Shared UI pieces ─────────────────────────────────── */
    const fieldError = (key) =>
        fieldErrors[key] ? (
            <p id={`sj-err-${key}`} className="sj-field-error" role="alert">{fieldErrors[key]}</p>
        ) : null

    const errorBox = error && (
        <motion.p
            key={error}
            animate={{ x: [0, -8, 8, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            className="sj-error"
            role="alert"
        >
            {error}
        </motion.p>
    )

    const noticeBox = notice && (
        <p className="sj-notice" role="status">{notice}</p>
    )

    const oauthButtons = (
        <>
            <div className="sj-divider">or continue with</div>
            <div className="sj-social">
                {OAUTH_PROVIDERS.map(({ strategy, label, icon }) => (
                    <button
                        key={strategy}
                        type="button"
                        className="sj-social__btn"
                        onClick={() => startOAuth(strategy)}
                        disabled={loading}
                    >
                        {icon}{label}
                    </button>
                ))}
            </div>
        </>
    )

    const heroRise = (delay) => ({
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
    })

    const hero = (
        <div className="sj-hero">
            <JoinAmbient />

            <motion.p className="sj-hero__label" {...heroRise(0)}>
                The Solar Archive — Research Network
            </motion.p>

            <motion.h1 className="sj-hero__title" {...heroRise(0.06)}>
                A <em>galaxy</em> of human knowledge.
            </motion.h1>

            <motion.p className="sj-hero__sub" {...heroRise(0.12)}>
                Nine research hubs. Sixty-four disciplines. One coordinate system for
                everything we know. Create your account to explore the archive, submit
                research, and climb the leaderboard.
            </motion.p>

            <div className="sj-stats">
                {[['9', 'Research hubs'], ['64', 'Subjects'], ['L4–L8', 'Depth layers']].map(([num, label], i) => (
                    <motion.div key={label} className="sj-stat" {...heroRise(0.2 + i * 0.07)}>
                        <div className="sj-stat__num">{num}</div>
                        <div className="sj-stat__label">{label}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    )

    const shell = (content) => (
        <div className="sj-page">
            <div className="sj-page__inner">
                {hero}
                <div className="sj-panel">{content}</div>
            </div>
        </div>
    )

    /* ── Success ──────────────────────────────────────────── */
    if (done) {
        const copy = {
            login: ['Welcome Back!', 'You are now signed in to the SOLAR Archive.'],
            signup: ['Account Created!', 'Your SOLAR Archive account is ready.'],
            reset: ['Password Updated!', 'All other devices have been signed out.'],
        }[done]
        return shell(
            <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="sj-card"
                style={{ textAlign: 'center' }}
            >
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.06, 1] }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="mx-auto mb-5 flex items-center justify-center rounded-full overflow-hidden"
                    style={{
                        width: 104, height: 104,
                        background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                        boxShadow: isDark ? '0 0 40px rgba(245,166,35,0.45)' : '0 0 30px rgba(245,166,35,0.35)',
                    }}
                >
                    <FoundationLogo fillCircle alt="" />
                </motion.div>
                <h2 className="sj-card__title">{copy[0]}</h2>
                <p className="sj-card__sub" style={{ marginBottom: 10 }}>{copy[1]}</p>
                <p style={{ fontSize: 11, color: 'var(--sj-ink-3)' }}>Taking you home…</p>
            </motion.div>,
        )
    }

    /* ── Clerk still initializing → skeleton ──────────────── */
    if (!clerkReady) {
        return shell(
            <div className="sj-card" aria-busy="true" aria-label="Loading sign-in form">
                <div className="sj-skeleton">
                    <div className="sj-skeleton__row sj-skeleton__row--sm" />
                    <div className="sj-skeleton__row" />
                    <div className="sj-skeleton__row" />
                    <div className="sj-skeleton__row" />
                    <div className="sj-skeleton__row sj-skeleton__row--sm" />
                </div>
            </div>,
        )
    }

    /* ── Email verification (signup) ──────────────────────── */
    if (view === 'verify') {
        return shell(
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="sj-card">
                <div className="sj-card__head">
                    <div className="sj-verify-icon">{linkWait ? <Mail size={28} /> : <ShieldCheck size={30} />}</div>
                    <h1 className="sj-card__title">Check your email</h1>
                    <p className="sj-card__sub">
                        {linkWait ? 'We sent a verification link to' : 'We sent a 6-digit code to'}{' '}
                        <strong style={{ color: 'var(--sj-ink)' }}>{normalizeEmail(form.email)}</strong>
                        <br />{linkWait ? 'Open it on any device to continue.' : 'The code expires in 10 minutes.'}
                    </p>
                </div>

                {linkWait ? (
                    <div className="sj-form" role="status" aria-live="polite">
                        <div className="sj-linkwait">
                            <span className="sj-linkwait__beacon" aria-hidden="true"><Mail size={22} /></span>
                            <p className="sj-linkwait__title">Waiting for you to open the link…</p>
                            <p className="sj-linkwait__sub">
                                This page continues automatically the moment the link is opened —
                                no need to come back and refresh.
                            </p>
                        </div>
                        {errorBox}
                        <button
                            type="button"
                            className="sj-link-btn"
                            style={{ alignSelf: 'center' }}
                            onClick={() => { linkFlowRef.current?.cancelEmailLinkFlow(); setLinkWait(false) }}
                        >
                            Use the 6-digit code instead
                        </button>
                        <button type="button" className="sj-back" onClick={() => switchView('signup')}>← Back to sign up</button>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); submitVerify() }} className="sj-form" autoComplete="off">
                        <OtpInput
                            value={otp}
                            onChange={(v) => { setOtp(v); setNotice('') }}
                            onComplete={(code) => submitVerify(code)}
                            disabled={loading || attemptsExhausted || codeExpired}
                            ariaLabel="Email verification code"
                        />

                        {noticeBox}
                        {errorBox}
                        {(codeExpired || attemptsExhausted) && !error && (
                            <p className="sj-error" role="alert">
                                {codeExpired ? 'This code has expired.' : 'Too many incorrect attempts.'} Request a new code below.
                            </p>
                        )}

                        <button type="submit" className="sj-submit" disabled={loading || otp.length !== 6 || attemptsExhausted || codeExpired}>
                            {loading ? <><span className="sj-spinner" /> Verifying…</> : <><ShieldCheck size={16} /> Verify Email <ArrowRight size={14} /></>}
                        </button>

                        <p className="sj-switch" style={{ marginTop: 4 }}>
                            Didn&apos;t receive it?{' '}
                            <button type="button" className="sj-link-btn" onClick={resendCode} disabled={loading || resendWaitSec > 0}>
                                {resendWaitSec > 0 ? `Resend in ${resendWaitSec}s` : 'Resend code'}
                            </button>
                        </p>
                        <p className="sj-switch" style={{ marginTop: -8 }}>
                            Prefer a link?{' '}
                            <button type="button" className="sj-link-btn" onClick={sendVerificationLink} disabled={loading}>
                                Email me a verification link
                            </button>
                        </p>
                        <button type="button" className="sj-back" onClick={() => switchView('signup')}>← Back to sign up</button>
                    </form>
                )}
            </motion.div>,
        )
    }

    /* ── MFA second factor ────────────────────────────────── */
    if (view === 'mfa') {
        const factorIsPhone = mfaFactor?.strategy === 'phone_code'
        const factorIsEmail = mfaFactor?.strategy === 'email_code'
        const mfaSubtitle = mfaBackup
            ? 'Enter one of your backup codes.'
            : factorIsPhone
                ? `Enter the 6-digit code sent to ${mfaFactor?.safeIdentifier || 'your phone'}.`
                : factorIsEmail
                    ? `Enter the 6-digit code sent to ${mfaFactor?.safeIdentifier || 'your email'}.`
                    : 'Enter the 6-digit code from your authenticator app.'
        return shell(
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="sj-card">
                <div className="sj-card__head">
                    <div className="sj-verify-icon"><KeyRound size={28} /></div>
                    <h1 className="sj-card__title">Two-factor authentication</h1>
                    <p className="sj-card__sub">{mfaSubtitle}</p>
                </div>

                <form onSubmit={submitMfa} className="sj-form" autoComplete="off">
                    {mfaBackup ? (
                        <div className="sj-fgroup">
                            <label className="sj-label" htmlFor="sj-backup">Backup code</label>
                            <div className="sj-field">
                                <input
                                    id="sj-backup"
                                    className="sj-input"
                                    type="text"
                                    placeholder="e.g. k3n9-x7f2"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.trim())}
                                    autoComplete="off"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <OtpInput
                            value={otp}
                            onChange={setOtp}
                            disabled={loading}
                            ariaLabel="Authenticator code"
                        />
                    )}

                    {errorBox}

                    <button type="submit" className="sj-submit" disabled={loading || !otp}>
                        {loading ? <><span className="sj-spinner" /> Verifying…</> : <><ShieldCheck size={16} /> Verify <ArrowRight size={14} /></>}
                    </button>

                    {mfaHasBackup && (
                        <button
                            type="button"
                            className="sj-link-btn"
                            style={{ alignSelf: 'center' }}
                            onClick={() => { setMfaBackup((b) => !b); setOtp(''); setError('') }}
                        >
                            {mfaBackup
                                ? `Use ${factorIsPhone ? 'phone code' : factorIsEmail ? 'email code' : 'authenticator app'} instead`
                                : 'Use a backup code instead'}
                        </button>
                    )}
                    <button type="button" className="sj-back" onClick={() => switchView('signin')}>← Back to sign in</button>
                </form>
            </motion.div>,
        )
    }

    /* ── Forgot password (request) ────────────────────────── */
    if (view === 'forgot') {
        return shell(
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="sj-card">
                <div className="sj-card__head">
                    <div className="sj-verify-icon"><Lock size={26} /></div>
                    <h1 className="sj-card__title">Reset password</h1>
                    <p className="sj-card__sub">Enter your email and we&apos;ll send a reset code.</p>
                </div>

                <form onSubmit={submitForgot} className="sj-form" autoComplete="off">
                    <div className="sj-fgroup">
                        <label className="sj-label" htmlFor="sj-forgot-email">Email address</label>
                        <div className="sj-field">
                            <input
                                id="sj-forgot-email"
                                name="email"
                                className="sj-input"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) => set('email', e.target.value)}
                                autoComplete="email"
                                aria-invalid={!!fieldErrors.email}
                                aria-describedby={fieldErrors.email ? 'sj-err-email' : undefined}
                                autoFocus
                                required
                            />
                        </div>
                        {fieldError('email')}
                    </div>
                    {errorBox}

                    <button type="submit" className="sj-submit" disabled={loading}>
                        {loading ? <><span className="sj-spinner" /> Sending…</> : <>Send reset code <ArrowRight size={14} /></>}
                    </button>
                    <button type="button" className="sj-back" onClick={() => switchView('signin')}>← Back to sign in</button>
                </form>
            </motion.div>,
        )
    }

    /* ── Reset password (code + new password) ─────────────── */
    if (view === 'reset') {
        return shell(
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="sj-card">
                <div className="sj-card__head">
                    <div className="sj-verify-icon"><Lock size={26} /></div>
                    <h1 className="sj-card__title">Enter reset code</h1>
                    <p className="sj-card__sub">Check your inbox, then choose a new password.</p>
                </div>

                <form onSubmit={submitReset} className="sj-form" autoComplete="on">
                    {noticeBox}

                    <OtpInput
                        value={otp}
                        onChange={(v) => { setOtp(v); setNotice('') }}
                        disabled={loading || attemptsExhausted || codeExpired}
                        ariaLabel="Password reset code"
                    />

                    <div className="sj-fgroup">
                        <label className="sj-label" htmlFor="sj-new-password">New password</label>
                        <div className="sj-field">
                            <input
                                id="sj-new-password"
                                name="password"
                                className="sj-input"
                                type={showPass ? 'text' : 'password'}
                                placeholder="At least 12 characters"
                                value={form.password}
                                onChange={(e) => set('password', e.target.value)}
                                autoComplete="new-password"
                                aria-invalid={!!fieldErrors.password}
                                aria-describedby={fieldErrors.password ? 'sj-err-password' : undefined}
                                required
                            />
                            <button type="button" className="sj-eye" onClick={() => setShowPass((s) => !s)} tabIndex={-1}
                                aria-label={showPass ? 'Hide password' : 'Show password'}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {fieldError('password')}
                    </div>

                    {form.password.length > 0 && (
                        <div className="sj-checklist" aria-live="polite">
                            {checklist.map((r) => (
                                <span key={r.id} className="sj-checklist__item" data-ok={r.ok}>
                                    <span className="sj-checklist__dot">{r.ok ? <Check size={9} strokeWidth={3.5} /> : null}</span>
                                    {r.label}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="sj-fgroup">
                        <label className="sj-label" htmlFor="sj-confirm-new">Confirm new password</label>
                        <div className="sj-field">
                            <input
                                id="sj-confirm-new"
                                name="confirmPassword"
                                className="sj-input"
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Repeat your new password"
                                value={form.confirmPassword}
                                onChange={(e) => set('confirmPassword', e.target.value)}
                                autoComplete="new-password"
                                aria-invalid={!!fieldErrors.confirmPassword}
                                aria-describedby={fieldErrors.confirmPassword ? 'sj-err-confirmPassword' : undefined}
                                required
                            />
                            <button type="button" className="sj-eye" onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}
                                aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {fieldError('confirmPassword')}
                    </div>
                    {errorBox}

                    <button type="submit" className="sj-submit" disabled={loading || otp.length !== 6 || attemptsExhausted || codeExpired}>
                        {loading ? <><span className="sj-spinner" /> Resetting…</> : <>Reset password <ArrowRight size={14} /></>}
                    </button>

                    <p className="sj-switch" style={{ marginTop: 4 }}>
                        Didn&apos;t receive it?{' '}
                        <button type="button" className="sj-link-btn" onClick={resendCode} disabled={loading || resendWaitSec > 0}>
                            {resendWaitSec > 0 ? `Resend in ${resendWaitSec}s` : 'Resend code'}
                        </button>
                    </p>
                    <button type="button" className="sj-back" onClick={() => switchView('signin')}>← Back to sign in</button>
                </form>
            </motion.div>,
        )
    }

    /* ── Main sign in / sign up form ──────────────────────── */
    const isSignup = view === 'signup'
    return shell(
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="sj-card"
        >
            <div className="sj-card__head">
                <h1 className="sj-card__title">{isSignup ? 'Join the Archive' : 'Welcome Back'}</h1>
                <p className="sj-card__sub">
                    {isSignup ? 'Create your SOLAR Archive account' : 'Sign in to continue exploring'}
                </p>
            </div>

            {/* Tabs */}
            <div className="sj-tabs" role="tablist">
                {[['signin', 'Login', LogIn], ['signup', 'Sign Up', UserPlus]].map(([v, label, Icon]) => (
                    <button
                        key={v}
                        type="button"
                        role="tab"
                        aria-selected={view === v}
                        className="sj-tab"
                        data-active={view === v}
                        onClick={() => switchView(v)}
                    >
                        {view === v && (
                            <motion.span layoutId="sj-tab-pill" className="sj-tab__pill"
                                transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }} />
                        )}
                        <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Icon size={15} /> {label}
                        </span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.form
                    key={view}
                    initial={{ opacity: 0, x: isSignup ? 14 : -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isSignup ? -14 : 14 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={isSignup ? submitSignUp : submitSignIn}
                    className="sj-form"
                    autoComplete="on"
                    noValidate
                >
                    {/* Names — signup only */}
                    {isSignup && (
                        <div className="sj-row2">
                            <div className="sj-fgroup">
                                <label className="sj-label" htmlFor="sj-first">First name</label>
                                <div className="sj-field">
                                    <input
                                        id="sj-first"
                                        name="firstName"
                                        className="sj-input" type="text" placeholder="Jane"
                                        value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                                        autoComplete="given-name" maxLength={50}
                                        aria-invalid={!!fieldErrors.firstName}
                                        aria-describedby={fieldErrors.firstName ? 'sj-err-firstName' : undefined}
                                        required
                                    />
                                </div>
                                {fieldError('firstName')}
                            </div>
                            <div className="sj-fgroup">
                                <label className="sj-label" htmlFor="sj-last">Last name</label>
                                <div className="sj-field">
                                    <input
                                        id="sj-last"
                                        name="lastName"
                                        className="sj-input" type="text" placeholder="Doe"
                                        value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                                        autoComplete="family-name" maxLength={50}
                                        aria-invalid={!!fieldErrors.lastName}
                                        aria-describedby={fieldErrors.lastName ? 'sj-err-lastName' : undefined}
                                        required
                                    />
                                </div>
                                {fieldError('lastName')}
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div className="sj-fgroup">
                        <label className="sj-label" htmlFor="sj-email">Email address</label>
                        <div className="sj-field">
                            <input
                                id="sj-email"
                                name="email"
                                className="sj-input" type="email" placeholder="you@example.com"
                                value={form.email} onChange={(e) => set('email', e.target.value)}
                                autoComplete="email"
                                aria-invalid={!!fieldErrors.email}
                                aria-describedby={fieldErrors.email ? 'sj-err-email' : undefined}
                                required
                            />
                        </div>
                        {fieldError('email')}
                    </div>

                    {/* Password */}
                    <div className="sj-fgroup">
                        <label className="sj-label" htmlFor="sj-password">Password</label>
                        <div className="sj-field">
                            <input
                                id="sj-password"
                                name="password"
                                className="sj-input"
                                type={showPass ? 'text' : 'password'}
                                placeholder={isSignup ? 'At least 12 characters' : 'Your password'}
                                value={form.password}
                                onChange={(e) => set('password', e.target.value)}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                aria-invalid={!!fieldErrors.password}
                                aria-describedby={fieldErrors.password ? 'sj-err-password' : undefined}
                                required
                            />
                            <button type="button" className="sj-eye" onClick={() => setShowPass((s) => !s)} tabIndex={-1}
                                aria-label={showPass ? 'Hide password' : 'Show password'}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {fieldError('password')}
                    </div>

                    {/* Live checklist + strength — signup only */}
                    {isSignup && form.password.length > 0 && (
                        <>
                            <div className="sj-checklist" aria-live="polite">
                                {checklist.map((r) => (
                                    <span key={r.id} className="sj-checklist__item" data-ok={r.ok}>
                                        <span className="sj-checklist__dot">{r.ok ? <Check size={9} strokeWidth={3.5} /> : null}</span>
                                        {r.label}
                                    </span>
                                ))}
                            </div>
                            <div className="sj-strength">
                                <div className="sj-strength__bars">
                                    {[1, 2, 3, 4].map((i) => (
                                        <span key={i} className="sj-strength__bar"
                                            style={{ background: i <= strength ? STRENGTH_LEVELS[strength].color : undefined }} />
                                    ))}
                                </div>
                                <span className="sj-strength__label" style={{ color: STRENGTH_LEVELS[strength].color }}>
                                    {STRENGTH_LEVELS[strength].label}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Confirm password — signup only */}
                    {isSignup && (
                        <div className="sj-fgroup">
                            <label className="sj-label" htmlFor="sj-confirm">Confirm password</label>
                            <div className="sj-field">
                                <input
                                    id="sj-confirm"
                                    name="confirmPassword"
                                    className="sj-input"
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Repeat your password"
                                    value={form.confirmPassword}
                                    onChange={(e) => set('confirmPassword', e.target.value)}
                                    autoComplete="new-password"
                                    aria-invalid={!!fieldErrors.confirmPassword}
                                    aria-describedby={fieldErrors.confirmPassword ? 'sj-err-confirmPassword' : undefined}
                                    required
                                />
                                <button type="button" className="sj-eye" onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}
                                    aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldError('confirmPassword')}
                        </div>
                    )}

                    {/* Forgot password — signin only */}
                    {!isSignup && (
                        <div className="text-right -mt-1">
                            <button type="button" className="sj-link-btn" onClick={() => switchView('forgot')}>
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {/* Terms + Privacy — signup only */}
                    {isSignup && (
                        <>
                            <label className="sj-terms">
                                <input type="checkbox" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} />
                                <span>I agree to the <a href="#">Terms &amp; Conditions</a></span>
                            </label>
                            {fieldError('terms')}
                            <label className="sj-terms" style={{ marginTop: -6 }}>
                                <input type="checkbox" checked={form.privacy} onChange={(e) => set('privacy', e.target.checked)} />
                                <span>I agree to the <a href="#">Privacy Policy</a></span>
                            </label>
                            {fieldError('privacy')}
                        </>
                    )}

                    {errorBox}

                    {/* Clerk Bot Protection mount point — REQUIRED for custom
                        signup flows; without it signUp.create() fails CAPTCHA. */}
                    {isSignup && <div id="clerk-captcha" />}

                    <button type="submit" className="sj-submit" disabled={loading}>
                        {loading
                            ? <><span className="sj-spinner" /> Please wait…</>
                            : isSignup
                                ? <><UserPlus size={16} /> Create Account <ArrowRight size={14} /></>
                                : <><LogIn size={16} /> Sign In <ArrowRight size={14} /></>
                        }
                    </button>

                    {oauthButtons}
                </motion.form>
            </AnimatePresence>

            <p className="sj-switch">
                {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                <button type="button" onClick={() => switchView(isSignup ? 'signin' : 'signup')}>
                    {isSignup ? 'Login' : 'Sign Up'}
                </button>
            </p>
        </motion.div>,
    )
}
