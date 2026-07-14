/** Planet hub accent colors — shared by /reviews and /review-queue */
export const HUB_COLORS = {
  sun: '#ff6b35',
  mercury: '#9ca3af',
  venus: '#fbbf24',
  earth: '#34d399',
  mars: '#f87171',
  jupiter: '#fb923c',
  saturn: '#fde68a',
  uranus: '#67e8f9',
  neptune: '#818cf8',
  star: '#f5a623',
}

export const HUB_LABELS = {
  'Sun Hub': 'sun',
  'Earth Hub': 'earth',
  'Mars Hub': 'mars',
  'Mercury Hub': 'mercury',
  'Neptune Hub': 'neptune',
  'Saturn Hub': 'saturn',
  'Jupiter Hub': 'jupiter',
  'Venus Hub': 'venus',
  'Uranus Hub': 'uranus',
}

export function hubColor(hubLabel) {
  const id = HUB_LABELS[hubLabel]
  return (id && HUB_COLORS[id]) || 'var(--sa-accent)'
}
