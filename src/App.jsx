import React, { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import MapView from './pages/MapView.jsx'
import ArchiveGrid from './pages/ArchiveGrid.jsx'
import Join from './pages/Join.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Reviews from './pages/Reviews.jsx'
import SubmitArchive from './pages/SubmitArchive.jsx'
import StarField from './components/StarField.jsx'

// Theme context
export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

function AnimatedRoutes() {
    const location = useLocation()
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageWrap><Home /></PageWrap>} />
                <Route path="/map" element={<PageWrap><MapView /></PageWrap>} />
                <Route path="/join" element={<PageWrap><Join /></PageWrap>} />
                <Route path="/archive/:planetId" element={<PageWrap><ArchiveGrid /></PageWrap>} />
                <Route path="/leaderboard" element={<PageWrap><Leaderboard /></PageWrap>} />
                <Route path="/reviews" element={<PageWrap><Reviews /></PageWrap>} />
                <Route path="/submit" element={<PageWrap><SubmitArchive /></PageWrap>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    )
}

function PageWrap({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{ minHeight: '100vh' }}
        >
            {children}
        </motion.div>
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
                <div className={theme === 'dark' ? 'bg-[#020408] text-slate-100 min-h-screen relative' : 'bg-white text-slate-900 min-h-screen relative'}>
                    <StarField theme={theme} />
                    <Navbar />
                    <AnimatedRoutes />
                </div>
            </Router>
        </ThemeContext.Provider>
    )
}
