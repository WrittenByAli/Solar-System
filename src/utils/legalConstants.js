/** Single source of truth for the legal pages (/privacy, /terms), the
 * signup consent notice, and the footer's Legal links. Update here once —
 * every reference (page copy, mailto links, footer, Join.jsx) reads from
 * this file instead of hardcoding these values.
 *
 * Everything marked "placeholder" below is a real, working value (the
 * page renders correctly and the copy is honest about what it is), but is
 * exactly the kind of detail the actual site operator needs to swap in
 * before launch — a registered legal name, a real inbox, a chosen forum.
 */

// Placeholder — replace with the operator's real support/legal inbox
// before launch. The .example TLD is IANA-reserved for documentation, so
// this can never accidentally resolve to someone else's real domain.
export const CONTACT_EMAIL = 'privacy@solar-archive.example'

// Placeholder — replace with the registered legal entity name (or the
// operator's own name, if run as an individual) once one exists.
export const OPERATOR_NAME = 'The SOLAR Archive Project'

// Placeholder — replace once the operator has a registered address or
// decides not to publish one (GDPR doesn't require a postal address on
// the site itself, only that the controller be identifiable on request).
export const OPERATOR_JURISDICTION_NOTE =
  'operated from the Netherlands; a full registered address is available on request to the contact address above'

// Placeholder — pick the governing-law forum once the operator has legal
// counsel or a settled jurisdiction. The Netherlands is suggested as the
// default given this policy's GDPR/AVG (NL) framing, but this is a plain
// text value specifically so it's a one-line edit, not a rewrite.
export const GOVERNING_LAW = 'the Netherlands'

export const PRIVACY_LAST_UPDATED = '21 July 2026'
export const TERMS_LAST_UPDATED = '21 July 2026'

export const SITE_NAME = 'The SOLAR Archive'
