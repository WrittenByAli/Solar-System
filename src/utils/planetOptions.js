import { supabase } from './supabaseClient.js'

/**
 * Accent color per hub — presentational only, not stored in the `planets`
 * table (which holds identity/taxonomy data, not UI theming). Keyed by the
 * same id as planets.id / hubs.id.
 */
export const PLANET_COLORS = {
    sun: '#ff6b35',
    mercury: '#9ca3af',
    venus: '#fbbf24',
    earth: '#34d399',
    mars: '#f87171',
    jupiter: '#fb923c',
    saturn: '#fde68a',
    uranus: '#67e8f9',
    neptune: '#818cf8',
    star: '#f5a623',
}

const FALLBACK_COLOR = '#4fc3f7'

/**
 * Live planet/hub options for the /submit dropdown, replacing the prior
 * hardcoded array built from researchData.json. Falls back to that same
 * static list if the query fails, so the form never hard-blocks on a
 * transient network error.
 */
export async function fetchPlanetOptions(fallbackPlanets) {
    const { data, error } = await supabase
        .from('planets')
        .select('id, name, description')
        .order('id')

    if (error || !Array.isArray(data) || data.length === 0) {
        return (fallbackPlanets || []).map((p) => ({
            id: p.id,
            label: p.planet,
            domain: p.domain,
            color: p.color || PLANET_COLORS[p.id] || FALLBACK_COLOR,
        }))
    }

    return data.map((row) => ({
        id: row.id,
        label: row.name,
        domain: row.description,
        color: PLANET_COLORS[row.id] || FALLBACK_COLOR,
    }))
}
