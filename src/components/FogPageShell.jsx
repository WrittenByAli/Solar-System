import { useEffect, useState } from 'react'
import VantaFogBackground from './solar-archive/VantaFogBackground.jsx'
import '../styles/solar-fog-page.css'

/** Eased 0→1 reveal for fog page content (matches /reviews). */
export function useSceneReveal(duration = 900) {
  const [sceneReveal, setSceneReveal] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setSceneReveal(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration])

  return sceneReveal
}

export default function FogPageShell({ isDark, sceneReveal, className = '', children }) {
  return (
    <div className={`sa-fog-page${isDark ? ' sa-fog-page--dark' : ' sa-fog-page--light'} ${className}`.trim()}>
      <VantaFogBackground
        isDark={isDark}
        entryReveal={sceneReveal}
        className="sa-fog-page__vanta"
      />
      <div
        className="sa-fog-page__veil"
        style={{ opacity: Math.max(0, (isDark ? 0.14 : 0.1) - sceneReveal * (isDark ? 0.22 : 0.16)) }}
        aria-hidden="true"
      />
      <div
        className="sa-fog-page__vignette"
        style={{ opacity: isDark ? 0.2 + sceneReveal * 0.06 : 0.14 + sceneReveal * 0.04 }}
        aria-hidden="true"
      />
      <div className="sa-fog-page__inner" style={{ opacity: sceneReveal }}>
        {children}
      </div>
    </div>
  )
}
