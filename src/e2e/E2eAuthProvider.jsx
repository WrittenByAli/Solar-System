import React, { useCallback, useMemo, useState } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'
import { hasPermission } from '../auth/authorization.js'

const DEFAULT_E2E_AUTH = {
  role: 'reviewer',
  username: 'e2e_reviewer',
  email: 'e2e@test.local',
  points: 1200,
  profileId: 'e2e-profile-uuid',
}

function readE2eConfig() {
  if (typeof window === 'undefined') return DEFAULT_E2E_AUTH
  return { ...DEFAULT_E2E_AUTH, ...(window.__SA_E2E_AUTH__ || {}) }
}

/** Playwright-only auth bypass — activated when VITE_E2E=true */
export default function E2eAuthProvider({ children }) {
  const [cfg, setCfg] = useState(readE2eConfig)
  const [profile, setProfile] = useState(() => ({
    id: cfg.profileId,
    username: cfg.username,
    email: cfg.email,
    role: cfg.role,
    points: cfg.points,
  }))

  const role = profile?.role ?? cfg.role
  const can = useCallback(
    (permission) => hasPermission({ isLoggedIn: true, isGuest: false, role }, permission),
    [role],
  )

  const value = useMemo(() => ({
    session: { username: cfg.username },
    profile,
    clerkId: 'e2e-user',
    isLoggedIn: true,
    isGuest: false,
    authLoaded: true,
    authUnavailable: false,
    profileReady: true,
    username: cfg.username,
    email: cfg.email,
    avatarUrl: null,
    points: profile?.points ?? cfg.points,
    role,
    can,
    canAccessReviewerQueue: can('review:grade'),
    canAccessAdmin: can('admin:access'),
    startGuestSession: () => {},
    logout: () => setCfg(readE2eConfig()),
    refreshProfile: async () => {},
    setProfileDirect: (next) => { if (next) setProfile(next) },
  }), [cfg, profile, role, can])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
