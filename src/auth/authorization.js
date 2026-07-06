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
    MEMBER: 'member',       // any authenticated user
    REVIEWER: 'reviewer',   // earned: points >= MIN_POINTS_REVIEWER_ACCESS
})

/** Derive roles from the authenticated identity + profile state. */
export function rolesFor({ isLoggedIn, points = 0 }) {
    if (!isLoggedIn) return []
    const roles = [ROLES.MEMBER]
    if (points >= MIN_POINTS_REVIEWER_ACCESS) roles.push(ROLES.REVIEWER)
    return roles
}

/** Permission → roles that hold it. Add new capabilities here only. */
export const PERMISSIONS = Object.freeze({
    'archive:read': [ROLES.MEMBER, ROLES.REVIEWER],
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
