/** Original homepage content — scroll story sections */

export const PLANETARY_HUBS = [
  { id: 'star', planet: 'North Star', domain: 'Foundation', color: '#f5a623', grad: ['#fde68a', '#f5a623', '#d97706'] },
  { id: 'sun', planet: 'Sun', domain: 'Physics', color: '#ff6b35', grad: ['#fed7aa', '#ff6b35', '#c2410c'] },
  { id: 'mercury', planet: 'Mercury', domain: 'Mathematics', color: '#94a3b8', grad: ['#e2e8f0', '#94a3b8', '#475569'] },
  { id: 'venus', planet: 'Venus', domain: 'Psychology', color: '#fbbf24', grad: ['#fef9c3', '#fbbf24', '#a16207'] },
  { id: 'earth', planet: 'Earth', domain: 'Earth Science', color: '#34d399', grad: ['#a7f3d0', '#34d399', '#059669'] },
  { id: 'mars', planet: 'Mars', domain: 'Technology', color: '#f87171', grad: ['#fecaca', '#f87171', '#b91c1c'] },
  { id: 'jupiter', planet: 'Jupiter', domain: 'Social Science', color: '#fb923c', grad: ['#fed7aa', '#fb923c', '#c2410c'] },
  { id: 'saturn', planet: 'Saturn', domain: 'Astronomy', color: '#fde68a', grad: ['#fef9c3', '#fde68a', '#d97706'] },
  { id: 'uranus', planet: 'Uranus', domain: 'Chemistry', color: '#67e8f9', grad: ['#cffafe', '#67e8f9', '#0891b2'] },
  { id: 'neptune', planet: 'Neptune', domain: 'Biology', color: '#818cf8', grad: ['#c7d2fe', '#818cf8', '#4338ca'] },
]

export const STATS = [
  { num: '10', label: 'Research Domains' },
  { num: '8', label: 'Archive Layers' },
  { num: '8×', label: 'Zoom Depth' },
  { num: '01', label: 'Unified Archive' },
]

export const STATEMENT_LINES = [
  { text: 'A closed-loop network', accent: false },
  { text: 'of living labs —', accent: false },
  { text: 'where energy is shared,', accent: false },
  { text: 'and knowledge is free.', accent: true },
]

export const ARCHIVE_MECHANICS = [
  {
    kicker: 'Coordinate Logic',
    title: 'Every idea has an address.',
    body: 'The archive is built like a living map. Each entry belongs to an exact X,Y coordinate, which makes research spatial instead of buried inside folders or long feeds.',
  },
  {
    kicker: 'Layered Reading',
    title: 'Zoom from overview to evidence.',
    body: 'L1-L3 show the large structure of a research domain. L4 names the subject. L5 summarizes it. L6 expands into detail. L7 and L8 organize citations and source-backed evidence.',
  },
  {
    kicker: 'Submission Flow',
    title: 'Contributions expand the grid.',
    body: 'Users submit research titles, summaries, technical details, tags, images, links, and citations. New submissions target valid adjacent grid slots.',
  },
  {
    kicker: 'Community Review',
    title: 'The map is curated, not chaotic.',
    body: 'Submitted entries enter a review queue. Reviewers check relevance, fact quality, and source strength before an entry becomes public archive knowledge.',
  },
]

export const FEATURES = [
  { n: '01', title: 'Image-Based Canvas', body: 'Upload any image — its pixel dimensions become your coordinate grid. Every pixel is addressable across 8 zoom levels.' },
  { n: '02', title: 'Coordinate Archive', body: 'Every research entry lives at an exact X,Y point. Navigate the archive like a map, not a list.' },
  { n: '03', title: 'Cross-Domain Lenses', body: 'The same topic appears in multiple planetary hubs. Jump between domains to read knowledge through different scientific lenses.' },
  { n: '04', title: 'Community Submissions', body: 'Submit entries, earn review points, and build the archive with contributors worldwide.' },
]

export const HERO_BULLETS = [
  'Explore research as a coordinate universe instead of a flat document list.',
  'Open any hub, zoom through layers, and follow ideas down to source-backed evidence.',
  'Submit adjacent grid entries that can become reviewed public knowledge.',
]

export const CTA_LINES = [
  { text: 'Start exploring', accent: false },
  { text: 'the archive.', accent: true },
]

export const DOMAIN_HIGHLIGHTS = [
  { label: 'Physics', slug: 'physics', body: 'Sun hub archives mechanics, thermodynamics, electromagnetism, quantum physics, and relativity.' },
  { label: 'Mathematics', slug: 'mathematics', body: 'Mercury hub covers algebra, geometry, analysis, statistics, and applied mathematical methods.' },
  { label: 'Astronomy', slug: 'astronomy', body: 'Saturn hub maps stars, galaxies, cosmology, and observational astronomy across the universe.' },
  { label: 'Social Science', slug: 'social-science', body: 'Jupiter hub archives economics, sociology, political science, and collective decision-making.' },
]

/** Non-overlapping scroll chapter spacers — see scrollChapters.js */
export { SCROLL_CHAPTERS, SCROLL_CHAPTER_COUNT } from './scrollChapters.js'
