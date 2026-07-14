import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

/** Number that eases from 0 to `value` the first time it scrolls into view. */
export default function AnimatedCounter({ value = 0, duration = 1.3, format = (n) => Math.round(n).toLocaleString(), className, style }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-30px' })
    const reduce = useReducedMotion()
    const [display, setDisplay] = useState(0)

    useEffect(() => {
        if (!inView) return undefined
        if (reduce || !value) {
            setDisplay(value)
            return undefined
        }
        let raf = 0
        const start = performance.now()
        const tick = (now) => {
            const t = Math.min(1, (now - start) / (duration * 1000))
            setDisplay(value * (1 - Math.pow(1 - t, 3)))
            if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [inView, value, duration, reduce])

    return (
        <span ref={ref} className={className} style={style}>
            {format(display)}
        </span>
    )
}
