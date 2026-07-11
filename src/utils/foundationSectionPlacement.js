import { hasHubCompassTaxonomy } from './hubTaxonomyRegistry.js'
import { SUBJECT_STRIDE_X, SUBJECT_STRIDE_Y } from './archiveLayerSpecs.js'

export function placeSectionOnGrid(section, index, halfW, halfH) {
  if (hasHubCompassTaxonomy(section._planetId)) {
    const lx = parseInt(String(section.coordX ?? '').trim(), 10)
    const ly = parseInt(String(section.coordY ?? '').trim(), 10)
    if (Number.isFinite(lx) && Number.isFinite(ly)) {
      return { gx: lx + halfW, gy: halfH - ly }
    }
  }
  // Non-taxonomy fallback: keep sections on the same 28×13 subject lattice.
  const lx = (index % 3) * SUBJECT_STRIDE_X
  return { gx: lx + halfW, gy: Math.floor(index / 3) * SUBJECT_STRIDE_Y + halfH }
}
