import React from 'react'
import { useTheme } from '../App.jsx'

/** Public URLs for theme-specific marks (files in /public). */
export function foundationLogoPath(theme) {
    const base = import.meta.env.BASE_URL || '/'
    const root = base.endsWith('/') ? base : `${base}/`
    return theme === 'dark'
        ? `${root}foundation-logo-dark.png`
        : `${root}foundation-logo-light.png`
}

/**
 * Four-point foundation star — dark/light assets from /public.
 * Use fillCircle inside a square rounded-full wrapper so the mark scales to the inner circle.
 */
export default function FoundationLogo({
    size = 24,
    fillCircle = false,
    /** How much of the parent circle the graphic fills (object-fit: contain within this box). */
    circleFill = '94%',
    className = '',
    style = {},
    alt = 'SOLAR Foundation mark',
}) {
    const { theme } = useTheme()
    const src = foundationLogoPath(theme)
    const px = typeof size === 'number' ? `${size}px` : size
    const dimensionStyle = fillCircle
        ? {
              width: circleFill,
              height: circleFill,
              maxWidth: circleFill,
              maxHeight: circleFill,
              minWidth: 0,
              minHeight: 0,
              objectFit: 'contain',
              display: 'block',
          }
        : {
              width: px,
              height: px,
              objectFit: 'contain',
              display: 'block',
          }
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            draggable={false}
            style={{ ...dimensionStyle, ...style }}
        />
    )
}
