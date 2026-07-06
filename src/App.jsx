import React, { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useMatch } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import MapView from './pages/MapView.jsx'
import ArchiveGrid from './pages/ArchiveGrid.jsx'
import Join from './pages/Join.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Reviews from './pages/Reviews.jsx'
import SubmitArchive from './pages/SubmitArchive.jsx'
import GradeSubmissions from './pages/GradeSubmissions.jsx'
import CreateArchive from './pages/CreateArchive.jsx'
import HostArchive from './pages/HostArchive.jsx'
import ArchiveDirectory from './pages/ArchiveDirectory.jsx'
import AccountSecurity from './pages/AccountSecurity.jsx'
import SsoCallback from './pages/SsoCallback.jsx'
import EmailLinkVerified from './pages/EmailLinkVerified.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import StarField from './components/StarField.jsx'
import FoundationArchiveStar from './components/FoundationArchiveStar.jsx'
import FoundationLogo from './components/FoundationLogo.jsx'

// Theme context
export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

/** Shown while Clerk restores the session on page load — prevents a
    redirect-to-/join flash for users who are actually signed in. */
function AuthLoadingScreen() {
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
                    Restoring your session…
                </p>
            </div>
        </div>
    )
}

/** Auth gate: every route except /join requires a signed-in account. */
function RequireAuth({ children }) {
    const { isLoggedIn, authLoaded } = useAuth()
    if (!authLoaded) return <AuthLoadingScreen />
    if (!isLoggedIn) return <Navigate to="/join" replace />
    return children
}

function AnimatedRoutes() {
    const location = useLocation()
    const guard = (node) => <RequireAuth>{node}</RequireAuth>
    return (
        <Routes location={location}>
            <Route path="/" element={guard(<PageWrap immersive><Home /></PageWrap>)} />
            <Route path="/map" element={guard(<PageWrap><MapView /></PageWrap>)} />
            <Route path="/join" element={<PageWrap><Join /></PageWrap>} />
            <Route path="/sso-callback" element={<SsoCallback />} />
            <Route path="/email-link-verified" element={<PageWrap><EmailLinkVerified /></PageWrap>} />
            <Route path="/account" element={guard(<PageWrap><AccountSecurity /></PageWrap>)} />
            <Route path="/archive/beacon" element={<Navigate to="/archive/star" replace />} />
            <Route path="/archive/:planetId" element={guard(<PageWrap><ArchiveGrid /></PageWrap>)} />
            <Route path="/leaderboard" element={guard(<PageWrap><Leaderboard /></PageWrap>)} />
            <Route path="/reviews" element={guard(<PageWrap><Reviews /></PageWrap>)} />
            <Route path="/review-queue" element={guard(<PageWrap><GradeSubmissions /></PageWrap>)} />
            <Route path="/submit" element={guard(<PageWrap><SubmitArchive /></PageWrap>)} />
            <Route path="/create-archive" element={guard(<PageWrap><CreateArchive /></PageWrap>)} />
            <Route path="/host-archive" element={guard(<PageWrap><HostArchive /></PageWrap>)} />
            <Route path="/directory" element={guard(<PageWrap><ArchiveDirectory /></PageWrap>)} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function PageWrap({ children, immersive = false }) {
    if (immersive) {
        return <div className="min-h-[100dvh] min-w-0 max-w-full overflow-x-hidden">{children}</div>
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="min-h-[100dvh] min-w-0 max-w-full overflow-x-hidden"
        >
            {children}
        </motion.div>
    )
}

function AppShell() {
    const { theme } = useTheme()
    const isHome = useMatch({ path: '/', end: true })

    return (
        <div className={`min-h-screen relative min-w-0 max-w-[100vw] overflow-x-hidden ${theme === 'dark' ? 'dark bg-[var(--sa-bg)] text-[var(--sa-text)]' : 'light bg-[var(--sa-bg)] text-[var(--sa-text)]'}`}>
            {!isHome && <StarField theme={theme} />}
            <Navbar />
            <FoundationArchiveStar />
            <AnimatedRoutes />
            <Footer />
        </div>
    )
}

export default function App() {
    const [theme, setTheme] = useState('dark')

    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
        } else {
            root.classList.remove('dark')
            root.classList.add('light')
        }
    }, [theme])

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <Router>
                <AuthProvider>
                    <AppShell />
                </AuthProvider>
            </Router>
        </ThemeContext.Provider>
    )
}
