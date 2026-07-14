import { SCROLL_CHAPTER_COUNT } from '../components/solar-archive/scrollChapters.js'

export function chapterStepPx() {
  return window.innerHeight || 1
}

export function chapterIndexToProgress(index) {
  if (SCROLL_CHAPTER_COUNT <= 1) return 0
  return index / (SCROLL_CHAPTER_COUNT - 1)
}

export function scrollYToChapterIndex(scrollY) {
  const step = chapterStepPx()
  const idx = Math.round(scrollY / step)
  return Math.max(0, Math.min(SCROLL_CHAPTER_COUNT - 1, idx))
}

export function chapterIndexToScrollY(index) {
  return index * chapterStepPx()
}

/** Snap drift to the nearest chapter top after scroll settles. */
export function snapScrollToChapter(index, behavior = 'smooth') {
  const targetY = chapterIndexToScrollY(index)
  if (Math.abs(window.scrollY - targetY) > 2) {
    window.scrollTo({ top: targetY, behavior })
  }
  return targetY
}
