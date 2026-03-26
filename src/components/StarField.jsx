import React, { useMemo } from 'react'
import { useTheme } from '../App.jsx'

function randomBetween(min, max) {
    return Math.random() * (max - min) + min
}

export default function StarField({ theme }) {
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

    return (
        <div className="stars-container" aria-hidden="true">
            {stars.map(s => (
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
        </div>
    )
}
