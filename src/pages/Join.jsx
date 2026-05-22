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
        color: isDark ? '#e2e8f0' : '#0f172a',
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
                    <h2 className="text-2xl font-black mb-2" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        {mode === 'login' ? 'Welcome Back!' : 'Account Created!'}
                    </h2>
                    <p className="text-sm mb-4" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
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
                    <h1 className="text-2xl font-black" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        {mode === 'login' ? 'Welcome Back' : 'Join the Archive'}
                    </h1>
                    <p className="text-xs mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
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
                            color: mode === 'login' ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#94a3b8'),
                        }}
                    >
                        <LogIn size={15} /> Login
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200"
                        style={{
                            background: mode === 'signup' ? (isDark ? 'rgba(79,195,247,0.15)' : 'rgba(2,132,199,0.12)') : 'transparent',
                            color: mode === 'signup' ? (isDark ? '#4fc3f7' : '#0284c7') : (isDark ? '#475569' : '#94a3b8'),
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
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                        <input style={inputStyle} type="text" placeholder="Username" value={form.username} onChange={e => set('username', e.target.value)} required />
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                        <input style={inputStyle} type="email" placeholder="Email address" value={form.email} onChange={e => set('email', e.target.value)} required />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                        <input style={inputStyle} type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => set('password', e.target.value)} required />
                        <button type="button" onClick={() => setShowPass(s => !s)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2"
                            style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* Confirm password (signup only) */}
                    {mode === 'signup' && (
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
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
                        <label className="flex items-start gap-2 text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
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
                        <span className="text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>or continue with</span>
                        <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)' }} />
                    </div>

                    {/* Social buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Google', emoji: '🔍' },
                            { label: 'GitHub', emoji: '🐙' },
                        ].map(soc => (
                            <button key={soc.label} type="button"
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                                style={{
                                    background: isDark ? 'rgba(7,20,40,0.6)' : 'rgba(240,244,248,0.8)',
                                    border: `1px solid ${isDark ? 'rgba(79,195,247,0.12)' : 'rgba(15,23,42,0.1)'}`,
                                    color: isDark ? '#94a3b8' : '#475569',
                                }}
                            >
                                <span>{soc.emoji}</span> {soc.label}
                            </button>
                        ))}
                    </div>
                </motion.form>

                {/* Switch prompt */}
                <p className="text-center text-xs mt-6" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
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
