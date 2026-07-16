/**
 * L1 archive front copy — aligned with hubTaxonomyRaw disciplines (Client 4:4:4).
 * Used by ArchiveGrid and MapView for the long-form `intro` paragraph only —
 * `domain`/`shortDomain` moved to the DB-sourced `hubRegistry.js` (getHub().description).
 */
export const HUB_DISCIPLINE_COPY = {
  sun: {
    intro:
      'The Sun hub is the Physics archive of SOLAR — covering classical mechanics, thermodynamics, electromagnetism, optics, quantum mechanics, relativity, and particle physics from first principles through advanced research.',
  },
  mercury: {
    intro:
      'The Mercury hub archives Mathematics — arithmetic, algebra, geometry, analysis, statistics, and applied mathematical methods that underpin every other scientific domain in SOLAR.',
  },
  venus: {
    intro:
      'The Venus hub covers Psychology & Neuroscience — cognition, behavior, neural systems, development, and the science of mind and brain across experimental and clinical research.',
  },
  earth: {
    intro:
      'The Earth hub documents Earth & Environmental Science — geology, climate, ecosystems, natural resources, and planetary systems research tied to environmental stewardship.',
  },
  mars: {
    intro:
      'The Mars hub focuses on Applied Technology — engineering systems, materials, robotics, infrastructure, and technology designed for real-world deployment and extreme environments.',
  },
  jupiter: {
    intro:
      'The Jupiter hub archives Social Science — economics, sociology, political science, anthropology, and how societies organize knowledge, resources, and collective decision-making.',
  },
  saturn: {
    intro:
      'The Saturn hub maps Astronomy & Cosmology — stars, galaxies, observational methods, planetary science, and our place in the universe from the solar neighborhood to deep space.',
  },
  uranus: {
    intro:
      'The Uranus hub holds Chemistry — atomic structure, chemical bonding, reactions, biochemistry, and materials science at the molecular level.',
  },
  neptune: {
    intro:
      'The Neptune hub covers Biology — cells, genetics, evolution, ecology, and organismal biology from molecular life through ecosystems and biodiversity.',
  },
  star: {
    intro:
      'North Star is the Foundation’s dedicated archive: institutional memoranda, canon, governance records, and stewardship documents that apply across every hub.',
  },
}

export function getHubDisciplineCopy(hubId) {
  return HUB_DISCIPLINE_COPY[String(hubId || '').toLowerCase()] || null
}
