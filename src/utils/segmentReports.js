/** Local segment reports for moderator review (frontend-only demo). */

export const SEGMENT_REPORTS_LS = 'solarArchiveSegmentReports'

export function loadSegmentReports() {
  try {
    const raw = localStorage.getItem(SEGMENT_REPORTS_LS)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function appendSegmentReport(entry) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sr-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const row = {
    id,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  try {
    const list = loadSegmentReports()
    list.push(row)
    localStorage.setItem(SEGMENT_REPORTS_LS, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('solar-segment-reports-updated', { detail: row }))
  } catch {
    /* quota / private mode */
  }
  return row
}
