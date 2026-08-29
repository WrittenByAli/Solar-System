function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function segmentTextValue(segment) {
  if (typeof segment === 'string') return cleanText(segment)
  return cleanText(segment?.text || segment?.content || segment?.body)
}

function splitSentences(value) {
  const text = cleanText(value)
  if (!text) return []
  return (text.match(/[^.!?]+[.!?]*/g) || [text]).map(cleanText).filter(Boolean)
}

function uniqueTexts(values) {
  const seen = new Set()
  return values.filter((value) => {
    const text = cleanText(value)
    const key = text.toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).map(cleanText)
}

function isRealCitation(citation) {
  return citation && cleanText(citation.coordLabel) !== '--' && cleanText(citation.fact)
}

const LAYER_COPY = {
  6: { eyebrow: 'FOUNDATION DETAIL', note: 'Focused explanation' },
  7: { eyebrow: 'TECHNICAL READING', note: 'Context and evidence' },
  8: { eyebrow: 'DEEP EVIDENCE', note: 'Source-backed archive record' },
}

export function buildDeepArchivePages({ data, layer, planetId, citations = [] }) {
  if (!data) return []
  const title = cleanText(data.title) || 'Archive record'
  const summary = cleanText(data.shortSummary)
  const detail = cleanText(data.detail || data.detailedSummary || data.description || data.content)
  const profile = LAYER_COPY[layer] || LAYER_COPY[6]
  const segmentFacts = Array.isArray(data.segments)
    ? data.segments.map(segmentTextValue)
    : []
  const narrativeFacts = uniqueTexts([
    ...segmentFacts,
    ...splitSentences(detail),
    ...splitSentences(summary),
  ])

  if (narrativeFacts.length === 0) narrativeFacts.push(`${title} is indexed for further archive development.`)

  const context = detail || summary || narrativeFacts.join(' ')
  return narrativeFacts.map((fact, index) => ({
    id: `narrative-${index + 1}`,
    eyebrow: profile.eyebrow,
    note: profile.note,
    title,
    label: `FACT ${String(index + 1).padStart(2, '0')}`,
    body: fact,
    context,
    sourceLabel: '',
    sourceHref: '',
    planetId: cleanText(planetId).toUpperCase(),
  }))
}

function groupFactsIntoParagraphs(facts, size) {
  const paragraphs = []
  for (let index = 0; index < facts.length; index += size) {
    paragraphs.push(facts.slice(index, index + size).join(' '))
  }
  return paragraphs
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return []
  return sections.map((section, index) => {
    const heading = cleanText(section?.heading) || `Archive analysis ${index + 1}`
    const paragraphs = Array.isArray(section?.paragraphs)
      ? section.paragraphs.map(cleanText).filter(Boolean)
      : [cleanText(section?.text || section?.content)].filter(Boolean)
    return { heading, paragraphs }
  }).filter((section) => section.paragraphs.length > 0)
}

function factsToSections(facts, layer) {
  const headings = layer === 8
    ? ['Technical synthesis', 'Evidence context', 'Limits and implications']
    : ['Subject overview', 'Key relationships', 'Research context']
  const sectionSize = Math.max(1, Math.ceil(facts.length / headings.length))
  const groups = []
  for (let index = 0; index < facts.length; index += sectionSize) {
    groups.push(facts.slice(index, index + sectionSize))
  }
  return groups.map((group, index) => ({
    heading: headings[index] || `Extended analysis ${index + 1}`,
    paragraphs: groupFactsIntoParagraphs(group, layer === 8 ? 3 : 2),
  }))
}

export function buildDeepArchiveDocument({ data, layer, planetId, citations = [] }) {
  if (!data) return null
  const title = cleanText(data.title) || 'Archive record'
  const summary = cleanText(data.shortSummary)
  const detail = cleanText(data.detail || data.detailedSummary || data.description || data.content)
  const segmentFacts = Array.isArray(data.segments) ? data.segments.map(segmentTextValue) : []
  const facts = uniqueTexts([
    ...segmentFacts,
    ...splitSentences(detail),
    ...splitSentences(summary),
  ])
  if (facts.length === 0) facts.push(`${title} is indexed for further archive development.`)

  const evidence = []
  const seenEvidence = new Set()
  for (const citation of citations.filter(isRealCitation)) {
    const fact = cleanText(citation.fact)
    const key = `${fact.toLocaleLowerCase()}|${cleanText(citation.sourceHref).toLocaleLowerCase()}`
    if (seenEvidence.has(key)) continue
    seenEvidence.add(key)
    evidence.push({
      title: cleanText(citation.title) || title,
      fact,
      coordLabel: cleanText(citation.coordLabel),
      sourceLabel: cleanText(citation.sourceLabel),
      sourceHref: cleanText(citation.sourceHref),
    })
  }

  const paragraphSize = layer === 8 ? 4 : 3
  const authoredSections = normalizeSections(data.deepSections)
  const advancedSections = normalizeSections(data.advancedSections)
  const sections = authoredSections.length > 0
    ? (layer === 8 ? [...authoredSections, ...advancedSections] : authoredSections)
    : factsToSections(facts, layer)
  const paragraphs = sections.flatMap((section) => section.paragraphs)
  return {
    title,
    planetId: cleanText(planetId).toUpperCase(),
    eyebrow: layer === 8 ? 'DEEP EVIDENCE DOSSIER' : 'EXPANDED TECHNICAL RECORD',
    lede: summary || facts[0],
    paragraphs: paragraphs.length ? paragraphs : groupFactsIntoParagraphs(facts, paragraphSize),
    sections,
    evidence: layer === 8 ? evidence : [],
    sources: layer === 8
      ? evidence.filter((item) => item.sourceHref).map((item) => ({ label: item.sourceLabel || item.title, href: item.sourceHref }))
      : [],
  }
}
