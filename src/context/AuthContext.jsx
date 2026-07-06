import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { supabase } from '../utils/supabaseClient.js'
import { hasPermission } from '../auth/authorization.js'
import { reportAuthError } from '../auth/logger.js'
import { NEW_ACCOUNT_STARTER_POINTS } from '../constants/reviewWorkflow.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const { user, isLoaded, isSignedIn } = useUser()
    const { signOut } = useClerk()
    const [profile, setProfile] = useState(null)

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
        await signOut()
    }, [signOut])

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

    // Authorization is delegated to the central policy (src/auth/authorization.js).
    // AuthContext answers "who is this?"; the policy answers "what may they do?".
    const can = useCallback(
        (permission) => hasPermission({ isLoggedIn: !!isSignedIn, points }, permission),
        [isSignedIn, points],
    )
    const canAccessReviewerQueue = can('review:grade')

    const value = useMemo(() => ({
        session: isSignedIn ? { username } : null,
        profile,
        isLoggedIn: !!isSignedIn,
        authLoaded: isLoaded,
        username,
        email,
        avatarUrl,
        points,
        can,
        canAccessReviewerQueue,
        logout,
        refreshProfile,
        setProfileDirect,
    }), [isSignedIn, isLoaded, username, email, avatarUrl, profile, points, can, canAccessReviewerQueue, logout, refreshProfile, setProfileDirect])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
