import { hasHubCompassTaxonomy } from './hubTaxonomyRegistry.js'

export function placeSectionOnGrid(section, index, halfW, halfH) {
  if (hasHubCompassTaxonomy(section._planetId)) {
    const lx = parseInt(String(section.coordX ?? '').trim(), 10)
    const ly = parseInt(String(section.coordY ?? '').trim(), 10)
    if (Number.isFinite(lx) && Number.isFinite(ly)) {
      return { gx: lx + halfW, gy: halfH - ly }
    }
  }
  const lx = index % 3
  return { gx: lx + halfW, gy: Math.floor(index / 3) + halfH }
}
