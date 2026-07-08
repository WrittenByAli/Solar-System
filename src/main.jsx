import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')
}

// Routes are lazy-loaded (App.jsx), so a deploy can invalidate chunk hashes
// under an already-open tab; the next navigation then requests a chunk that
// no longer exists. Vite reports that as vite:preloadError — reload to pick
// up the new index.html. The timestamp guard stops a reload loop if the
// failure is anything other than a stale deploy (e.g. user is offline).
window.addEventListener('vite:preloadError', (event) => {
    const RELOAD_GUARD_KEY = 'sa-chunk-reload-at'
    const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0
    if (Date.now() - lastReload < 30_000) return // let the error surface instead
    event.preventDefault()
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
    window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
    </ClerkProvider>,
)
