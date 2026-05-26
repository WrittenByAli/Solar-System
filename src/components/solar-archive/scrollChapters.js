/** Non-overlapping scroll chapter spacers — equal height for clean 1:1 mapping */
export const SCROLL_CHAPTERS = [
  { id: 'hero', height: '100vh' },
  { id: 'stats', height: '100vh' },
  { id: 'statement', height: '100vh' },
  { id: 'mechanics', height: '100vh' },
  { id: 'hubs', height: '100vh' },
  { id: 'features', height: '100vh' },
  { id: 'cta', height: '100vh' },
]

export const SCROLL_CHAPTER_COUNT = SCROLL_CHAPTERS.length

/** Fade ratio within each slot — higher = smoother longer transitions */
export const SCROLL_FADE_RATIO = 0.22

export function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * Returns 0–1 opacity for chapter at `index`. Only one chapter is fully visible at a time.
 */
export function chapterSlotOpacity(scrollProgress, index, total = SCROLL_CHAPTER_COUNT, fadeRatio = SCROLL_FADE_RATIO) {
  const slotStart = index / total
  const slotEnd = (index + 1) / total
  const slotSize = slotEnd - slotStart
  const fade = slotSize * fadeRatio

  if (scrollProgress <= slotStart || scrollProgress >= slotEnd) return 0
  if (scrollProgress < slotStart + fade) return (scrollProgress - slotStart) / fade
  if (scrollProgress > slotEnd - fade) return (slotEnd - scrollProgress) / fade
  return 1
}

/** Local progress 0–1 inside a chapter slot */
export function chapterLocalProgress(scrollProgress, index, total = SCROLL_CHAPTER_COUNT) {
  const slotStart = index / total
  const slotEnd = (index + 1) / total
  if (scrollProgress <= slotStart || scrollProgress >= slotEnd) return 0
  return (scrollProgress - slotStart) / (slotEnd - slotStart)
}
