import {
    Award,
    AtSign,
    Bell,
    CheckCircle2,
    Crown,
    Inbox,
    Megaphone,
    ShieldAlert,
    Sparkles,
    Star,
    Trophy,
    UserPlus,
    XCircle,
} from 'lucide-react'

/**
 * Visual treatment per notification `type` -- icon, accent color, and a
 * short animation hint the component maps to a framer-motion variant.
 *
 * IMPORTANT scope note: this is a PURE presentation layer. Only five of
 * these types have an actual backend producer today (confirmed against the
 * live schema/triggers during this audit):
 *   - entry_approved / entry_rejected  <- process_review_consensus trigger
 *   - review_requested                 <- notify_reviewers_new_submission trigger
 *                                         (fires for reviewers/admins the moment
 *                                         a review-eligible submission lands)
 *   - stale_review                     <- resurface-stale-reviews edge function
 *   - status                           <- legacy pre-migration rows (compat shim)
 * Every other entry below (reviewer_promotion, level_unlocked,
 * achievement_unlocked, points_earned, new_follower, mention,
 * system_announcement, admin_announcement, security_alert, welcome) has NO
 * current producer -- no trigger or code path inserts these `type` values
 * today. They're included so the UI is ready the moment a producer exists,
 * per this audit's brief ("future-proof"), without inventing new backend
 * behavior ("Do NOT redesign functionality" was explicit for this pass).
 */
export const NOTIFICATION_TYPES = {
    entry_approved: {
        label: 'Archive approved',
        Icon: CheckCircle2,
        accent: '#34d399',
        glow: 'rgba(52, 211, 153, 0.35)',
        pulse: false,
    },
    entry_rejected: {
        label: 'Archive rejected',
        Icon: XCircle,
        accent: '#f87171',
        glow: 'rgba(248, 113, 113, 0.3)',
        pulse: false,
    },
    review_received: {
        label: 'Review received',
        Icon: Star,
        accent: '#60a5fa',
        glow: 'rgba(96, 165, 250, 0.3)',
        pulse: false,
    },
    review_completed: {
        label: 'Review completed',
        Icon: CheckCircle2,
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.3)',
        pulse: false,
    },
    review_requested: {
        label: 'Awaiting review',
        Icon: Inbox,
        accent: '#2dd4bf',
        glow: 'rgba(45, 212, 191, 0.3)',
        pulse: false,
    },
    stale_review: {
        label: 'Needs review',
        Icon: Bell,
        accent: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.35)',
        pulse: true,
    },
    reviewer_promotion: {
        label: 'Reviewer promotion',
        Icon: ShieldAlert,
        accent: '#a78bfa',
        glow: 'rgba(167, 139, 250, 0.35)',
        pulse: true,
    },
    level_unlocked: {
        label: 'Level unlocked',
        Icon: Crown,
        accent: '#fcd34d',
        glow: 'rgba(252, 211, 77, 0.4)',
        pulse: true,
    },
    achievement_unlocked: {
        label: 'Achievement unlocked',
        Icon: Trophy,
        accent: '#f0abfc',
        glow: 'rgba(240, 171, 252, 0.35)',
        pulse: true,
    },
    points_earned: {
        label: 'Points earned',
        Icon: Sparkles,
        accent: '#4ade80',
        glow: 'rgba(74, 222, 128, 0.3)',
        pulse: false,
    },
    new_follower: {
        label: 'New follower',
        Icon: UserPlus,
        accent: '#22d3ee',
        glow: 'rgba(34, 211, 238, 0.3)',
        pulse: false,
    },
    mention: {
        label: 'Mention',
        Icon: AtSign,
        accent: '#818cf8',
        glow: 'rgba(129, 140, 248, 0.3)',
        pulse: false,
    },
    system_announcement: {
        label: 'System announcement',
        Icon: Megaphone,
        accent: '#94a3b8',
        glow: 'rgba(148, 163, 184, 0.25)',
        pulse: false,
    },
    admin_announcement: {
        label: 'Admin announcement',
        Icon: Megaphone,
        accent: '#fb923c',
        glow: 'rgba(251, 146, 60, 0.3)',
        pulse: false,
    },
    security_alert: {
        label: 'Security alert',
        Icon: ShieldAlert,
        accent: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.4)',
        pulse: true,
    },
    welcome: {
        label: 'Welcome',
        Icon: Award,
        accent: '#f5a623',
        glow: 'rgba(245, 166, 35, 0.35)',
        pulse: false,
    },
}

const DEFAULT_TYPE = {
    label: 'Notification',
    Icon: Bell,
    accent: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.25)',
    pulse: false,
}

const ROUTES_BY_TYPE = {
    review_requested: '/review-queue',
    stale_review: '/review-queue',
    reviewer_promotion: '/profile',
    level_unlocked: '/profile',
    achievement_unlocked: '/profile',
    new_follower: '/profile',
}

/**
 * Resolve full presentation for a notification row. `type` drives
 * everything; the message-regex guess is kept ONLY as a one-time
 * compatibility shim for rows created before the `type` column existed
 * (legacy default type = 'status').
 */
export function resolveNotificationVisual(n) {
    const isLegacyRejection = n.type === 'status' && /rejected/i.test(n.message || '')
    const key = isLegacyRejection ? 'entry_rejected' : n.type
    const config = NOTIFICATION_TYPES[key] || DEFAULT_TYPE
    const route = ROUTES_BY_TYPE[key] || '/my-submissions'
    return { ...config, type: key, route }
}
