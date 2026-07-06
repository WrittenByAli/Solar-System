import React from 'react'
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import FoundationLogo from '../components/FoundationLogo.jsx'

/**
 * OAuth landing route. Clerk redirects here after the Google/GitHub
 * handshake; <AuthenticateWithRedirectCallback> completes the flow
 * (including transferring an OAuth sign-in to a sign-up for brand-new
 * users) and then forwards to the URLs below.
 */
export default function SsoCallback() {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                        boxShadow: '0 0 40px rgba(245,166,35,0.35)',
                    }}
                >
                    <FoundationLogo fillCircle alt="" />
                </motion.div>
                <p className="text-xs tracking-wide" style={{ color: '#64748b' }}>
                    Completing sign-in…
                </p>
            </div>
            <AuthenticateWithRedirectCallback
                signInFallbackRedirectUrl="/"
                signUpFallbackRedirectUrl="/"
                signInForceRedirectUrl="/"
                signUpForceRedirectUrl="/"
            />
        </div>
    )
}
