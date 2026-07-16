import { supabase } from './supabaseClient.js'

/**
 * Two-tier state model (mirrors the notifications_seen_state migration):
 *   - is_seen  -> drives the bell BADGE. Opening the dropdown marks
 *                 everything seen, so the count disappears immediately.
 *   - is_read  -> drives per-item unread styling (dot / bold). Cleared only
 *                 when the item is clicked or "Mark all read" is used.
 * Reading a badge count from is_read would make the badge impossible to
 * clear without also destroying the unread-dot affordance.
 */
export async function fetchUnseenCount(userId) {
    if (!userId) return 0
    const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_seen', false)
    return count || 0
}

/**
 * Returns { data, error } rather than swallowing a failed fetch into `[]` --
 * a genuine DB/network error must stay distinguishable from "this user
 * really has zero notifications" so the UI can show an error state instead
 * of a false empty state.
 */
export async function fetchRecentNotifications(userId, limit = 10) {
    if (!userId) return { data: [], error: null }
    const { data, error } = await supabase
        .from('notifications')
        .select('id, message, entry_id, is_read, is_seen, created_at, type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    return { data: error ? [] : (data || []), error: error || null }
}

/**
 * All mutation helpers return { ok, error } instead of silently discarding
 * the Supabase response -- a failed UPDATE (network blip, session expiry
 * mid-request) must be distinguishable from success so useNotifications.js
 * can roll back its optimistic state.
 */
export async function markNotificationRead(id) {
    if (!id) return { ok: false, error: new Error('missing id') }
    // A clicked notification is by definition also seen.
    const { error } = await supabase.from('notifications').update({ is_read: true, is_seen: true }).eq('id', id)
    return { ok: !error, error: error || null }
}

export async function markAllNotificationsRead(userId) {
    if (!userId) return { ok: false, error: new Error('missing userId') }
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, is_seen: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    return { ok: !error, error: error || null }
}

export async function markAllNotificationsSeen(userId) {
    if (!userId) return { ok: false, error: new Error('missing userId') }
    const { error } = await supabase
        .from('notifications')
        .update({ is_seen: true })
        .eq('user_id', userId)
        .eq('is_seen', false)
    return { ok: !error, error: error || null }
}
