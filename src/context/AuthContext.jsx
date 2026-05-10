import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MIN_POINTS_REVIEWER_ACCESS } from '../constants/reviewWorkflow.js'
import { loadUserProfile, upsertUserProfile } from '../utils/userProfileStorage.js'

const SESSION_KEY = 'solarArchiveSession'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState(null)

    const refreshProfile = useCallback((username) => {
        const u = username || session?.username
        if (!u) return
        const p = loadUserProfile(u)
        if (p) setProfile(p)
    }, [session?.username])

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SESSION_KEY)
            if (raw) {
                const s = JSON.parse(raw)
                if (s?.username) {
                    setSession({ username: s.username })
                    const p = loadUserProfile(s.username)
                    if (p) setProfile(p)
                }
            }
        } catch {
            /* ignore */
        }
    }, [])

    useEffect(() => {
        const fn = () => {
            if (session?.username) refreshProfile(session.username)
        }
        window.addEventListener('solar-archive-profile-updated', fn)
        return () => window.removeEventListener('solar-archive-profile-updated', fn)
    }, [session?.username, refreshProfile])

    const login = useCallback((username, email) => {
        const uname = String(username || '').trim()
        if (!uname) return
        let p = loadUserProfile(uname)
        if (!p) {
            p = upsertUserProfile({
                username: uname,
                email: email || '',
            })
        } else if (email && email !== p.email) {
            upsertUserProfile({ username: uname, email })
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: uname }))
        setSession({ username: uname })
        setProfile(loadUserProfile(uname))
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
        setProfile(null)
    }, [])

    const setProfileDirect = useCallback((next) => {
        setProfile(next)
    }, [])

    const value = useMemo(() => {
        const points = profile?.points ?? 0
        const canAccessReviewerQueue = !!session?.username && points >= MIN_POINTS_REVIEWER_ACCESS
        return {
            session,
            profile,
            isLoggedIn: !!session?.username,
            username: session?.username || null,
            points,
            canAccessReviewerQueue,
            login,
            logout,
            refreshProfile,
            setProfileDirect,
        }
    }, [session, profile, login, logout, refreshProfile, setProfileDirect])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
