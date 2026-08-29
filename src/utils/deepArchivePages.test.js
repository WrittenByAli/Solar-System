import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildDeepArchiveDocument, buildDeepArchivePages } from './deepArchivePages.js'
import { getHubResearchSections } from './hubTaxonomyRegistry.js'

const researchData = JSON.parse(readFileSync(new URL('../data/researchData.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))

test('every bundled planet topic produces L6 pages and long-form L7/L8 documents', () => {
  for (const planet of researchData.planets) {
    for (const section of planet.sections || []) {
      const data = {
        ...section,
        detail: section.content || section.fullDepth || section.detailedSummary || '',
        content: section.content || section.fullDepth || section.detailedSummary || section.shortSummary || '',
      }
      const pages = buildDeepArchivePages({ data, layer: 6, planetId: planet.id })
      assert.ok(pages.length > 0, `${planet.id}/${section.title}/L6`)
      assert.ok(pages.every((page) => page.title && page.body && page.context), `${planet.id}/${section.title}/L6 has complete text`)

      for (const layer of [7, 8]) {
        const document = buildDeepArchiveDocument({ data, layer, planetId: planet.id })
        assert.ok(document, `${planet.id}/${section.title}/L${layer}`)
        assert.ok(document.title && document.lede, `${planet.id}/${section.title}/L${layer} has a heading and introduction`)
        assert.ok(document.paragraphs.length > 0, `${planet.id}/${section.title}/L${layer} has detailed paragraphs`)
        assert.ok(document.paragraphs.every(Boolean), `${planet.id}/${section.title}/L${layer} has complete paragraphs`)
      }
    }
  }
})

test('citations remain out of L6 and become evidence and sources at L8 only', () => {
  const data = { title: 'Hydrogen', shortSummary: 'Hydrogen has one electron.', segments: ['Hydrogen has one electron.'] }
  const citations = [{ coordLabel: '0000,0000', title: 'Evidence', fact: 'Its atomic number is one.', sourceLabel: 'IUPAC', sourceHref: 'https://iupac.org/' }]

  assert.equal(buildDeepArchivePages({ data, layer: 6, planetId: 'uranus', citations }).length, 1)
  const l7 = buildDeepArchiveDocument({ data, layer: 7, planetId: 'uranus', citations })
  const l8 = buildDeepArchiveDocument({ data, layer: 8, planetId: 'uranus', citations })
  assert.equal(l7.evidence.length, 0)
  assert.equal(l7.sources.length, 0)
  assert.equal(l8.evidence.length, 1)
  assert.deepEqual(l8.sources, [{ label: 'IUPAC', href: 'https://iupac.org/' }])
})

test('every compiled planet topic carries structured seeded depth content', () => {
  for (const hubId of ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const sections = getHubResearchSections(hubId)
    assert.ok(sections.length > 0, `${hubId} has compiled topics`)
    for (const topic of sections) {
      assert.ok(topic.content.length > 1200, `${hubId}/${topic.title} has substantial seeded prose`)
      assert.ok(topic.deepSections.length >= 4, `${hubId}/${topic.title} has L7 headings`)
      assert.ok(topic.advancedSections.length >= 3, `${hubId}/${topic.title} has L8 headings`)
      const l7 = buildDeepArchiveDocument({ data: topic, layer: 7, planetId: hubId })
      const l8 = buildDeepArchiveDocument({ data: topic, layer: 8, planetId: hubId })
      assert.equal(l7.sections.length, 4, `${hubId}/${topic.title} renders four L7 sections`)
      assert.equal(l8.sections.length, 7, `${hubId}/${topic.title} renders seven L8 sections`)
    }
  }
})
