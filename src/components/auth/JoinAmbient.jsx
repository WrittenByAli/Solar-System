import React from 'react'

/**
 * Ambient backdrop for the /join hero — three barely-there orbital rings,
 * one small constellation, and a dozen drifting particles. All motion is
 * CSS-driven, 60–240s cycles, and fully disabled under
 * prefers-reduced-motion (see solar-join.css). No canvas, no JS timers.
 */
export default function JoinAmbient() {
    return (
        <div className="sj-ambient" aria-hidden="true">
            <div className="sj-ambient__glow" />
            <div className="sj-ambient__grain" />

            <div className="sj-ambient__ring sj-ambient__ring--1"><i /></div>
            <div className="sj-ambient__ring sj-ambient__ring--2"><i /></div>
            <div className="sj-ambient__ring sj-ambient__ring--3" />

            <svg
                className="sj-ambient__constellation"
                viewBox="0 0 220 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M18 118 L64 74 L118 92 L162 38 M118 92 L196 120 M64 74 L92 22"
                    stroke="currentColor"
                    strokeWidth="1"
                />
                {[[18, 118], [64, 74], [118, 92], [162, 38], [196, 120], [92, 22]].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="currentColor" />
                ))}
            </svg>

            {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={`sj-ambient__particle sj-ambient__particle--${i + 1}`} />
            ))}
        </div>
    )
}
