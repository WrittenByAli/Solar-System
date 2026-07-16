import { lazy, Suspense, useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// three.js + Vanta is the single heaviest dependency in the app (~189 kB
// gzip). This wrapper is the ONLY place that imports it, and it does so
// dynamically — that keeps three.js out of the entry/route critical paths
// entirely (it becomes an on-idle async chunk) instead of being pinned into
// the eager graph by always-mounted components like Navbar/Footer.
//
// Drop-in replacement for VantaFogBackground: same props, forwarded verbatim.
const VantaFogBackground = lazy(() => import('./VantaFogBackground.jsx'))

/** Skip the animated WebGL fog for motion-sensitive or data-saving users. */
function prefersLightweightBackground(reduceMotion) {
  if (reduceMotion) return true
  if (typeof navigator === 'undefined') return false
  return navigator.connection?.saveData === true
}

export default function LazyVantaFogBackground(props) {
  const reduceMotion = useReducedMotion()
  const lightweight = prefersLightweightBackground(reduceMotion)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (lightweight) return undefined
    // Defer the (heavy) fetch to browser idle after first paint, so three.js
    // never sits on the initial-render / LCP critical path.
    const schedule = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 200))
    const cancel = window.cancelIdleCallback || window.clearTimeout
    const id = schedule(() => setReady(true))
    return () => cancel(id)
  }, [lightweight])

  if (!ready) return null // reduced-motion / Save-Data, or pre-idle: no WebGL fog

  return (
    <Suspense fallback={null}>
      <VantaFogBackground {...props} />
    </Suspense>
  )
}
