function attachmentUrl(attachment) {
  return attachment?.url || attachment?.href || ''
}

function attachmentUrlKey(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''

  try {
    return new URL(raw).href
  } catch {
    return raw
  }
}

/** Preserve the first attachment for each URL, regardless of label or kind. */
export function dedupeAttachmentsByUrl(attachments, getUrl = attachmentUrl) {
  const seen = new Set()
  const unique = []

  for (const attachment of Array.isArray(attachments) ? attachments : []) {
    if (!attachment) continue
    const key = attachmentUrlKey(getUrl(attachment))
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(attachment)
  }

  return unique
}
