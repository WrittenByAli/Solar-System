const DISCIPLINE_PROFILES = {
  physics: {
    methods: 'measurement, controlled experiment, mathematical modeling, simulation, dimensional analysis, and comparison between prediction and observation',
    evidence: 'reported units, uncertainty ranges, calibration details, repeatable procedures, boundary conditions, and agreement or disagreement with established physical models',
  },
  mathematics: {
    methods: 'precise definitions, worked examples, formal proof, counterexample, symbolic derivation, computation, and comparison between alternative solution strategies',
    evidence: 'explicit assumptions, logically valid steps, reproducible calculations, edge-case analysis, and a clear distinction between theorem, conjecture, approximation, and numerical evidence',
  },
  'psychology & neuroscience': {
    methods: 'behavioral experiment, psychometrics, longitudinal observation, clinical assessment, neuroimaging, electrophysiology, and computational modeling',
    evidence: 'well-defined populations, validated measures, effect sizes, uncertainty, replication, ethical safeguards, and care when moving from correlation to causal or clinical claims',
  },
  'earth & environmental science': {
    methods: 'field observation, sampling, remote sensing, laboratory analysis, geospatial mapping, historical reconstruction, and coupled-system modeling',
    evidence: 'documented location and time, sampling design, instrument calibration, uncertainty, scale dependence, long-term records, and convergence across independent environmental indicators',
  },
  'applied technology': {
    methods: 'requirements analysis, prototyping, systems engineering, simulation, verification testing, field trials, reliability analysis, and lifecycle assessment',
    evidence: 'traceable requirements, measurable performance, failure modes, safety margins, maintainability, resource cost, user impact, and results reproduced under realistic operating conditions',
  },
  'social science': {
    methods: 'comparative research, survey design, interviews, ethnography, archival study, statistical analysis, and historical or institutional interpretation',
    evidence: 'transparent sampling, reliable measures, source provenance, social and historical context, uncertainty, competing explanations, and a clear boundary between description, association, and causation',
  },
  'astronomy & cosmology': {
    methods: 'telescopic observation, spectroscopy, photometry, astrometry, detector calibration, numerical simulation, and inference from physical models',
    evidence: 'instrument characteristics, observing conditions, signal processing, uncertainty, selection effects, independent observations, and consistency between measured signals and model predictions',
  },
  chemistry: {
    methods: 'controlled synthesis, quantitative analysis, spectroscopy, chromatography, electrochemistry, microscopy, and molecular or thermodynamic modeling',
    evidence: 'composition, purity, conditions, stoichiometry, calibrated measurements, uncertainty, reproducibility, and source-backed physical or chemical properties',
  },
  biology: {
    methods: 'observation, controlled experiment, microscopy, molecular assay, field sampling, comparative analysis, sequencing, and population or systems modeling',
    evidence: 'defined organisms or samples, controls, replication, effect size, biological variation, ethical handling, and agreement across molecular, organismal, and ecological scales',
  },
}

const DEFAULT_PROFILE = {
  methods: 'careful definition, primary-source review, comparative analysis, transparent documentation, and reproducible evaluation',
  evidence: 'clear provenance, explicit assumptions, corroborating records, uncertainty, limitations, and a distinction between established findings and interpretation',
}

function sentence(value, fallback) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

export function buildTaxonomyDepthSeed({ hubId, discipline, domain, subfield, title }) {
  const subject = sentence(title, 'This archive subject')
  const field = sentence(discipline, 'cross-disciplinary research')
  const domainLabel = sentence(domain, field)
  const subfieldLabel = sentence(subfield, domainLabel)
  const profile = DISCIPLINE_PROFILES[field.toLowerCase()] || DEFAULT_PROFILE
  const archiveLabel = String(hubId || field).toUpperCase()

  const deepSections = [
    {
      heading: 'Subject orientation',
      paragraphs: [
        `${subject} is indexed within ${subfieldLabel}, a focused area of ${domainLabel} in the ${field} archive. This record treats the subject as more than a taxonomy label: it establishes the vocabulary, scope, relationships, and research questions needed to read later evidence accurately.`,
        `A strong account begins by defining the terms contained in ${subject}, identifying the scale at which they operate, and separating directly observable features from explanatory models. It should also state what falls outside the subject so neighboring concepts are not merged into a single broad claim.`,
      ],
    },
    {
      heading: 'Analytical framework',
      paragraphs: [
        `The topic should be examined through structure, process, context, and consequence. Structure describes the relevant parts or categories; process explains change or interaction; context records the conditions under which observations hold; and consequence connects the subject to outcomes elsewhere in ${subfieldLabel}.`,
        `Comparisons are most useful when they keep definitions and scales consistent. Contrasts across cases, periods, environments, models, or datasets can reveal patterns, but those patterns should not be treated as universal until alternative explanations and boundary conditions have been tested.`,
      ],
    },
    {
      heading: 'Methods and evidence',
      paragraphs: [
        `Research on ${subject} can draw on ${profile.methods}. The method must match the question: descriptive work establishes what is present, analytical work tests relationships, and explanatory work evaluates why a pattern or mechanism is plausible.`,
        `A reviewable archive entry records ${profile.evidence}. These details let another reader judge the strength of a conclusion instead of accepting it from presentation alone.`,
      ],
    },
    {
      heading: 'Connections and implications',
      paragraphs: [
        `${subject} belongs to a wider knowledge system. Its findings may refine adjacent topics in ${subfieldLabel}, challenge assumptions used elsewhere in ${domainLabel}, or supply methods and evidence that other disciplines can reuse. Those links should be made explicitly rather than implied by proximity in the archive.`,
        `The practical significance of the subject depends on scale, affected communities or systems, uncertainty, and the cost of error. A complete interpretation therefore reports both what the available evidence supports and what remains unresolved.`,
      ],
    },
  ]

  const advancedSections = [
    {
      heading: 'Technical synthesis',
      paragraphs: [
        `At L8, ${subject} is evaluated as an integrated research problem. Definitions, mechanisms, observations, and consequences must form a traceable chain: each conclusion should point back to a method, dataset, source, or explicitly labeled inference.`,
        `The deepest record should preserve competing models when the evidence does not select a single explanation. It should document sensitivity to assumptions, identify variables that could alter the result, and distinguish robust patterns from findings that depend on one case or measurement strategy.`,
      ],
    },
    {
      heading: 'Evidence standard',
      paragraphs: [
        `Evidence attached to this ${archiveLabel} record should include ${profile.evidence}. Primary material is preferred for specific claims, while synthesis sources are useful for terminology, historical framing, and mapping areas of agreement or active debate.`,
        `Contradictory findings are not discarded. They are compared for differences in definition, sample, instrument, period, environment, analytical method, and uncertainty. This makes disagreement informative and prevents the archive from presenting confidence that the underlying record does not justify.`,
      ],
    },
    {
      heading: 'Limits and open questions',
      paragraphs: [
        `Important follow-up questions include which observations would change the current interpretation, where evidence is sparse, whether the same relationships hold at another scale, and which assumptions have not yet been tested directly. These questions define the next useful archive contribution.`,
        `Future additions can replace or extend this seeded framework with reviewed subject-specific prose, datasets, citations, and technical notes without changing the coordinate or hierarchy of ${subject}.`,
      ],
    },
  ]

  return {
    detail: deepSections.flatMap((section) => section.paragraphs).join('\n\n'),
    deepSections,
    advancedSections,
  }
}
