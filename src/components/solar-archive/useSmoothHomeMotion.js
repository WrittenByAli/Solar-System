import { useEffect, useRef } from 'react'

/** Smooth lerp for scroll + pointer — used by homepage 3D + UI */
export function useSmoothHomeMotion({ enabled, onScrollRaw, onSmoothUpdate }) {
  const scrollTarget = useRef(0)
  const scrollSmooth = useRef(0)
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseSmooth = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!enabled) return

    const onMove = (e) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let frame
    const tick = () => {
      scrollSmooth.current += (scrollTarget.current - scrollSmooth.current) * 0.07
      mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * 0.055
      mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * 0.055

      onSmoothUpdate({
        scrollProgress: scrollSmooth.current,
        mouse: { x: mouseSmooth.current.x, y: mouseSmooth.current.y },
        parallax: { x: mouseSmooth.current.x, y: mouseSmooth.current.y },
      })

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [enabled, onSmoothUpdate])

  const setScrollTarget = (p) => {
    scrollTarget.current = p
    onScrollRaw?.(p)
  }

  return { setScrollTarget }
}
