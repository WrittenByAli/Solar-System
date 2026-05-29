/**
 * L1 archive front copy — aligned with hubTaxonomyRaw disciplines (Client 4:4:4).
 * Used by ArchiveGrid, MapView, and archiveInstanceStorage subtitles.
 */
export const HUB_DISCIPLINE_COPY = {
  sun: {
    domain: 'Physics',
    shortDomain: 'Physics',
    intro:
      'The Sun hub is the Physics archive of SOLAR — covering classical mechanics, thermodynamics, electromagnetism, optics, quantum mechanics, relativity, and particle physics from first principles through advanced research.',
  },
  mercury: {
    domain: 'Mathematics',
    shortDomain: 'Mathematics',
    intro:
      'The Mercury hub archives Mathematics — arithmetic, algebra, geometry, analysis, statistics, and applied mathematical methods that underpin every other scientific domain in SOLAR.',
  },
  venus: {
    domain: 'Psychology & Neuroscience',
    shortDomain: 'Psychology',
    intro:
      'The Venus hub covers Psychology & Neuroscience — cognition, behavior, neural systems, development, and the science of mind and brain across experimental and clinical research.',
  },
  earth: {
    domain: 'Earth & Environmental Science',
    shortDomain: 'Earth Science',
    intro:
      'The Earth hub documents Earth & Environmental Science — geology, climate, ecosystems, natural resources, and planetary systems research tied to environmental stewardship.',
  },
  mars: {
    domain: 'Applied Technology',
    shortDomain: 'Technology',
    intro:
      'The Mars hub focuses on Applied Technology — engineering systems, materials, robotics, infrastructure, and technology designed for real-world deployment and extreme environments.',
  },
  jupiter: {
    domain: 'Social Science',
    shortDomain: 'Social Science',
    intro:
      'The Jupiter hub archives Social Science — economics, sociology, political science, anthropology, and how societies organize knowledge, resources, and collective decision-making.',
  },
  saturn: {
    domain: 'Astronomy & Cosmology',
    shortDomain: 'Astronomy',
    intro:
      'The Saturn hub maps Astronomy & Cosmology — stars, galaxies, observational methods, planetary science, and our place in the universe from the solar neighborhood to deep space.',
  },
  uranus: {
    domain: 'Chemistry',
    shortDomain: 'Chemistry',
    intro:
      'The Uranus hub holds Chemistry — atomic structure, chemical bonding, reactions, biochemistry, and materials science at the molecular level.',
  },
  neptune: {
    domain: 'Biology',
    shortDomain: 'Biology',
    intro:
      'The Neptune hub covers Biology — cells, genetics, evolution, ecology, and organismal biology from molecular life through ecosystems and biodiversity.',
  },
  star: {
    domain: 'Foundation · North Star',
    shortDomain: 'North Star',
    intro:
      'North Star is the Foundation’s dedicated archive: institutional memoranda, canon, governance records, and stewardship documents that apply across every hub.',
  },
}

export function getHubDisciplineCopy(hubId) {
  return HUB_DISCIPLINE_COPY[String(hubId || '').toLowerCase()] || null
}
