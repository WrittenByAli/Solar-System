import researchData from '../src/data/researchData.json' with { type: 'json' }
import { HUB_TAXONOMY_RAW } from '../src/data/hubTaxonomyRaw.js'
import {
    ARCHIVE_MECHANICS,
    FEATURES,
    PLANETARY_HUBS,
} from '../src/components/solar-archive/homeContent.js'

const STOP_WORDS = new Set([
    'about', 'after', 'again', 'also', 'and', 'are', 'can', 'could', 'does',
    'for', 'from', 'give', 'have', 'how', 'into', 'its', 'more', 'please',
    'should', 'that', 'the', 'their', 'there', 'these', 'this', 'what', 'when',
    'where', 'which', 'with', 'would', 'you', 'your',
])

const SITE_OVERVIEW = `
The Solar Archive is a coordinate-based, community-built open knowledge platform.
It organizes research spatially: every entry has an X,Y address inside a planetary
hub rather than living in a flat feed or folder. The archive has ten research hubs,
eight zoom layers, and one unified archive. Users can browse as guests, explore the
map and archives, and signed-in members can submit research. Submissions go through
community review for relevance, factual quality, and source strength before becoming
public archive knowledge. The platform emphasizes peer review, open data, attribution,
and source-backed evidence.

Layer meaning: L1-L3 show the broad structure of a research domain; L4 identifies a
subject; L5 summarizes it; L6 expands the technical detail; L7-L8 organize citations
and source-backed evidence. Contributions target valid adjacent grid positions and
can include titles, summaries, technical detail, tags, images, links, and citations.
`.trim()

function compact(value, limit = 1500) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function buildKnowledgeChunks() {
    const chunks = [
        {
            id: 'site-overview',
            hubId: '',
            searchable: SITE_OVERVIEW.toLowerCase(),
            text: `SITE OVERVIEW\n${SITE_OVERVIEW}`,
        },
        {
            id: 'archive-mechanics',
            hubId: '',
            searchable: ARCHIVE_MECHANICS.map(item => `${item.kicker} ${item.title} ${item.body}`).join(' ').toLowerCase(),
            text: `HOW THE ARCHIVE WORKS\n${ARCHIVE_MECHANICS.map(item => `- ${item.title} ${item.body}`).join('\n')}`,
        },
        {
            id: 'platform-features',
            hubId: '',
            searchable: FEATURES.map(item => `${item.title} ${item.body}`).join(' ').toLowerCase(),
            text: `PLATFORM FEATURES\n${FEATURES.map(item => `- ${item.title}: ${item.body}`).join('\n')}`,
        },
        {
            id: 'hub-directory',
            hubId: '',
            searchable: PLANETARY_HUBS.map(hub => `${hub.planet} ${hub.domain}`).join(' ').toLowerCase(),
            text: `HUB DIRECTORY\n${PLANETARY_HUBS.map(hub => `- ${hub.planet}: ${hub.domain}`).join('\n')}`,
        },
    ]

    Object.entries(HUB_TAXONOMY_RAW).forEach(([hubId, hub]) => {
        hub.domains.forEach((domain, domainIndex) => {
            const details = domain.subfields.map(subfield => {
                const topics = (subfield.topics || []).join(', ')
                return `${subfield.label}: ${topics}`
            }).join('\n')
            const text = `${hub.discipline} / ${domain.label}\n${details}`
            chunks.push({
                id: `taxonomy-${hubId}-${domainIndex}`,
                hubId,
                searchable: text.toLowerCase(),
                text,
            })
        })
    })

    for (const planet of researchData.planets || []) {
        const planetIntro = compact(`${planet.intro} ${planet.description}`, 2400)
        chunks.push({
            id: `archive-${planet.id}-overview`,
            hubId: planet.id,
            searchable: `${planet.planet} ${planet.domain} ${planetIntro}`.toLowerCase(),
            text: `${planet.planet} HUB / ${planet.domain}\n${planetIntro}`,
        })

        for (const [sectionIndex, section] of (planet.sections || []).entries()) {
            const sectionBody = compact([
                section.shortSummary,
                section.content,
                section.detailedSummary,
                section.fullDepth,
            ].filter(Boolean).join(' '), 2200)
            if (!sectionBody) continue
            const text = `${planet.planet} HUB / ${planet.domain} / ${section.title}\n${sectionBody}`
            chunks.push({
                id: `archive-${planet.id}-${sectionIndex}`,
                hubId: planet.id,
                searchable: text.toLowerCase(),
                text,
            })
        }
    }

    return chunks
}

const KNOWLEDGE_CHUNKS = buildKnowledgeChunks()

function queryTerms(query) {
    return Array.from(new Set(
        query
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(term => term.length > 2 && !STOP_WORDS.has(term)),
    )).slice(0, 28)
}

function hubFromPage(page) {
    const match = String(page || '').match(/^\/archive\/([a-z0-9-]+)/i)
    return match?.[1]?.toLowerCase() || ''
}

export function getSiteKnowledge(messages, page) {
    const recentQuestions = messages
        .filter(message => message.role === 'user')
        .slice(-3)
        .map(message => message.content)
        .join(' ')
    const terms = queryTerms(recentQuestions)
    const activeHub = hubFromPage(page)

    const ranked = KNOWLEDGE_CHUNKS
        .filter(chunk => chunk.id !== 'site-overview')
        .map(chunk => {
            let score = chunk.hubId && chunk.hubId === activeHub ? 3 : 0
            for (const term of terms) {
                if (chunk.searchable.includes(term)) score += term.length > 7 ? 3 : 2
            }
            return { chunk, score }
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 7)
        .map(item => item.chunk.text)

    return [
        `CURRENT SITE PAGE: ${compact(page || '/', 120)}`,
        KNOWLEDGE_CHUNKS[0].text,
        ...ranked,
    ].join('\n\n---\n\n').slice(0, 14_000)
}
