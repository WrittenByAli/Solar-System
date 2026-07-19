import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import E2eAuthProvider from './e2e/E2eAuthProvider.jsx'
import './index.css'
import './styles/glass-surfaces.css'
import './styles/sa-frost-card.css'

const E2E_MODE = import.meta.env.VITE_E2E === 'true'
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!E2E_MODE && !PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')
}

// Routes are lazy-loaded (App.jsx), so a deploy can invalidate chunk hashes
// under an already-open tab; the next navigation then requests a chunk that
// no longer exists. Vite reports that as vite:preloadError — reload to pick
// up the new index.html. The timestamp guard stops a reload loop if the
// failure is anything other than a stale deploy (e.g. user is offline).
// clerk-js is loaded from Clerk's CDN; when a network blocks that host the
// loader rejects with failed_to_load_clerk_js(_timeout) *outside* any React
// error path. The UI already handles this (AuthContext times out to a
// signed-out state and /join offers guest mode), so contain just this
// rejection instead of letting it surface as an uncaught error.
window.addEventListener('unhandledrejection', (event) => {
    const code = event.reason?.code || ''
    if (typeof code === 'string' && code.startsWith('failed_to_load_clerk_js')) {
        event.preventDefault()
    }
})

window.addEventListener('vite:preloadError', (event) => {
    const RELOAD_GUARD_KEY = 'sa-chunk-reload-at'
    const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0
    if (Date.now() - lastReload < 30_000) return // let the error surface instead
    event.preventDefault()
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
    window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {E2E_MODE ? (
        <E2eAuthProvider>
          <App />
        </E2eAuthProvider>
      ) : (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <App />
        </ClerkProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
)
