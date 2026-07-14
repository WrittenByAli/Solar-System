import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import FOG from 'vanta/dist/vanta.fog.min'

const FOG_PALETTES = {
  dark: {
    // Atmospheric dusk — luminous enough to read motion, calm (not neon)
    highlightColor: 0x6b8caf,
    midtoneColor: 0x3d5a80,
    lowlightColor: 0x243552,
    baseColor: 0x101828,
    blurFactor: 0.55,
  },
  light: {
    highlightColor: 0xffc078,
    midtoneColor: 0xff9a76,
    lowlightColor: 0x8ec5ff,
    baseColor: 0xf6f1ea,
    blurFactor: 0.48,
  },
}

/**
 * Vanta FOG backdrop — shared by home + map.
 */
export default function VantaFogBackground({
  isDark = true,
  scrollProgress = 0,
  entryReveal = 1,
  className = 'solar-archive-root__vanta',
}) {
  const elRef = useRef(null)
  const effectRef = useRef(null)

  useEffect(() => {
    if (!elRef.current) return undefined

    if (effectRef.current) {
      effectRef.current.destroy()
      effectRef.current = null
    }

    const palette = isDark ? FOG_PALETTES.dark : FOG_PALETTES.light

    effectRef.current = FOG({
      el: elRef.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      ...palette,
      zoom: 1.0,
      speed: isDark ? 0.72 : 0.85,
      scale: 2,
      scaleMobile: 3,
    })

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy()
        effectRef.current = null
      }
    }
  }, [isDark])

  useEffect(() => {
    const effect = effectRef.current
    if (!effect || typeof effect.setOptions !== 'function') return
    const baseZoom = isDark ? 1.06 : 1.04
    const entryZoom = baseZoom - (1 - entryReveal) * 0.12
    effect.setOptions({
      zoom: entryZoom + scrollProgress * (isDark ? 0.26 : 0.28),
      speed: (isDark ? 0.68 : 0.8) + scrollProgress * (isDark ? 0.32 : 0.38) + (1 - entryReveal) * 0.1,
      blurFactor: (isDark ? 0.55 : 0.48) - scrollProgress * 0.05,
    })
  }, [scrollProgress, isDark, entryReveal])

  return (
    <div
      ref={elRef}
      className={className}
      style={{ opacity: isDark ? 0.48 + entryReveal * 0.42 : 0.35 + entryReveal * 0.65 }}
      aria-hidden="true"
    />
  )
}
