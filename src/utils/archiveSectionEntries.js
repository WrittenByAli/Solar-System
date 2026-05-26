import { getSubmissions, migrateSubmission } from './submissionStorage.js'
import {
  buildSortedSegments,
  segmentsToStrings,
  normalizeSegmentsEasiestFirst,
} from './segmentDifficulty.js'
import { placeSectionOnGrid } from './foundationSectionPlacement.js'

/**
 * Merge static planet sections + approved submissions into the same `gx,gy` map used by ArchiveGrid.
 * Stays in sync with ArchiveGrid’s `sectionEntries` merge rules.
 */
export function buildMergedSectionEntries(planet, halfW, halfH) {
  const m = {}
  const pidForPlace = String(planet.id || planet.planet || '').toLowerCase()
  planet.sections?.forEach((s, i) => {
    const fullText = s.content || s.fullDepth || s.detailedSummary || s.shortSummary || ''
    let segmentStrings = fullText.match(/[^.!?]+[.!?]*/g) || [fullText]
    segmentStrings = segmentStrings.map((sg) => sg.trim()).filter((sg) => sg.length > 0)
    const segments = buildSortedSegments(segmentStrings, null)
    const sectionWithHub = { ...s, _planetId: pidForPlace }
    const { gx, gy } = placeSectionOnGrid(sectionWithHub, i, halfW, halfH)
    m[`${gx},${gy}`] = {
      title: s.title,
      content: fullText,
      shortSummary: s.shortSummary || fullText.slice(0, 400),
      segments,
      attachments: s.attachments || [],
      tags: s.tags || [],
      alternatePerspectives: Array.isArray(s.alternatePerspectives) ? s.alternatePerspectives : [],
      foundationMeta: s.foundationMeta || null,
    }
  })
  const pid = String(planet.id || planet.planet || '').toLowerCase()
  try {
    const persisted = getSubmissions()
    persisted.forEach((raw) => {
      const e = migrateSubmission(raw)
      if (e.status !== 'approved') return
      if (String(e.planet || '').toLowerCase() !== pid) return
      const lx = parseInt(String(e.coordX).trim(), 10)
      const ly = parseInt(String(e.coordY).trim(), 10)
      if (!Number.isFinite(lx) || !Number.isFinite(ly)) return
      const gx = lx + halfW
      const gy = halfH - ly
      const key = `${gx},${gy}`
      const fullText = e.detail || ''
      let segStrings = fullText.match(/[^.!?]+[.!?]*/g) || [fullText]
      segStrings = segStrings.map((sg) => sg.trim()).filter((sg) => sg.length > 0)
      const tags = Array.isArray(e.tags) ? e.tags : []
      const entryDifficulty = e.consensusDifficulty ?? e.difficulty ?? null
      const fromUser = {
        title: e.subject || 'Submission',
        content: fullText,
        shortSummary: (e.summary || '').trim() || fullText.slice(0, 400),
        segments: buildSortedSegments(segStrings, entryDifficulty),
        attachments: Array.isArray(e.attachments) ? e.attachments : [],
        tags,
        difficulty: e.difficulty,
        consensusDifficulty: e.consensusDifficulty,
        alternatePerspectives: Array.isArray(e.alternatePerspectives) ? e.alternatePerspectives : [],
      }
      const prev = m[key]
      const mergedSegStrings = fromUser.segments?.length
        ? segmentsToStrings(fromUser.segments)
        : segmentsToStrings(prev?.segments)
      const mergedEntryDiff =
        fromUser.consensusDifficulty ??
        fromUser.difficulty ??
        prev?.consensusDifficulty ??
        prev?.difficulty ??
        null
      const mergedSegments = mergedSegStrings.length
        ? buildSortedSegments(mergedSegStrings, mergedEntryDiff)
        : []
      m[key] = prev
        ? {
            ...prev,
            title: fromUser.title || prev.title,
            shortSummary: fromUser.shortSummary || prev.shortSummary,
            content: fromUser.content || prev.content,
            segments: mergedSegments.length ? mergedSegments : prev.segments,
            attachments: [...(prev.attachments || []), ...(fromUser.attachments || [])],
            tags: [...new Set([...(prev.tags || []), ...tags])],
            difficulty: fromUser.difficulty ?? prev.difficulty,
            consensusDifficulty: fromUser.consensusDifficulty ?? prev.consensusDifficulty,
            alternatePerspectives: [
              ...(prev.alternatePerspectives || []),
              ...(fromUser.alternatePerspectives || []),
            ],
          }
        : fromUser
    })
  } catch {
    /* ignore */
  }
  for (const key of Object.keys(m)) {
    const entry = m[key]
    if (!entry?.segments?.length) continue
    const ed = entry.consensusDifficulty ?? entry.difficulty ?? null
    m[key] = { ...entry, segments: normalizeSegmentsEasiestFirst(entry.segments, ed) }
  }
  return m
}
