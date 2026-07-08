import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { supabase } from '../utils/supabaseClient.js'
import { hasPermission } from '../auth/authorization.js'
import { reportAuthError } from '../auth/logger.js'
import { NEW_ACCOUNT_STARTER_POINTS } from '../constants/reviewWorkflow.js'

const AuthContext = createContext(null)

/* Guest mode: an explicit browse-only session with no Clerk account, no
   email, and no Supabase profile row. It is a localStorage flag, nothing
   more — reads go through the public anon key like any signed-out client,
   and every write surface is gated behind RequireMember / permissions. */
const GUEST_LS_KEY = 'sa-guest-session'

function readGuestFlag() {
    try { return localStorage.getItem(GUEST_LS_KEY) === '1' } catch { return false }
}

export function AuthProvider({ children }) {
    const { user, isLoaded, isSignedIn } = useUser()
    const { signOut } = useClerk()
    const [profile, setProfile] = useState(null)
    const [guestSession, setGuestSession] = useState(readGuestFlag)

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
            } else {
                // conflict path: row appeared between select and upsert — fetch it
                const { data: raced } = await supabase
                    .from('users_profile')
                    .select('*')
                    .eq('clerk_id', user.id)
                    .maybeSingle()
                if (!cancelled && raced) setProfile(raced)
            }
        }

        syncProfile()
        return () => { cancelled = true }
    }, [isLoaded, isSignedIn, user])

    const logout = useCallback(async () => {
        setProfile(null)
        setGuestSession(false)
        try { localStorage.removeItem(GUEST_LS_KEY) } catch { /* storage unavailable */ }
        // Guests have no Clerk session — calling signOut for them is a no-op
        // round-trip at best, so only sign out when one actually exists.
        if (isSignedIn) await signOut()
    }, [signOut, isSignedIn])

    const refreshProfile = useCallback(async () => {
        if (!user) return
        const { data } = await supabase
            .from('users_profile')
            .select('*')
            .eq('clerk_id', user.id)
            .maybeSingle()
        if (data) setProfile(data)
    }, [user])

    const setProfileDirect = useCallback((next) => setProfile(next), [])

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
    const avatarUrl = isSignedIn ? (user?.imageUrl || null) : null
    const points = profile?.points ?? 0

    const isGuest = guestSession && !isSignedIn

    // Authorization is delegated to the central policy (src/auth/authorization.js).
    // AuthContext answers "who is this?"; the policy answers "what may they do?".
    const can = useCallback(
        (permission) => hasPermission({ isLoggedIn: !!isSignedIn, isGuest, points }, permission),
        [isSignedIn, isGuest, points],
    )
    const canAccessReviewerQueue = can('review:grade')

    const value = useMemo(() => ({
        session: isSignedIn ? { username } : null,
        profile,
        isLoggedIn: !!isSignedIn,
        isGuest,
        authLoaded: isLoaded,
        username,
        email,
        avatarUrl,
        points,
        can,
        canAccessReviewerQueue,
        startGuestSession,
        logout,
        refreshProfile,
        setProfileDirect,
    }), [isSignedIn, isGuest, isLoaded, username, email, avatarUrl, profile, points, can, canAccessReviewerQueue, startGuestSession, logout, refreshProfile, setProfileDirect])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
