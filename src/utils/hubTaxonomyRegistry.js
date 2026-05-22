import { HUB_TAXONOMY_RAW } from '../data/hubTaxonomyRaw.js'
import {
  FOUNDATION_DOMAINS, FOUNDATION_SUBFIELDS, FOUNDATION_LEAVES, FOUNDATION_TAXONOMY_HUB_ID,
} from '../constants/foundationTaxonomy.js'
import {
  compileHubTaxonomy, buildHubResearchSections, buildHubStaticLayerMap,
} from './compileHubTaxonomy.js'

function compileFoundationAsHub() {
  const raw = {
    discipline:  'Foundation - North Star',
    centerLabel: 'SOLAR',
    accentColor: '#f5a623',
    domains: FOUNDATION_DOMAINS.map((d) => ({
      label: d.label, color: d.color,
      subfields: FOUNDATION_SUBFIELDS.filter((s) => s.domainId === d.id).map((sf) => ({
        label:  sf.label,
        topics: FOUNDATION_LEAVES.filter((l) => l.subfieldId === sf.id).map((l) => l.title),
      })),
    })),
  }
  const compiled = compileHubTaxonomy(FOUNDATION_TAXONOMY_HUB_ID, raw)
  if (!compiled) return null
  compiled.leaves = FOUNDATION_LEAVES.map((l) => ({ ...l }))
  return compiled
}

const COMPILED = new Map()

function loadAll() {
  if (COMPILED.size) return
  const star = compileFoundationAsHub()
  if (star) COMPILED.set(FOUNDATION_TAXONOMY_HUB_ID, star)
  for (const [hubId, raw] of Object.entries(HUB_TAXONOMY_RAW)) {
    const t = compileHubTaxonomy(hubId, raw)
    if (t) COMPILED.set(hubId, t)
  }
}

export function getHubTaxonomy(hubId) {
  loadAll()
  return COMPILED.get(String(hubId || '').toLowerCase()) || null
}

export function hasHubCompassTaxonomy(hubId) {
  return !!getHubTaxonomy(hubId)
}

export function getHubResearchSections(hubId) {
  const t = getHubTaxonomy(hubId)
  return t ? buildHubResearchSections(t) : null
}

export function mergeStaticLayerMapForHub(hubId, halfW, halfH) {
  const t = getHubTaxonomy(hubId)
  if (!t) return
  const block = buildHubStaticLayerMap(t, halfW, halfH)
  if (!block) return
  const prev    = typeof window !== 'undefined' ? window.SOLAR_STATIC_LAYER_MAP : null
  const planets = { ...(prev?.planets || {}), ...block.planets }
  if (typeof window !== 'undefined') {
    window.SOLAR_STATIC_LAYER_MAP = { version: 1, planets }
  }
}

export { buildHubResearchSections, buildHubStaticLayerMap }
