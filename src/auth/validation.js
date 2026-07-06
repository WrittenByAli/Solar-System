/**
 * Auth validation — single source of truth for client-side rules.
 * Server-side enforcement (breach checks, rate limits, uniqueness)
 * is handled by Clerk's API; these rules gate the UX before any
 * network call is made.
 */

/* ── Normalizers ────────────────────────────────────────── */

export const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase()
export const normalizeName = (v) => String(v ?? '').trim().replace(/\s+/g, ' ')

/* ── Email ──────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(raw) {
    const email = normalizeEmail(raw)
    if (!email) return 'Email is required.'
    if (email.length > 254) return 'Email is too long.'
    if (!EMAIL_RE.test(email)) return 'Enter a valid email address.'
    return null
}

/* ── Names ──────────────────────────────────────────────── */

export function validateName(raw, label) {
    const name = normalizeName(raw)
    if (!name) return `${label} is required.`
    if (name.length < 2) return `${label} must be at least 2 characters.`
    if (name.length > 50) return `${label} must be 50 characters or fewer.`
    return null
}

/* ── Password rules (live checklist) ────────────────────── */

export const PASSWORD_RULES = [
    { id: 'length', label: 'At least 12 characters', test: (p) => p.length >= 12 },
    { id: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'A number', test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'A special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export const passwordChecklist = (p) =>
    PASSWORD_RULES.map(({ id, label, test }) => ({ id, label, ok: test(p || '') }))

/* ── Common / weak password rejection ───────────────────── */

const COMMON_TOKENS = [
    'password', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'admin',
    'iloveyou', 'monkey', 'dragon', 'sunshine', 'princess', 'football',
    'baseball', 'superman', 'batman', 'trustno1', 'master', 'shadow',
    'abc123', '123456', '654321', '111111', '000000', 'qwertyuiop',
    'asdfghjkl', 'zxcvbnm', 'solar', 'archive',
]

export function isCommonPassword(p) {
    const low = String(p || '').toLowerCase()
    if (COMMON_TOKENS.some((t) => low.includes(t))) return true
    // all one repeated character, or a straight keyboard run
    if (/^(.)\1+$/.test(low)) return true
    if ('abcdefghijklmnopqrstuvwxyz'.includes(low) || '0123456789012345678901234'.includes(low)) return true
    return false
}

/* ── Password strength (0–4) ────────────────────────────── */

export const STRENGTH_LEVELS = [
    { label: '', color: 'transparent' },
    { label: 'Weak', color: '#c93030' },
    { label: 'Fair', color: '#b97909' },
    { label: 'Good', color: '#0071e3' },
    { label: 'Strong', color: '#1f8a4c' },
]

export function passwordStrength(p) {
    if (!p) return 0
    if (isCommonPassword(p)) return 1
    let score = 0
    const passed = passwordChecklist(p).filter((r) => r.ok).length
    if (passed >= 2) score = 1
    if (passed >= 4) score = 2
    if (passed === 5) score = 3
    if (passed === 5 && p.length >= 16) score = 4
    return score
}

export function validatePassword(p) {
    if (!p) return 'Password is required.'
    const failed = passwordChecklist(p).filter((r) => !r.ok)
    if (failed.length > 0) return 'Password does not meet all requirements.'
    if (isCommonPassword(p)) return 'This password is too common — choose something less guessable.'
    if (p.length > 128) return 'Password must be 128 characters or fewer.'
    return null
}

/* ── Form-level validators ──────────────────────────────── */

/** @returns {{ errors: Object, values: Object }} errors is empty when valid */
export function validateSignUp(form) {
    const errors = {}
    const values = {
        firstName: normalizeName(form.firstName),
        lastName: normalizeName(form.lastName),
        email: normalizeEmail(form.email),
        password: form.password || '',
    }

    const fn = validateName(form.firstName, 'First name')
    if (fn) errors.firstName = fn
    const ln = validateName(form.lastName, 'Last name')
    if (ln) errors.lastName = ln
    const em = validateEmail(form.email)
    if (em) errors.email = em
    const pw = validatePassword(form.password)
    if (pw) errors.password = pw
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
    if (!form.terms) errors.terms = 'You must accept the Terms & Conditions.'
    if (!form.privacy) errors.privacy = 'You must accept the Privacy Policy.'

    return { errors, values }
}

export function validateSignIn(form) {
    const errors = {}
    const values = { email: normalizeEmail(form.email), password: form.password || '' }
    const em = validateEmail(form.email)
    if (em) errors.email = em
    if (!form.password) errors.password = 'Password is required.'
    return { errors, values }
}
