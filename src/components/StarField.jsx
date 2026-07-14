import React, { memo, useMemo } from 'react'
import { foundationLogoPath } from './FoundationLogo.jsx'

function randomBetween(min, max) {
    return Math.random() * (max - min) + min
}

/** A few fixed positions for Foundation archive markers (hash link for HashRouter). */
const FOUNDATION_MARKERS = [
    { left: '11%', top: '16%', size: 20 },
    { left: '84%', top: '22%', size: 18 },
    { left: '72%', top: '68%', size: 22 },
    { left: '18%', top: '74%', size: 18 },
    { left: '48%', top: '38%', size: 16 },
]

/* memo: AppShell re-renders on every route change (useMatch); the 200-star
   field only depends on theme, so skip re-rendering its 205 nodes. */
export default memo(function StarField({ theme }) {
    const stars = useMemo(() => {
        return Array.from({ length: 200 }, (_, i) => ({
            id: i,
            left: `${randomBetween(0, 100)}%`,
            top: `${randomBetween(0, 100)}%`,
            size: randomBetween(0.8, 2.5),
            duration: randomBetween(2, 6),
            delay: randomBetween(0, 5),
            opacity: randomBetween(0.3, 0.9),
        }))
    }, [])

    if (theme === 'light') return null

    const logoSrc = foundationLogoPath(theme)

    return (
        <div className="stars-container" aria-hidden="true">
            {stars.map((s) => (
                <div
                    key={s.id}
                    className="star"
                    style={{
                        left: s.left,
                        top: s.top,
                        width: s.size,
                        height: s.size,
                        opacity: s.opacity,
                        '--twinkle-duration': `${s.duration}s`,
                        '--twinkle-delay': `${s.delay}s`,
                    }}
                />
            ))}
            {FOUNDATION_MARKERS.map((m, idx) => (
                <a
                    key={`found-${idx}`}
                    href="#/archive/star"
                    className="pointer-events-auto absolute z-[1] opacity-[0.82] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full"
                    style={{ left: m.left, top: m.top, width: m.size, height: m.size }}
                    aria-hidden="false"
                    title="North Star archive — Foundation memoranda & canon"
                    aria-label="Open the North Star archive — Foundation memoranda and projects"
                >
                    <img
                        src={logoSrc}
                        alt=""
                        width={m.size}
                        height={m.size}
                        draggable={false}
                        className="block w-full h-full object-contain drop-shadow-[0_0_12px_rgba(79,195,247,0.45)]"
                    />
                </a>
            ))}
        </div>
    )
})
