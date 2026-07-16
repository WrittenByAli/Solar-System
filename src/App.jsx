import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useMatch, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import StarField from './components/StarField.jsx'
import FoundationArchiveStar from './components/FoundationArchiveStar.jsx'
import FoundationLogo from './components/FoundationLogo.jsx'
import GuestGate from './components/GuestGate.jsx'

// Route-level code splitting: each page (and everything only it imports —
// notably three.js/vanta, which only Home touches) loads on first
// visit to its route instead of shipping in the entry bundle.
const Home = lazy(() => import('./pages/Home.jsx'))
const MapView = lazy(() => import('./pages/MapView.jsx'))
const ArchiveGrid = lazy(() => import('./pages/ArchiveGrid.jsx'))
const Join = lazy(() => import('./pages/Join.jsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'))
const Reviews = lazy(() => import('./pages/Reviews.jsx'))
const SubmitArchive = lazy(() => import('./pages/SubmitArchive.jsx'))
const MySubmissions = lazy(() => import('./pages/MySubmissions.jsx'))
const GradeSubmissions = lazy(() => import('./pages/GradeSubmissions.jsx'))
const CreateArchive = lazy(() => import('./pages/CreateArchive.jsx'))
const HostArchive = lazy(() => import('./pages/HostArchive.jsx'))
const ArchiveDirectory = lazy(() => import('./pages/ArchiveDirectory.jsx'))
const AccountSecurity = lazy(() => import('./pages/AccountSecurity.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const SsoCallback = lazy(() => import('./pages/SsoCallback.jsx'))
const EmailLinkVerified = lazy(() => import('./pages/EmailLinkVerified.jsx'))
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'))

// Theme context
export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

/** Full-viewport pulsing-logo loader. Doubles as the auth-restore screen
    (prevents a redirect-to-/join flash for signed-in users) and the
    Suspense fallback while a route's chunk downloads. */
function LoadingScreen({ message }) {
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
                    {message}
                </p>
            </div>
        </div>
    )
}

/** Auth gate: browse routes admit signed-in members AND explicit guest
    sessions; everyone else is sent to /join. */
function RequireAuth({ children }) {
    const { isLoggedIn, isGuest, authLoaded } = useAuth()
    if (!authLoaded) return <LoadingScreen message="Restoring your session…" />
    if (!isLoggedIn && !isGuest) return <Navigate to="/join" replace />
    return children
}

/** Member gate: contribution surfaces (submit, reviews, account…). Guests
    see an upgrade prompt instead of the page — never a silent bounce. */
function RequireMember({ children }) {
    const { isLoggedIn, isGuest, authLoaded } = useAuth()
    if (!authLoaded) return <LoadingScreen message="Restoring your session…" />
    if (isLoggedIn) return children
    if (isGuest) return <GuestGate />
    return <Navigate to="/join" replace />
}

/** Reviewer gate: /review-queue. Guests get the same upgrade prompt as any
    other contribution route; signed-in members without reviewer access are
    redirected to /leaderboard rather than shown an in-place locked screen. */
function RequireReviewer({ children }) {
    const { isLoggedIn, isGuest, authLoaded, profileReady, canAccessReviewerQueue } = useAuth()
    if (!authLoaded) return <LoadingScreen message="Restoring your session…" />
    if (isLoggedIn && !profileReady) return <LoadingScreen message="Loading your profile…" />
    if (!isLoggedIn && !isGuest) return <Navigate to="/join" replace />
    if (isGuest) return <GuestGate />
    if (!canAccessReviewerQueue) return <Navigate to="/leaderboard" replace />
    return children
}

/** Admin gate: /admin. No admin "waiting room" exists, so a non-admin is
    sent home rather than shown an upgrade prompt — admin isn't something
    a member can request or earn through the UI. */
function RequireAdmin({ children }) {
    const { isLoggedIn, isGuest, authLoaded, profileReady, canAccessAdmin } = useAuth()
    if (!authLoaded) return <LoadingScreen message="Restoring your session…" />
    if (isLoggedIn && !profileReady) return <LoadingScreen message="Loading your profile…" />
    if (!isLoggedIn && !isGuest) return <Navigate to="/join" replace />
    if (isGuest) return <GuestGate />
    if (!canAccessAdmin) return <Navigate to="/" replace />
    return children
}

function AnimatedRoutes() {
    const location = useLocation()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [location.pathname])

    const guard = (node) => <RequireAuth>{node}</RequireAuth>
    const memberGuard = (node) => <RequireMember>{node}</RequireMember>
    const reviewerGuard = (node) => <RequireReviewer>{node}</RequireReviewer>
    const adminGuard = (node) => <RequireAdmin>{node}</RequireAdmin>
    // SubmitArchive has several mutually-exclusive modes (segment report, edit
    // an existing entry, deepen an existing entry, plain new submission) driven
    // by these three params. React Router does NOT remount a route element when
    // only its query string changes (same /submit path), so without this key,
    // switching modes via client-side navigation (e.g. clicking "Submit" in the
    // navbar while a segment-report deep link is open) leaves stale form state
    // (and a stale draft-autosave timer) from the old mode alive in the new one.
    // Keyed only on these three -- NOT the full search string -- so routine
    // param changes the form makes itself (archiveLayer, nextSegmentSlot, tags)
    // don't force a remount mid-edit.
    const submitModeKey = `${searchParams.get('intent') || ''}|${searchParams.get('editEntryId') || ''}|${searchParams.get('updatesEntryId') || ''}`
    const reduceMotion = useReducedMotion()
    const pageEase = [0.22, 1, 0.36, 1]
    const pageVariants = {
        initial: (pathname) => ({
            opacity: 1,
            y: reduceMotion ? 0 : (pathname === '/' ? 0 : 14),
        }),
        animate: { opacity: 1, y: 0 },
        exit: (pathname) => ({
            opacity: reduceMotion ? 1 : 0,
            y: reduceMotion ? 0 : (pathname === '/' ? 0 : -10),
        }),
    }

    return (
        <AnimatePresence initial={false}>
            <motion.div
                key={location.pathname}
                custom={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.32, ease: pageEase }}
                className="min-h-[100dvh] min-w-0 max-w-full overflow-x-hidden"
            >
                <Suspense fallback={<LoadingScreen message="Loading…" />}>
                    <Routes location={location}>
                        <Route path="/" element={guard(<PageWrap><Home /></PageWrap>)} />
                        <Route path="/map" element={guard(<PageWrap><MapView /></PageWrap>)} />
                        <Route path="/join" element={<PageWrap><Join /></PageWrap>} />
                        <Route path="/sso-callback" element={<SsoCallback />} />
                        <Route path="/email-link-verified" element={<PageWrap><EmailLinkVerified /></PageWrap>} />
                        <Route path="/account" element={memberGuard(<PageWrap><AccountSecurity /></PageWrap>)} />
                        <Route path="/profile" element={memberGuard(<PageWrap><Profile /></PageWrap>)} />
                        <Route path="/archive/beacon" element={<Navigate to="/archive/star" replace />} />
                        <Route path="/archive/:planetId" element={guard(<PageWrap><ArchiveGrid /></PageWrap>)} />
                        <Route path="/leaderboard" element={guard(<PageWrap><Leaderboard /></PageWrap>)} />
                        <Route path="/reviews" element={memberGuard(<PageWrap><Reviews /></PageWrap>)} />
                        <Route path="/review-queue" element={reviewerGuard(<PageWrap><GradeSubmissions /></PageWrap>)} />
                        <Route path="/admin" element={adminGuard(<PageWrap><AdminPanel /></PageWrap>)} />
                        <Route path="/submit" element={memberGuard(<PageWrap><SubmitArchive key={submitModeKey} /></PageWrap>)} />
                        <Route path="/my-submissions" element={memberGuard(<PageWrap><MySubmissions /></PageWrap>)} />
                        <Route path="/create-archive" element={memberGuard(<PageWrap><CreateArchive /></PageWrap>)} />
                        <Route path="/host-archive" element={memberGuard(<PageWrap><HostArchive /></PageWrap>)} />
                        <Route path="/directory" element={guard(<PageWrap><ArchiveDirectory /></PageWrap>)} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </motion.div>
        </AnimatePresence>
    )
}

function PageWrap({ children }) {
    return children
}

function AppShell() {
    const { theme } = useTheme()
    const isHome = useMatch({ path: '/', end: true })
    const isMap = useMatch({ path: '/map', end: true })
    const isLeaderboard = useMatch({ path: '/leaderboard', end: true })
    const isHostArchive = useMatch({ path: '/host-archive', end: true })
    const isSubmit = useMatch({ path: '/submit', end: true })
    const isDirectory = useMatch({ path: '/directory', end: true })
    const isReviews = useMatch({ path: '/reviews', end: true })
    const isReviewQueue = useMatch({ path: '/review-queue', end: true })
    const hideStarField = isHome || isMap || isLeaderboard || isHostArchive || isSubmit || isDirectory || isReviews || isReviewQueue

    return (
        <div className={`min-h-screen relative min-w-0 max-w-[100vw] overflow-x-hidden ${theme === 'dark' ? 'dark bg-[var(--sa-bg)] text-[var(--sa-text)]' : 'light bg-[var(--sa-bg)] text-[var(--sa-text)]'}`}>
            {/* HashRouter owns the URL fragment — letting this anchor mutate
                the hash would read as a route change ("/main-content" is
                unknown -> redirected home), so the skip happens in-page. */}
            <a
                href="#main-content"
                className="solar-skip-link"
                onClick={(e) => {
                    e.preventDefault()
                    document.getElementById('main-content')?.focus()
                }}
            >Skip to content</a>
            {!hideStarField && <StarField theme={theme} />}
            <Navbar />
            <FoundationArchiveStar />
            <main id="main-content" tabIndex={-1}>
                <AnimatedRoutes />
            </main>
            <Footer />
        </div>
    )
}

export default function App() {
    // index.html stamps this same key on <html> before first paint, so the
    // pre-React and post-React theme always agree — no flash on reload.
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('sa-theme') === 'light' ? 'light' : 'dark'
        } catch {
            return 'dark'
        }
    })

    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
        } else {
            root.classList.remove('dark')
            root.classList.add('light')
        }
        try {
            localStorage.setItem('sa-theme', theme)
        } catch { /* storage unavailable (private mode) — theme still works for the session */ }
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
