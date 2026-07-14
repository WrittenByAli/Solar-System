import { supabase } from './supabaseClient.js'

export async function fetchUnreadCount(userId) {
    if (!userId) return 0
    const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    return count || 0
}

export async function fetchRecentNotifications(userId, limit = 10) {
    if (!userId) return []
    const { data, error } = await supabase
        .from('notifications')
        .select('id, message, entry_id, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) return []
    return data || []
}

export async function markNotificationRead(id) {
    if (!id) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllNotificationsRead(userId) {
    if (!userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}
