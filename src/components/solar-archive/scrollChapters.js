/** Scroll chapter spacers — one viewport per section; snap scroll advances one at a time. */
export const SCROLL_CHAPTERS = [
  { id: 'hero', height: '100vh', weight: 1 },
  { id: 'stats-0', height: '100vh', weight: 1, group: 'stats' },
  { id: 'stats-1', height: '100vh', weight: 1, group: 'stats' },
  { id: 'stats-2', height: '100vh', weight: 1, group: 'stats' },
  { id: 'stats-3', height: '100vh', weight: 1, group: 'stats' },
  { id: 'statement-0', height: '100vh', weight: 1, group: 'statement' },
  { id: 'statement-1', height: '100vh', weight: 1, group: 'statement' },
  { id: 'statement-2', height: '100vh', weight: 1, group: 'statement' },
  { id: 'statement-3', height: '100vh', weight: 1, group: 'statement' },
  { id: 'mechanics', height: '100vh', weight: 1 },
  { id: 'hubs-0', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-1', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-2', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-3', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-4', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-5', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-6', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-7', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-8', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'hubs-9', height: '100vh', weight: 1, group: 'hubs' },
  { id: 'features-intro', height: '100vh', weight: 1, group: 'features' },
  { id: 'features-0', height: '100vh', weight: 1, group: 'features' },
  { id: 'features-1', height: '100vh', weight: 1, group: 'features' },
  { id: 'features-2', height: '100vh', weight: 1, group: 'features' },
  { id: 'features-3', height: '100vh', weight: 1, group: 'features' },
  { id: 'cta-0', height: '100vh', weight: 1, group: 'cta' },
  { id: 'cta-1', height: '100vh', weight: 1, group: 'cta' },
]

export const SCROLL_CHAPTER_COUNT = SCROLL_CHAPTERS.length

export function getChapterMeta(index) {
  const chapter = SCROLL_CHAPTERS[index]
  if (!chapter) return { type: 'stage', group: null, groupIndex: 0, id: null }

  if (chapter.group) {
    const groupStart = SCROLL_CHAPTERS.findIndex((ch) => ch.group === chapter.group)
    return {
      type: 'reveal',
      group: chapter.group,
      groupIndex: index - groupStart,
      id: chapter.id,
    }
  }

  return { type: 'stage', group: null, groupIndex: 0, id: chapter.id }
}

/** @deprecated use getChapterMeta */
export const STATEMENT_CHAPTER_START = SCROLL_CHAPTERS.findIndex((ch) => ch.group === 'statement')
/** @deprecated use getChapterMeta */
export const STATEMENT_CHAPTER_COUNT = SCROLL_CHAPTERS.filter((ch) => ch.group === 'statement').length

/** @deprecated use getChapterMeta */
export function isStatementChapterIndex(index) {
  const meta = getChapterMeta(index)
  return meta.type === 'reveal' && meta.group === 'statement'
}

const TOTAL_WEIGHT = SCROLL_CHAPTERS.reduce((sum, ch) => sum + ch.weight, 0)

/** Cumulative weight fractions [0, end0, end1, ..., 1] */
export const SCROLL_CHAPTER_ENDS = SCROLL_CHAPTERS.reduce((ends, ch) => {
  const prev = ends[ends.length - 1] ?? 0
  ends.push(prev + ch.weight / TOTAL_WEIGHT)
  return ends
}, [])

/** Fade ratio within each slot — keep low so only one section reads as active. */
export const SCROLL_FADE_RATIO = 0.06

export function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * Returns 0–1 opacity for chapter at `index`. Only one chapter is fully visible at a time.
 */
export function chapterSlotOpacity(scrollProgress, index, fadeRatio = SCROLL_FADE_RATIO) {
  const slotStart = index === 0 ? 0 : SCROLL_CHAPTER_ENDS[index - 1]
  const slotEnd = SCROLL_CHAPTER_ENDS[index]
  const slotSize = slotEnd - slotStart
  const fade = slotSize * fadeRatio

  if (scrollProgress <= slotStart || scrollProgress >= slotEnd) return 0
  if (scrollProgress < slotStart + fade) return (scrollProgress - slotStart) / fade
  if (scrollProgress > slotEnd - fade) return (slotEnd - scrollProgress) / fade
  return 1
}

/** Local progress 0–1 inside a chapter slot */
export function chapterLocalProgress(scrollProgress, index) {
  const slotStart = index === 0 ? 0 : SCROLL_CHAPTER_ENDS[index - 1]
  const slotEnd = SCROLL_CHAPTER_ENDS[index]
  if (scrollProgress <= slotStart || scrollProgress >= slotEnd) return 0
  return (scrollProgress - slotStart) / (slotEnd - slotStart)
}

/** Active chapter from weighted scroll progress */
export function getChapterFromProgress(scrollProgress) {
  const p = Math.max(0, Math.min(1, scrollProgress))
  let index = 0
  for (let i = 0; i < SCROLL_CHAPTER_ENDS.length; i++) {
    if (p < SCROLL_CHAPTER_ENDS[i] || i === SCROLL_CHAPTER_ENDS.length - 1) {
      index = i
      break
    }
  }
  // Edge: if exactly at 1, stay on last chapter
  if (p >= 1) index = SCROLL_CHAPTER_COUNT - 1

  const slotStart = index === 0 ? 0 : SCROLL_CHAPTER_ENDS[index - 1]
  const slotEnd = SCROLL_CHAPTER_ENDS[index]
  const local = slotEnd > slotStart ? (p - slotStart) / (slotEnd - slotStart) : 0

  let opacity = 1
  if (local < SCROLL_FADE_RATIO && index > 0) {
    opacity = smoothstep(local / SCROLL_FADE_RATIO)
  } else if (local > 1 - SCROLL_FADE_RATIO && index < SCROLL_CHAPTER_COUNT - 1) {
    opacity = smoothstep((1 - local) / SCROLL_FADE_RATIO)
  }

  return {
    index,
    opacity: Math.max(0, Math.min(1, opacity)),
    local: Math.max(0, Math.min(1, local)),
  }
}

/** Discrete chapter (scroll-snap / wheel step) — one section fully active. */
export function getChapterFromIndex(index) {
  const i = Math.max(0, Math.min(SCROLL_CHAPTER_COUNT - 1, Math.round(index)))
  return { index: i, opacity: 1, local: 0 }
}
