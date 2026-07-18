import React, { useId } from 'react'

/**
 * Custom “A” glyph with central four-point star cutout (matches SOLAR branding).
 * Uses fill-rule evenodd: outer block A minus star hole.
 */
export default function SolarBrandA({
    className = '',
    style = {},
    /** Optional SVG gradient (e.g. hero title). Omit to use currentColor. */
    gradientStops = null,
    /** Accessible hidden label */
    title = '',
}) {
    const gid = useId().replace(/:/g, '')
    const fill = gradientStops?.length ? `url(#sol-a-grad-${gid})` : 'currentColor'

    return (
        <svg
            className={className}
            style={{
                display: 'inline-block',
                verticalAlign: 'baseline',
                /* Match surrounding caps (Anton); scales with parent font-size */
                height: '1cap',
                width: 'calc(1cap * 100 / 138)',
                flexShrink: 0,
                position: 'relative',
                top: 0,
                ...style,
            }}
            viewBox="0 0 100 138"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden={title ? undefined : true}
            {...(title ? { role: 'img', 'aria-label': title } : {})}
        >
            {gradientStops?.length > 0 && (
                <defs>
                    <linearGradient id={`sol-a-grad-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        {gradientStops.map((s, i) => (
                            <stop key={i} offset={s.offset} stopColor={s.color} />
                        ))}
                    </linearGradient>
                </defs>
            )}
            <path
                fill={fill}
                fillRule="evenodd"
                clipRule="evenodd"
                d="
                  M 19 3 L 81 3 L 91 133 L 62 133 L 62 93 L 38 93 L 38 133 L 9 133 L 19 3 Z
                  M 50 38 Q 52.5 57.5 66 60 Q 52.5 62.5 50 82 Q 47.5 62.5 34 60 Q 47.5 57.5 50 38 Z
                "
            />
        </svg>
    )
}

/** “SOL” + brand A + “R”, baseline-aligned; inherits text color for solid contexts. */
export function SolarWordCore({ className = '', gradientStops = null }) {
    return (
        <span
            className={`inline-flex items-center ${className ?? ''}`.trim()}
            style={{ letterSpacing: 'inherit' }}
        >
            <span>SOL</span>
            <SolarBrandA gradientStops={gradientStops} className="-mx-[0.02em]" />
            <span>R</span>
        </span>
    )
}
