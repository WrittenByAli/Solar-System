/** Foundation (North Star) archive — 4:4:4 taxonomy applies to hub `star` only. */
export const FOUNDATION_TAXONOMY_HUB_ID = 'star'

export const FOUNDATION_DOMAINS = [
  { id: 'community',  label: 'Community',  quadrant: 'top-left',     color: '#34d399' },
  { id: 'research',   label: 'Research',   quadrant: 'top-right',    color: '#60a5fa' },
  { id: 'records',    label: 'Records',    quadrant: 'bottom-left',  color: '#a78bfa' },
  { id: 'operations', label: 'Operations', quadrant: 'bottom-right', color: '#f97316' },
]

export const FOUNDATION_SUBFIELDS = [
  { id: 'education-training',     domainId: 'community',  label: 'Education & Training',       row: 1, col: 1, l2Slot: 'inner-top',    l3Slot: 'tl' },
  { id: 'outreach-events',        domainId: 'community',  label: 'Outreach & Events',           row: 1, col: 2, l2Slot: 'inner-bottom', l3Slot: 'tr' },
  { id: 'partnerships-networks',  domainId: 'community',  label: 'Partnerships & Networks',     row: 2, col: 1, l2Slot: 'outer-top',    l3Slot: 'bl' },
  { id: 'people',                 domainId: 'community',  label: 'People',                      row: 2, col: 2, l2Slot: 'outer-bottom', l3Slot: 'br' },
  { id: 'energy-systems',         domainId: 'research',   label: 'Energy Systems',              row: 1, col: 3, l2Slot: 'outer-top',    l3Slot: 'tl' },
  { id: 'water-food-systems',     domainId: 'research',   label: 'Water & Food Systems',        row: 1, col: 4, l2Slot: 'outer-bottom', l3Slot: 'tr' },
  { id: 'ecology-regeneration',   domainId: 'research',   label: 'Ecology & Regeneration',      row: 2, col: 3, l2Slot: 'inner-top',    l3Slot: 'bl' },
  { id: 'human-systems-autonomy', domainId: 'research',   label: 'Human Systems & Autonomy',    row: 2, col: 4, l2Slot: 'inner-bottom', l3Slot: 'br' },
  { id: 'foundation-documents',   domainId: 'records',    label: 'Foundation Documents',        row: 3, col: 1, l2Slot: 'inner-top',    l3Slot: 'tl' },
  { id: 'publications',           domainId: 'records',    label: 'Publications',                row: 3, col: 2, l2Slot: 'inner-bottom', l3Slot: 'tr' },
  { id: 'media-collections',      domainId: 'records',    label: 'Media Collections',           row: 4, col: 1, l2Slot: 'outer-top',    l3Slot: 'bl' },
  { id: 'case-studies',           domainId: 'records',    label: 'Case Studies',                row: 4, col: 2, l2Slot: 'outer-bottom', l3Slot: 'br' },
  { id: 'infrastructure',         domainId: 'operations', label: 'Infrastructure',              row: 3, col: 3, l2Slot: 'outer-top',    l3Slot: 'tl' },
  { id: 'project-management',     domainId: 'operations', label: 'Project Management',          row: 3, col: 4, l2Slot: 'outer-bottom', l3Slot: 'tr' },
  { id: 'governance-compliance',  domainId: 'operations', label: 'Governance & Compliance',     row: 4, col: 3, l2Slot: 'inner-top',    l3Slot: 'bl' },
  { id: 'finance-administration', domainId: 'operations', label: 'Finance & Administration',    row: 4, col: 4, l2Slot: 'inner-bottom', l3Slot: 'br' },
]

export const FOUNDATION_LEAVES = [
  { subfieldId: 'education-training',     title: 'Courses',                        lx: -3, ly: 3,  corner: 'tl' },
  { subfieldId: 'education-training',     title: 'Workshops',                      lx: -2, ly: 3,  corner: 'tr' },
  { subfieldId: 'education-training',     title: 'Learning materials',             lx: -3, ly: 2,  corner: 'bl' },
  { subfieldId: 'education-training',     title: 'Certifications',                 lx: -2, ly: 2,  corner: 'br' },
  { subfieldId: 'outreach-events',        title: 'Public programs',                lx: -1, ly: 3,  corner: 'tl' },
  { subfieldId: 'outreach-events',        title: 'Exhibitions',                    lx:  0, ly: 3,  corner: 'tr' },
  { subfieldId: 'outreach-events',        title: 'Conferences',                    lx: -1, ly: 2,  corner: 'bl' },
  { subfieldId: 'outreach-events',        title: 'Campaigns',                      lx:  0, ly: 2,  corner: 'br' },
  { subfieldId: 'partnerships-networks',  title: 'Academic partners',              lx: -3, ly: 1,  corner: 'tl' },
  { subfieldId: 'partnerships-networks',  title: 'NGOs',                           lx: -2, ly: 1,  corner: 'tr' },
  { subfieldId: 'partnerships-networks',  title: 'Government relations',           lx: -3, ly: 0,  corner: 'bl' },
  { subfieldId: 'partnerships-networks',  title: 'Industry collaborations',        lx: -2, ly: 0,  corner: 'br' },
  { subfieldId: 'people',                 title: 'Researchers',                    lx: -1, ly: 1,  corner: 'tl' },
  { subfieldId: 'people',                 title: 'Students',                       lx:  0, ly: 1,  corner: 'tr' },
  { subfieldId: 'people',                 title: 'Contributors',                   lx: -1, ly: 0,  corner: 'bl' },
  { subfieldId: 'people',                 title: 'Residents',                      lx:  0, ly: 0,  corner: 'br' },
  { subfieldId: 'energy-systems',         title: 'Generation',                     lx:  1, ly: 3,  corner: 'tl' },
  { subfieldId: 'energy-systems',         title: 'Storage',                        lx:  2, ly: 3,  corner: 'tr' },
  { subfieldId: 'energy-systems',         title: 'Distribution',                   lx:  1, ly: 2,  corner: 'bl' },
  { subfieldId: 'energy-systems',         title: 'Monitoring',                     lx:  2, ly: 2,  corner: 'br' },
  { subfieldId: 'water-food-systems',     title: 'Water collection & treatment',   lx:  3, ly: 3,  corner: 'tl' },
  { subfieldId: 'water-food-systems',     title: 'Agriculture & aquaculture',      lx:  4, ly: 3,  corner: 'tr' },
  { subfieldId: 'water-food-systems',     title: 'Food preservation & preparation',lx:  3, ly: 2,  corner: 'bl' },
  { subfieldId: 'water-food-systems',     title: 'Nutrition & food security',      lx:  4, ly: 2,  corner: 'br' },
  { subfieldId: 'ecology-regeneration',   title: 'Biodiversity',                   lx:  1, ly: 1,  corner: 'tl' },
  { subfieldId: 'ecology-regeneration',   title: 'Soil health',                    lx:  2, ly: 1,  corner: 'tr' },
  { subfieldId: 'ecology-regeneration',   title: 'Ecosystem monitoring',           lx:  1, ly: 0,  corner: 'bl' },
  { subfieldId: 'ecology-regeneration',   title: 'Reforestation',                  lx:  2, ly: 0,  corner: 'br' },
  { subfieldId: 'human-systems-autonomy', title: 'Health',                         lx:  3, ly: 1,  corner: 'tl' },
  { subfieldId: 'human-systems-autonomy', title: 'Education',                      lx:  4, ly: 1,  corner: 'tr' },
  { subfieldId: 'human-systems-autonomy', title: 'Social organization',            lx:  3, ly: 0,  corner: 'bl' },
  { subfieldId: 'human-systems-autonomy', title: 'Resource management',            lx:  4, ly: 0,  corner: 'br' },
  { subfieldId: 'foundation-documents',   title: 'Plans',                          lx: -3, ly: -1, corner: 'tl' },
  { subfieldId: 'foundation-documents',   title: 'Milestones',                     lx: -2, ly: -1, corner: 'tr' },
  { subfieldId: 'foundation-documents',   title: 'Origins',                        lx: -3, ly: -2, corner: 'bl' },
  { subfieldId: 'foundation-documents',   title: 'Timelines',                      lx: -2, ly: -2, corner: 'br' },
  { subfieldId: 'publications',           title: 'Reports',                        lx: -1, ly: -1, corner: 'tl' },
  { subfieldId: 'publications',           title: 'Research papers',                lx:  0, ly: -1, corner: 'tr' },
  { subfieldId: 'publications',           title: 'Press releases',                 lx: -1, ly: -2, corner: 'bl' },
  { subfieldId: 'publications',           title: 'Newsletters',                    lx:  0, ly: -2, corner: 'br' },
  { subfieldId: 'media-collections',      title: 'Photographs',                    lx: -3, ly: -3, corner: 'tl' },
  { subfieldId: 'media-collections',      title: 'Videos',                         lx: -2, ly: -3, corner: 'tr' },
  { subfieldId: 'media-collections',      title: 'Audio',                          lx: -3, ly: -4, corner: 'bl' },
  { subfieldId: 'media-collections',      title: 'Illustrations & .STL files',     lx: -2, ly: -4, corner: 'br' },
  { subfieldId: 'case-studies',           title: 'Successes',                      lx: -1, ly: -3, corner: 'tl' },
  { subfieldId: 'case-studies',           title: 'Failures',                       lx:  0, ly: -3, corner: 'tr' },
  { subfieldId: 'case-studies',           title: 'Innovations',                    lx: -1, ly: -4, corner: 'bl' },
  { subfieldId: 'case-studies',           title: 'Replication guide',              lx:  0, ly: -4, corner: 'br' },
  { subfieldId: 'infrastructure',         title: 'Buildings',                      lx:  1, ly: -1, corner: 'tl' },
  { subfieldId: 'infrastructure',         title: 'Utilities',                      lx:  2, ly: -1, corner: 'tr' },
  { subfieldId: 'infrastructure',         title: 'Transportation',                 lx:  1, ly: -2, corner: 'bl' },
  { subfieldId: 'infrastructure',         title: 'Communications',                 lx:  2, ly: -2, corner: 'br' },
  { subfieldId: 'project-management',     title: 'Planning',                       lx:  3, ly: -1, corner: 'tl' },
  { subfieldId: 'project-management',     title: 'Evaluation',                     lx:  4, ly: -1, corner: 'tr' },
  { subfieldId: 'project-management',     title: 'Execution',                      lx:  3, ly: -2, corner: 'bl' },
  { subfieldId: 'project-management',     title: 'Reporting',                      lx:  4, ly: -2, corner: 'br' },
  { subfieldId: 'governance-compliance',  title: 'Policies',                       lx:  1, ly: -3, corner: 'tl' },
  { subfieldId: 'governance-compliance',  title: 'Legal affairs',                  lx:  2, ly: -3, corner: 'tr' },
  { subfieldId: 'governance-compliance',  title: 'Risk management',                lx:  1, ly: -4, corner: 'bl' },
  { subfieldId: 'governance-compliance',  title: 'Audits',                         lx:  2, ly: -4, corner: 'br' },
  { subfieldId: 'finance-administration', title: 'Budgeting',                      lx:  3, ly: -3, corner: 'tl' },
  { subfieldId: 'finance-administration', title: 'Accounting',                     lx:  4, ly: -3, corner: 'tr' },
  { subfieldId: 'finance-administration', title: 'Procurement',                    lx:  3, ly: -4, corner: 'bl' },
  { subfieldId: 'finance-administration', title: 'Human resources',                lx:  4, ly: -4, corner: 'br' },
]

export function isFoundationTaxonomyHub(planetId) {
  return String(planetId || '').toLowerCase() === FOUNDATION_TAXONOMY_HUB_ID
}

export function displayToGrid(lx, ly, halfW, halfH) {
  return { gx: lx + halfW, gy: halfH - ly }
}

export function leavesForSubfield(subfieldId) {
  return FOUNDATION_LEAVES.filter((l) => l.subfieldId === subfieldId)
}

export function subfieldsForDomain(domainId) {
  return FOUNDATION_SUBFIELDS.filter((s) => s.domainId === domainId)
}

export function getSubfield(id) {
  return FOUNDATION_SUBFIELDS.find((s) => s.id === id) || null
}

export function subfieldCenterLxLy(subfield) {
  const leaves = leavesForSubfield(subfield.id)
  if (!leaves.length) return { lx: 0, ly: 0 }
  const lx = Math.round(leaves.reduce((s, l) => s + l.lx, 0) / leaves.length)
  const ly = Math.round(leaves.reduce((s, l) => s + l.ly, 0) / leaves.length)
  return { lx, ly }
}

const L3_SLOT_ORDER = ['tl', 'tr', 'bl', 'br']
export function leavesForSubfieldGrid(subfieldId) {
  const leaves = leavesForSubfield(subfieldId)
  if (leaves.length < 4) return leaves
  const byCorner = Object.fromEntries(leaves.filter((l) => l.corner).map((l) => [l.corner, l]))
  if (L3_SLOT_ORDER.every((c) => byCorner[c])) return L3_SLOT_ORDER.map((c) => byCorner[c])
  const lxVals = leaves.map((l) => l.lx), lyVals = leaves.map((l) => l.ly)
  const midLx = (Math.max(...lxVals) + Math.min(...lxVals)) / 2
  const midLy = (Math.max(...lyVals) + Math.min(...lyVals)) / 2
  const cornerOf = (l) => {
    const top = l.ly >= midLy, left = l.lx <= midLx
    if (top && left)  return 'tl'
    if (top && !left) return 'tr'
    if (!top && left) return 'bl'
    return 'br'
  }
  const inferred = Object.fromEntries(leaves.map((l) => [cornerOf(l), l]))
  return L3_SLOT_ORDER.map((c) => inferred[c]).filter(Boolean)
}

export function buildFoundationResearchSections() {
  const domainById = Object.fromEntries(FOUNDATION_DOMAINS.map((d) => [d.id, d]))
  const subById    = Object.fromEntries(FOUNDATION_SUBFIELDS.map((s) => [s.id, s]))
  return FOUNDATION_LEAVES.map((leaf) => {
    const sub = subById[leaf.subfieldId]
    const dom = domainById[sub?.domainId]
    return {
      title:        leaf.title,
      coordX:       String(leaf.lx),
      coordY:       String(leaf.ly),
      shortSummary: `${dom?.label || 'Foundation'} - ${sub?.label || 'Archive'} - ${leaf.title}.`,
      tags:         ['foundation', dom?.id, sub?.id].filter(Boolean),
      foundationMeta: { domainId: dom?.id, domainLabel: dom?.label, subfieldId: sub?.id, subfieldLabel: sub?.label },
    }
  })
}

export function buildFoundationStaticLayerMap(halfW = 1920, halfH = 1080) {
  const l2Tiles = FOUNDATION_SUBFIELDS.map((sf) => {
    const { lx, ly } = subfieldCenterLxLy(sf)
    const { gx, gy } = displayToGrid(lx, ly, halfW, halfH)
    return { row: sf.row, col: sf.col, title: sf.label, subtitle: FOUNDATION_DOMAINS.find((d) => d.id === sf.domainId)?.label, centerGx: gx, centerGy: gy, drillLayer: 3, subfieldId: sf.id }
  })
  const positions = [{ row:1,col:1 },{ row:1,col:2 },{ row:2,col:1 },{ row:2,col:2 }]
  const l3TilesBySubfield = {}
  for (const sf of FOUNDATION_SUBFIELDS) {
    l3TilesBySubfield[sf.id] = leavesForSubfield(sf.id).map((leaf, i) => {
      const { gx, gy } = displayToGrid(leaf.lx, leaf.ly, halfW, halfH)
      const pos = positions[i] || positions[0]
      return { row: pos.row, col: pos.col, title: leaf.title, centerGx: gx, centerGy: gy, drillLayer: 4 }
    })
  }
  return { version: 1, scope: FOUNDATION_TAXONOMY_HUB_ID, planets: { star: { 2: { tiles: l2Tiles }, 3: { tilesBySubfield: l3TilesBySubfield } } } }
}
