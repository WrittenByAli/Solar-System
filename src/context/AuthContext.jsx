import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { supabase } from '../utils/supabaseClient.js'
import { hasPermission } from '../auth/authorization.js'
import { reportAuthError } from '../auth/logger.js'
import { NEW_ACCOUNT_STARTER_POINTS } from '../constants/reviewWorkflow.js'
import { clearHomeIntroSeen } from '../utils/homeIntroStorage.js'

const AuthContext = createContext(null)

export { AuthContext }

/* Guest mode: an explicit browse-only session with no Clerk account, no
   email, and no Supabase profile row. It is a localStorage flag, nothing
   more — reads go through the public anon key like any signed-out client,
   and every write surface is gated behind RequireMember / permissions. */
const GUEST_LS_KEY = 'sa-guest-session'
const ROLE_CACHE_KEY = 'sa-profile-role-cache'

function readGuestFlag() {
    try { return localStorage.getItem(GUEST_LS_KEY) === '1' } catch { return false }
}

/** Hydrate reviewer/admin nav before the Supabase profile round-trip completes. */
function readRoleCacheEntry(clerkId) {
    if (!clerkId) return null
    try {
        const raw = localStorage.getItem(ROLE_CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed?.clerkId === clerkId ? parsed : null
    } catch {
        return null
    }
}

function writeCachedRole(clerkId, role) {
    if (!clerkId) return
    try {
        localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ clerkId, role: role ?? null }))
    } catch { /* storage unavailable */ }
}

function clearCachedRole() {
    try { localStorage.removeItem(ROLE_CACHE_KEY) } catch { /* storage unavailable */ }
}

/* E2E builds swap in E2eAuthProvider (src/e2e) at the main.jsx level; the
   split below keeps every hook inside a component that always renders them,
   so the rules-of-hooks hold regardless of build flags. */
export function AuthProvider({ children }) {
    if (import.meta.env.VITE_E2E === 'true') {
        return children
    }
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>
}

/* clerk-js is fetched from Clerk's CDN at runtime. On networks that block or
   throttle *.clerk.accounts.dev the script never arrives, isLoaded stays
   false forever, and every guarded route would hang on the restore spinner —
   even guest mode, which needs no Clerk at all. After Clerk's own script
   timeout window we declare auth unavailable: routes resolve as signed-out
   (→ /join), where guest browsing still works. If the script lands late,
   isLoaded flips true and normal auth self-heals. */
const CLERK_LOAD_TIMEOUT_MS = 15_000

function ClerkAuthProvider({ children }) {
    const { user, isLoaded, isSignedIn } = useUser()
    const { signOut } = useClerk()
    const [profile, setProfile] = useState(null)
    const [guestSession, setGuestSession] = useState(readGuestFlag)
    const [clerkTimedOut, setClerkTimedOut] = useState(false)

    useEffect(() => {
        if (isLoaded) return undefined
        const t = setTimeout(() => setClerkTimedOut(true), CLERK_LOAD_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [isLoaded])

    // A real sign-in supersedes guest mode permanently.
    useEffect(() => {
        if (isSignedIn && guestSession) {
            setGuestSession(false)
            try { localStorage.removeItem(GUEST_LS_KEY) } catch { /* storage unavailable */ }
        }
    }, [isSignedIn, guestSession])

    const startGuestSession = useCallback(() => {
        setGuestSession(true)
        try { localStorage.setItem(GUEST_LS_KEY, '1') } catch { /* storage unavailable */ }
    }, [])

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn || !user) {
            setProfile(null)
            return
        }

        let cancelled = false

        async function syncProfile() {
            const { data: existing, error: selErr } = await supabase
                .from('users_profile')
                .select('*')
                .eq('clerk_id', user.id)
                .maybeSingle()

            if (selErr) reportAuthError('profile-select', selErr)
            if (cancelled) return

            if (existing) {
                setProfile(existing)
                writeCachedRole(user.id, existing.role)
                return
            }

            const username =
                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                user.username ||
                user.emailAddresses[0]?.emailAddress?.split('@')[0] ||
                'user'

            // ignoreDuplicates → ON CONFLICT DO NOTHING: never clobbers a row
            // the signup flow already wrote (which holds the chosen username).
            const { data: created, error: insErr } = await supabase
                .from('users_profile')
                .upsert(
                    {
                        clerk_id: user.id,
                        username,
                        email: user.emailAddresses[0]?.emailAddress ?? '',
                        points: NEW_ACCOUNT_STARTER_POINTS,
                    },
                    { onConflict: 'clerk_id', ignoreDuplicates: true },
                )
                .select()
                .maybeSingle()

            if (insErr) reportAuthError('profile-create', insErr)
            if (cancelled) return

            if (created) {
                setProfile(created)
                writeCachedRole(user.id, created.role)
            } else {
                // conflict path: row appeared between select and upsert — fetch it
                const { data: raced } = await supabase
                    .from('users_profile')
                    .select('*')
                    .eq('clerk_id', user.id)
                    .maybeSingle()
                if (!cancelled && raced) {
                    setProfile(raced)
                    writeCachedRole(user.id, raced.role)
                }
            }
        }

        syncProfile()
        return () => { cancelled = true }
    }, [isLoaded, isSignedIn, user])

    const logout = useCallback(async () => {
        const clerkId = user?.id
        setProfile(null)
        setGuestSession(false)
        clearCachedRole()
        clearHomeIntroSeen(clerkId)
        clearHomeIntroSeen('guest')
        try { localStorage.removeItem(GUEST_LS_KEY) } catch { /* storage unavailable */ }
        // Guests have no Clerk session — calling signOut for them is a no-op
        // round-trip at best, so only sign out when one actually exists.
        if (isSignedIn) await signOut()
    }, [signOut, isSignedIn, user?.id])

    const refreshProfile = useCallback(async () => {
        if (!user) return
        const { data } = await supabase
            .from('users_profile')
            .select('*')
            .eq('clerk_id', user.id)
            .maybeSingle()
        if (data) {
            setProfile(data)
            writeCachedRole(user.id, data.role)
        }
    }, [user])

    const setProfileDirect = useCallback((next) => {
        setProfile(next)
        if (user?.id && next) writeCachedRole(user.id, next.role)
    }, [user?.id])

    const username = isSignedIn
        ? (profile?.username ||
           user?.username ||
           user?.firstName ||
           user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
           null)
        : null
    const email = isSignedIn
        ? (user?.emailAddresses?.[0]?.emailAddress || profile?.email || null)
        : null
    const avatarUrl = isSignedIn ? (profile?.avatar_url || user?.imageUrl || null) : null
    const points = profile?.points ?? 0
    // Only consulted while the Supabase profile is still in flight — once
    // profile lands, role comes from the row and this read is skipped.
    const roleCacheEntry = useMemo(
        () => (isSignedIn && user?.id && !profile ? readRoleCacheEntry(user.id) : null),
        [isSignedIn, user?.id, profile],
    )
    const role = profile?.role ?? (roleCacheEntry ? (roleCacheEntry.role ?? null) : null)
    const profileReady = !isSignedIn || profile !== null || roleCacheEntry !== null

    const isGuest = guestSession && !isSignedIn

    // Authorization is delegated to the central policy (src/auth/authorization.js).
    // AuthContext answers "who is this?"; the policy answers "what may they do?".
    // role comes straight from users_profile.role — no points inference here,
    // promotion happens in the database (see the auto_promote_reviewer trigger).
    const can = useCallback(
        (permission) => hasPermission({ isLoggedIn: !!isSignedIn, isGuest, role }, permission),
        [isSignedIn, isGuest, role],
    )
    const canAccessReviewerQueue = can('review:grade')
    const canAccessAdmin = can('admin:access')

    const value = useMemo(() => ({
        session: isSignedIn ? { username } : null,
        profile,
        clerkId: user?.id ?? null,
        isLoggedIn: !!isSignedIn,
        isGuest,
        authLoaded: isLoaded || clerkTimedOut,
        authUnavailable: clerkTimedOut && !isLoaded,
        username,
        email,
        avatarUrl,
        points,
        role,
        can,
        canAccessReviewerQueue,
        canAccessAdmin,
        profileReady,
        startGuestSession,
        logout,
        refreshProfile,
        setProfileDirect,
    }), [isSignedIn, isGuest, isLoaded, clerkTimedOut, username, email, avatarUrl, profile, points, role, profileReady, can, canAccessReviewerQueue, canAccessAdmin, startGuestSession, logout, refreshProfile, setProfileDirect, user?.id])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
