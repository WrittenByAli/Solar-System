import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, LogIn, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useTheme } from '../App.jsx'
import FoundationLogo from '../components/FoundationLogo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Join() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [mode, setMode] = useState('login') // 'login' | 'signup'
    const [showPass, setShowPass] = useState(false)
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
    const [submitted, setSubmitted] = useState(false)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const inputStyle = {
        width: '100%',
        padding: '12px 42px 12px 42px',
        borderRadius: 12,
        border: `1.5px solid ${isDark ? 'rgba(79,195,247,0.2)' : 'rgba(15,23,42,0.15)'}`,
        background: isDark ? 'rgba(2,4,8,0.6)' : 'rgba(240,244,248,0.8)',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontSize: 14,
        outline: 'none',
        fontFamily: 'Inter, sans-serif',
        transition: 'border-color 0.2s',
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (mode === 'signup') {
            if (form.password !== form.confirmPassword) {
                alert('Passwords do not match.')
                return
            }
            const uname = form.username.trim()
            if (!uname) {
                alert('Choose a username.')
                return
            }
            login(uname, form.email)
        } else {
            const uname = form.username.trim()
            if (!uname) {
                alert('Enter your username to sign in.')
                return
            }
            login(uname, form.email)
        }
        setSubmitted(true)
        setTimeout(() => navigate('/'), 2200)
    }

    if (submitted) {
        return (
            <div className="solar-page solar-page--center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    className="text-center max-w-sm"
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mx-auto mb-6 flex items-center justify-center rounded-full overflow-hidden"
                        style={{
                            width: 112,
                            height: 112,
                            background: 'linear-gradient(135deg, #f5a623, #ff6b35)',
                            boxShadow: isDark ? '0 0 36px rgba(245,166,35,0.45)' : '0 0 28px rgba(245,166,35,0.35)',
                        }}
                    >
                        <FoundationLogo fillCircle alt="" />
                    </motion.div>
                    <h2 className="solar-join-title mb-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {mode === 'login' ? 'Welcome Back!' : 'Account Created!'}
                    </h2>
                    <p className="text-sm mb-4" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                        {mode === 'login' ? 'You are now logged into the SOLAR Archive.' : 'Your SOLAR Archive account is ready.'}
                    </p>
                    <p className="text-xs" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>Taking you home…</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="solar-page solar-page--center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="solar-join-title" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {mode === 'login' ? 'Welcome Back' : 'Join the Archive'}
                    </h1>
                    <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#475569' }}>
                        {mode === 'login' ? 'Sign in to continue exploring' : 'Create your SOLAR Archive account'}
                    </p>
                </div>

                {/* Tab toggle */}
                <div
                    className="flex mb-6 rounded-xl overflow-hidden"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.6)' : 'rgba(255,255,255,0.7)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.15)' : 'rgba(15,23,42,0.1)'}`,
                    }}
                >
                    <button
                        onClick={() => setMode('login')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200"
                        style={{
                            background: mode === 'login' ? (isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.12)') : 'transparent',
                            color: mode === 'login' ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#64748b'),
                        }}
                    >
                        <LogIn size={15} /> Login
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200"
                        style={{
                            background: mode === 'signup' ? (isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.12)') : 'transparent',
                            color: mode === 'signup' ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#64748b'),
                        }}
                    >
                        <UserPlus size={15} /> Sign Up
                    </button>
                </div>

                {/* Form */}
                <motion.form
                    key={mode}
                    initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSubmit}
                    className="p-6 rounded-2xl flex flex-col gap-4"
                    style={{
                        background: isDark ? 'rgba(7,20,40,0.85)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(79,195,247,0.18)' : 'rgba(15,23,42,0.1)'}`,
                        boxShadow: isDark ? '0 0 40px rgba(79,195,247,0.06)' : '0 4px 40px rgba(0,0,0,0.08)',
                    }}
                >
                    {/* Username */}
                    <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#64748b' }} />
                        <input style={inputStyle} type="text" placeholder="Username" value={form.username} onChange={e => set('username', e.target.value)} required />
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#64748b' }} />
                        <input style={inputStyle} type="email" placeholder="Email address" value={form.email} onChange={e => set('email', e.target.value)} required />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#64748b' }} />
                        <input style={inputStyle} type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => set('password', e.target.value)} required />
                        <button type="button" onClick={() => setShowPass(s => !s)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2"
                            style={{ color: isDark ? '#475569' : '#64748b' }}>
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* Confirm password (signup only) */}
                    {mode === 'signup' && (
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#64748b' }} />
                            <input style={inputStyle} type={showPass ? 'text' : 'password'} placeholder="Confirm password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
                        </div>
                    )}

                    {/* Forgot password (login) */}
                    {mode === 'login' && (
                        <div className="text-right">
                            <a href="#" className="text-xs font-medium" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>Forgot password?</a>
                        </div>
                    )}

                    {/* Terms (signup) */}
                    {mode === 'signup' && (
                        <label className="flex items-start gap-2 text-xs" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                            <input type="checkbox" required className="mt-0.5 rounded" />
                            <span>I agree to the <a href="#" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>Terms of Service</a> and <a href="#" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>Privacy Policy</a></span>
                        </label>
                    )}

                    {/* Submit */}
                    <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4fc3f7)', boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}
                    >
                        {mode === 'login' ? <><LogIn size={16} /> Sign In</> : <><UserPlus size={16} /> Create Account</>}
                        <ArrowRight size={14} />
                    </motion.button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)' }} />
                        <span className="text-xs" style={{ color: isDark ? '#475569' : '#64748b' }}>or continue with</span>
                        <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)' }} />
                    </div>

                    {/* Social buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button"
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                background: isDark ? 'rgba(7,20,40,0.6)' : 'rgba(240,244,248,0.8)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)'}`,
                                color: isDark ? '#94a3b8' : '#475569',
                            }}
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                        </button>
                        <button type="button"
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                background: isDark ? 'rgba(7,20,40,0.6)' : 'rgba(240,244,248,0.8)',
                                border: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)'}`,
                                color: isDark ? '#94a3b8' : '#475569',
                            }}
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                        </button>
                    </div>
                </motion.form>

                {/* Switch prompt */}
                <p className="text-center text-xs mt-6" style={{ color: isDark ? '#475569' : '#64748b' }}>
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="font-semibold" style={{ color: isDark ? '#4fc3f7' : '#0284c7' }}>
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </motion.div>
        </div>
    )
}


