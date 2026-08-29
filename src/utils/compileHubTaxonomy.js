/** Compile compact hub taxonomy -> domains, subfields, leaves, sections, static map */

import { SUBJECT_STRIDE_X, SUBJECT_STRIDE_Y } from './archiveLayerSpecs.js'
import { buildTaxonomyDepthSeed } from '../data/archiveDepthSeeds.js'

const QUADRANTS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const DOMAIN_COLORS = ['#34d399', '#60a5fa', '#a78bfa', '#f97316']
const L3_SLOTS = ['tl', 'tr', 'bl', 'br']
const L2_FROM_L3 = { tl: 'inner-top', tr: 'inner-bottom', bl: 'outer-top', br: 'outer-bottom' }
const CORNER_OFFSET = { tl: [-1, 1], tr: [0, 1], bl: [-1, 0], br: [0, 0] }
const DOMAIN_LX_LY = {
  'top-left':     { baseLx: -3, baseLy: 2,  span: 2 },
  'top-right':    { baseLx: 1,  baseLy: 2,  span: 2 },
  'bottom-left':  { baseLx: -3, baseLy: -2, span: 2 },
  'bottom-right': { baseLx: 1,  baseLy: -2, span: 2 },
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
}

export function compileHubTaxonomy(hubId, raw) {
  if (!raw?.domains?.length) return null
  const domains = raw.domains.slice(0, 4).map((d, di) => {
    const quadrant = QUADRANTS[di]
    const color    = d.color || DOMAIN_COLORS[di]
    const domainId = slug(d.label || `domain-${di}`)
    const subfields = (d.subfields || []).slice(0, 4).map((sf, si) => {
      const l3Slot = L3_SLOTS[si]
      const l2Slot = L2_FROM_L3[l3Slot]
      const sfId   = slug(sf.label || `sf-${si}`)
      return {
        id: sfId, domainId, label: sf.label, l2Slot, l3Slot,
        row: di < 2 ? (si < 2 ? 1 : 2) : si < 2 ? 3 : 4,
        col: di % 2 === 0 ? (si % 2 === 0 ? 1 : 2) : si % 2 === 0 ? 3 : 4,
        topics: (sf.topics || []).slice(0, 4),
      }
    })
    return { id: domainId, label: d.label, quadrant, color, subfields }
  })

  const subfields = domains.flatMap((d) => d.subfields.map((sf) => ({ ...sf, domainId: d.id })))

  const leaves = []
  for (const dom of domains) {
    const { baseLx, baseLy, span } = DOMAIN_LX_LY[dom.quadrant]
    for (const sf of dom.subfields) {
      const si   = L3_SLOTS.indexOf(sf.l3Slot)
      const sflx = baseLx + (si % 2) * (span > 1 ? 1 : 0)
      const sfly = baseLy + (si < 2 ? 1 : 0)
      sf.topics.forEach((title, ti) => {
        const corner = L3_SLOTS[ti]
        const [ox, oy] = CORNER_OFFSET[corner]
        // Subject-lattice stride: neighbouring topics sit 28/13 cells apart on
        // L4, leaving a 27×12 apron of empty submittable cells around each.
        leaves.push({
          subfieldId: sf.id,
          title,
          lx: (sflx + ox) * SUBJECT_STRIDE_X,
          ly: (sfly + oy) * SUBJECT_STRIDE_Y,
          corner,
        })
      })
    }
  }

  return {
    hubId,
    centerLabel: raw.centerLabel || hubId.toUpperCase(),
    discipline:  raw.discipline  || '',
    accentColor: raw.accentColor || '#f5a623',
    domains,
    subfields,
    leaves,
  }
}

export function subfieldsForDomain(taxonomy, domainId) {
  return taxonomy?.subfields?.filter((s) => s.domainId === domainId) || []
}

export function leavesForSubfieldGrid(taxonomy, subfieldId) {
  const leaves = taxonomy?.leaves?.filter((l) => l.subfieldId === subfieldId) || []
  const order  = ['tl', 'tr', 'bl', 'br']
  const by     = Object.fromEntries(leaves.map((l) => [l.corner, l]))
  const ordered = order.map((c) => by[c]).filter(Boolean)
  return ordered.length === 4 ? ordered : leaves.slice(0, 4)
}

export function displayToGrid(lx, ly, halfW, halfH) {
  return { gx: lx + halfW, gy: halfH - ly }
}

export function buildHubResearchSections(taxonomy) {
  if (!taxonomy) return []
  const domById = Object.fromEntries(taxonomy.domains.map((d) => [d.id, d]))
  const subById = Object.fromEntries(taxonomy.subfields.map((s) => [s.id, s]))
  return taxonomy.leaves.map((leaf) => {
    const sub = subById[leaf.subfieldId]
    const dom = domById[sub?.domainId]
    const seed = buildTaxonomyDepthSeed({
      hubId: taxonomy.hubId,
      discipline: taxonomy.discipline,
      domain: dom?.label,
      subfield: sub?.label,
      title: leaf.title,
    })
    return {
      title:        leaf.title,
      coordX:       String(leaf.lx),
      coordY:       String(leaf.ly),
      shortSummary: `${taxonomy.discipline} · ${dom?.label} · ${sub?.label} — ${leaf.title}.`,
      content: seed.detail,
      detailedSummary: seed.detail,
      deepSections: seed.deepSections,
      advancedSections: seed.advancedSections,
      tags:         [taxonomy.hubId, dom?.id, sub?.id].filter(Boolean),
      foundationMeta: {
        domainId:      dom?.id,
        domainLabel:   dom?.label,
        subfieldId:    sub?.id,
        subfieldLabel: sub?.label,
      },
    }
  })
}

export function buildHubStaticLayerMap(taxonomy, halfW = 1920, halfH = 1080) {
  if (!taxonomy) return null
  const l2Tiles = taxonomy.subfields.map((sf) => {
    const leaves = taxonomy.leaves.filter((l) => l.subfieldId === sf.id)
    const lx = leaves.reduce((s, l) => s + l.lx, 0) / (leaves.length || 1)
    const ly = leaves.reduce((s, l) => s + l.ly, 0) / (leaves.length || 1)
    const { gx, gy } = displayToGrid(Math.round(lx), Math.round(ly), halfW, halfH)
    const dom = taxonomy.domains.find((d) => d.id === sf.domainId)
    return { row: sf.row, col: sf.col, title: sf.label, subtitle: dom?.label, centerGx: gx, centerGy: gy, drillLayer: 3, subfieldId: sf.id }
  })
  const l3TilesBySubfield = {}
  for (const sf of taxonomy.subfields) {
    l3TilesBySubfield[sf.id] = leavesForSubfieldGrid(taxonomy, sf.id).map((leaf, i) => {
      const { gx, gy } = displayToGrid(leaf.lx, leaf.ly, halfW, halfH)
      return { row: i < 2 ? 1 : 2, col: i % 2 === 0 ? 1 : 2, title: leaf.title, centerGx: gx, centerGy: gy, drillLayer: 4 }
    })
  }
  return {
    version: 1, scope: taxonomy.hubId,
    planets: { [taxonomy.hubId]: { 2: { tiles: l2Tiles }, 3: { tilesBySubfield: l3TilesBySubfield } } },
  }
}
