import assert from 'node:assert/strict'
import test from 'node:test'
import { dedupeAttachmentsByUrl } from './archiveAttachments.js'

test('attachment links are deduplicated by URL while preserving the first label', () => {
  const attachments = [
    { kind: 'graph', label: 'Graph', url: 'https://example.com/research' },
    { kind: 'source', label: 'Source', url: 'https://example.com/research' },
    { kind: 'source', label: 'Paper', url: 'https://example.com/paper' },
  ]

  assert.deepEqual(dedupeAttachmentsByUrl(attachments), [attachments[0], attachments[2]])
})

test('equivalent absolute URL forms and empty attachments do not create duplicates', () => {
  const unique = dedupeAttachmentsByUrl([
    { label: 'First', url: 'https://EXAMPLE.com' },
    { label: 'Second', href: 'https://example.com/' },
    { label: 'Missing URL' },
    null,
  ])

  assert.deepEqual(unique, [{ label: 'First', url: 'https://EXAMPLE.com' }])
})
