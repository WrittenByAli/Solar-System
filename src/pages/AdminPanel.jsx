import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTheme } from '../App.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Genuine stub — route + admin-only guard exist so /admin is reachable and
 * protected, but the actual management UI (user list, role promotion,
 * submission moderation, platform stats) is a separate, later, optional
 * phase. Nothing here should imply more functionality than this.
 */
export default function AdminPanel() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { username, role } = useAuth()
    const muted = isDark ? '#64748b' : '#64748b'

    return (
        <div className="solar-page solar-page--center">
            <div className="solar-page__inner max-w-lg mx-auto text-center w-full">
                <ShieldCheck size={40} color={isDark ? '#4fc3f7' : '#0284c7'} className="mb-4 mx-auto" />
                <h1 className="font-solar text-2xl font-black mb-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Admin panel
                </h1>
                <p className="text-sm mb-1" style={{ color: isDark ? '#f1f5f9' : '#111827' }}>
                    Signed in as <strong>@{username}</strong> · role <strong>{role}</strong>
                </p>
                <p className="text-sm" style={{ color: muted }}>
                    This route is reachable and admin-gated, but the management UI itself —
                    user list, role promotion, submission moderation, platform stats — is not
                    built yet. Manage the platform via the Supabase dashboard until that
                    (separate, optional) phase ships.
                </p>
            </div>
        </div>
    )
}
