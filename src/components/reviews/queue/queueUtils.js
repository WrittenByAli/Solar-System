export const DIFFICULTY_WORDS = { 1: 'Basic', 2: 'Easy', 3: 'Moderate', 4: 'Hard', 5: 'Expert' }

export function coordSlotLabel(e) {
  const x = String(e.coord_x ?? '').padStart(3, '0')
  const y = String(e.coord_y ?? '').padStart(3, '0')
  return `${x}, ${y}`
}

export function timeAgo(iso) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function readingMinutes(...texts) {
  const words = texts.join(' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function parseSegments(entry) {
  if (!entry) return []
  const raw = entry.segments ?? entry.layer_data?.segments
  if (!Array.isArray(raw)) return []
  return raw.map((s, i) => {
    if (typeof s === 'string') return { title: `Segment ${i + 1}`, body: s }
    return {
      title: s.title || s.label || `Segment ${i + 1}`,
      body: s.text || s.content || s.body || '',
    }
  }).filter((s) => s.body)
}
