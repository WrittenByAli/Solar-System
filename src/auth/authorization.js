/**
 * Authorization policy — the single place that decides what a signed-in
 * user MAY DO. Authentication (who the user IS) lives in Clerk via
 * AuthContext; nothing in this file talks to Clerk or Supabase.
 *
 * NOTE: client-side checks are UX guardrails, not a security boundary —
 * a hostile user controls their own browser. True enforcement happens
 * at the data layer (Supabase RLS, see supabase_rls.sql) where the
 * server verifies the Clerk JWT on every query.
 */
import { MIN_POINTS_REVIEWER_ACCESS } from '../constants/reviewWorkflow.js'

export const ROLES = Object.freeze({
    GUEST: 'guest',         // anonymous browse-only session — no account, no PII
    MEMBER: 'member',       // any authenticated user
    REVIEWER: 'reviewer',   // earned: points >= MIN_POINTS_REVIEWER_ACCESS, or users_profile.role
    ADMIN: 'admin',         // users_profile.role only — no admin-specific permissions wired yet
})

/** Derive roles from the authenticated identity + profile state.
    A real sign-in always wins over a guest flag — the two are exclusive.
    Reviewer access is granted by EITHER the database role column (earned
    via admin promotion or the points-threshold trigger, see users_profile.
    role) OR the legacy points-threshold check — the two are additive, not
    exclusive, so an account promoted by role never loses access even if
    its points value later drops. */
export function rolesFor({ isLoggedIn, isGuest = false, points = 0, role = null }) {
    if (isLoggedIn) {
        const roles = [ROLES.MEMBER]
        if (role === ROLES.ADMIN) roles.push(ROLES.ADMIN)
        if (role === ROLES.REVIEWER || role === ROLES.ADMIN || points >= MIN_POINTS_REVIEWER_ACCESS) {
            roles.push(ROLES.REVIEWER)
        }
        return roles
    }
    if (isGuest) return [ROLES.GUEST]
    return []
}

/** Permission → roles that hold it. Add new capabilities here only. */
export const PERMISSIONS = Object.freeze({
    'archive:read': [ROLES.GUEST, ROLES.MEMBER, ROLES.REVIEWER],
    'archive:submit': [ROLES.MEMBER, ROLES.REVIEWER],
    'archive:host': [ROLES.MEMBER, ROLES.REVIEWER],
    'review:grade': [ROLES.REVIEWER],
})

export function hasPermission(ctx, permission) {
    const allowed = PERMISSIONS[permission]
    if (!allowed) return false
    const roles = rolesFor(ctx)
    return roles.some((r) => allowed.includes(r))
}
