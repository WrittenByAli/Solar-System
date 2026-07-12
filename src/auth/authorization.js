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

export const ROLES = Object.freeze({
    GUEST: 'guest',         // anonymous browse-only session — no account, no PII
    MEMBER: 'member',       // any authenticated user
    REVIEWER: 'reviewer',   // users_profile.role = 'reviewer' — earned via the DB
                             // auto-promotion trigger (points crossing app_settings.
                             // reviewer_points_threshold) or granted manually by an admin
    ADMIN: 'admin',         // users_profile.role = 'admin' — manual only, dashboard-granted
})

/** Derive roles from the authenticated identity + profile state.
    A real sign-in always wins over a guest flag — the two are exclusive.
    Reviewer/admin access reads users_profile.role directly — NOT a
    points-threshold inference. Points still drive promotion, but that
    happens in the database (the auto_promote_reviewer trigger), so by
    the time a client sees an updated profile, role already reflects it.
    Admin implies reviewer (a stricter role always has the lesser one). */
export function rolesFor({ isLoggedIn, isGuest = false, role = null }) {
    if (isLoggedIn) {
        const roles = [ROLES.MEMBER]
        if (role === ROLES.ADMIN) roles.push(ROLES.ADMIN, ROLES.REVIEWER)
        else if (role === ROLES.REVIEWER) roles.push(ROLES.REVIEWER)
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
    'review:grade': [ROLES.REVIEWER], // admin also holds REVIEWER via rolesFor's implication
    'admin:access': [ROLES.ADMIN],
})

export function hasPermission(ctx, permission) {
    const allowed = PERMISSIONS[permission]
    if (!allowed) return false
    const roles = rolesFor(ctx)
    return roles.some((r) => allowed.includes(r))
}
