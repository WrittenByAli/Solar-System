export const SUN = {
  radius: 0.78,
  color: '#ff7a2e',
  emissive: '#ff4500',
}

export const PLANETS = [
  { id: 'mercury', radius: 0.11, orbit: 2.5, speed: 1.3, color: '#8b9199', emissive: '#5c6370', tilt: 0.02 },
  { id: 'venus', radius: 0.17, orbit: 3.3, speed: 1.0, color: '#e8c872', emissive: '#b8860b', tilt: 0.04 },
  { id: 'earth', radius: 0.19, orbit: 4.2, speed: 0.85, color: '#2d8f6f', emissive: '#0d6e4f', atmosphere: '#4fc3f7', tilt: 0.06 },
  { id: 'mars', radius: 0.15, orbit: 5.1, speed: 0.7, color: '#c44e33', emissive: '#8b2e1a', tilt: 0.08 },
  { id: 'jupiter', radius: 0.44, orbit: 7.0, speed: 0.4, color: '#c9956a', emissive: '#8b5a2b', tilt: 0.03 },
  { id: 'saturn', radius: 0.37, orbit: 8.8, speed: 0.3, color: '#dbc88a', emissive: '#a08040', tilt: 0.12, rings: true },
  { id: 'uranus', radius: 0.27, orbit: 10.4, speed: 0.22, color: '#6ecde0', emissive: '#0891b2', tilt: 0.18 },
  { id: 'neptune', radius: 0.25, orbit: 11.8, speed: 0.17, color: '#4a6fd8', emissive: '#1e3a8a', tilt: 0.1 },
]

/** Asteroid belt between Mars & Jupiter — break thresholds tied to scroll */
export const METEOROIDS = [
  { id: 0, orbit: 5.85, angle: 0.4, size: 0.22, breakAt: 0.08, y: 0.12, spin: 0.6 },
  { id: 1, orbit: 6.05, angle: 1.8, size: 0.28, breakAt: 0.18, y: -0.08, spin: 0.45 },
  { id: 2, orbit: 6.2, angle: 3.1, size: 0.19, breakAt: 0.28, y: 0.05, spin: 0.55 },
  { id: 3, orbit: 6.35, angle: 4.6, size: 0.32, breakAt: 0.38, y: -0.14, spin: 0.35 },
  { id: 4, orbit: 6.5, angle: 5.9, size: 0.24, breakAt: 0.48, y: 0.1, spin: 0.5 },
  { id: 5, orbit: 6.65, angle: 0.9, size: 0.26, breakAt: 0.58, y: -0.06, spin: 0.42 },
  { id: 6, orbit: 6.8, angle: 2.4, size: 0.2, breakAt: 0.68, y: 0.15, spin: 0.48 },
  { id: 7, orbit: 6.95, angle: 3.8, size: 0.3, breakAt: 0.78, y: -0.11, spin: 0.38 },
]
