import { BookOpen, ShieldCheck, Crosshair, LayoutGrid, Award, Globe } from 'lucide-react'

export const REVIEWER_RANKS = [
  { name: 'Reviewer I', min: 0, max: 200, color: '#94a3b8' },
  { name: 'Reviewer II', min: 200, max: 500, color: '#34d399' },
  { name: 'Citation Analyst', min: 500, max: 1200, color: '#0ea5e9' },
  { name: 'Archive Validator', min: 1200, max: 3000, color: '#a78bfa' },
  { name: 'Senior Reviewer', min: 3000, max: 6000, color: '#f5a623' },
  { name: 'Lead Reviewer', min: 6000, max: Infinity, color: '#ff6b35' },
]

export const FEATURE_CARDS = [
  { icon: BookOpen, size: 'lg', title: 'Citation verification', desc: 'Confirm every source is live, current, and appropriate for the hub and layer filed.' },
  { icon: ShieldCheck, title: 'Fact-check gate', desc: 'Three independent passes before an entry merges into the public coordinate grid.' },
  { icon: Crosshair, title: 'Coordinate placement', desc: 'Validate X,Y slots against hub taxonomy and adjacent grid rules.' },
  { icon: LayoutGrid, title: 'Review queue', desc: 'Assess pending entries, assign difficulty, and provide author feedback.' },
  { icon: Award, title: 'Reviewer levels', desc: 'Completed reviews contribute to reviewer standing.' },
  { icon: Globe, title: 'Public archive', desc: 'Approved entries become searchable knowledge at archive.solar.' },
]

export const REVIEW_FEED = [
  {
    id: 1, reviewer: 'aurora_field', rank: 'Senior Reviewer', xp: 2840,
    title: 'Passive Solar Building Design Principles', hub: 'Earth Hub', coord: '142, 088', layer: 'L5',
    views: 142088,
    citationScore: 9.4, clarityScore: 8.8, difficulty: 4, status: 'approved', date: '2026-05-24', helpful: 48,
    notes: 'All six cited sources are peer-reviewed and current. Coordinate 142,088 sits correctly in the Earth hub thermal domain.',
    sources: ['buildingscience.com', 'ashrae.org', 'nrel.gov'],
  },
  {
    id: 2, reviewer: 'orbit_cartographer', rank: 'Archive Validator', xp: 2360,
    title: 'Vertical Axis Wind Turbine Arrays — Off-Grid Deployment', hub: 'Sun Hub', coord: '067, 201', layer: 'L6',
    views: 67201,
    citationScore: 8.2, clarityScore: 9.1, difficulty: 5, status: 'approved', date: '2026-05-23', helpful: 39,
    notes: 'Strong technical depth. Difficulty 5/5 is justified — advanced engineering knowledge required.',
    sources: ['wind-energy.eu', 'irena.org', 'sciencedirect.com'],
  },
  {
    id: 3, reviewer: 'solar_factcheck', rank: 'Citation Analyst', xp: 1980,
    title: 'Seawater Desalination via Concentrated Solar Thermal', hub: 'Neptune Hub', coord: '234, 156', layer: 'L4',
    views: 234156,
    citationScore: 6.3, clarityScore: 7.1, difficulty: 4, status: 'revision', date: '2026-05-22', helpful: 27,
    notes: 'Two citations resolve to dead links. Author asked to fix sources and verify coordinate placement.',
    sources: ['iwa-network.org'],
  },
  {
    id: 4, reviewer: 'signal_bridge', rank: 'Archive Validator', xp: 1540,
    title: 'LoRa Mesh Networks for Rural Autonomy Infrastructure', hub: 'Mercury Hub', coord: '089, 113', layer: 'L5',
    views: 89113,
    citationScore: 9.7, clarityScore: 9.4, difficulty: 3, status: 'approved', date: '2026-05-21', helpful: 31,
    notes: 'Outstanding citation quality — all five sources live and version-accurate.',
    sources: ['lora-alliance.org', 'semtech.com', 'thethingsnetwork.org'],
  },
  {
    id: 5, reviewer: 'bio_dome_archivist', rank: 'Reviewer II', xp: 780,
    title: 'Biochar Soil Amendment for Carbon Sequestration', hub: 'Earth Hub', coord: '178, 044', layer: 'L4',
    views: 178044,
    citationScore: 7.8, clarityScore: 8.2, difficulty: 3, status: 'pending', date: '2026-05-20', helpful: 14,
    notes: 'Initial citation check: 4/6 verified. Awaiting second reviewer before final decision.',
    sources: ['nature.com', 'soilsociety.org'],
  },
]

export const TOP_REVIEWERS = [
  { username: 'aurora_field', rank: 'Knowledge Steward', xp: 2840, reviews: 47, accuracy: 94 },
  { username: 'orbit_cartographer', rank: 'Archive Validator', xp: 2360, reviews: 32, accuracy: 91 },
  { username: 'solar_factcheck', rank: 'Citation Analyst', xp: 1980, reviews: 38, accuracy: 89 },
  { username: 'signal_bridge', rank: 'Archive Validator', xp: 1540, reviews: 24, accuracy: 96 },
]

export const HUB_FILTERS = ['All Hubs', 'Sun Hub', 'Earth Hub', 'Mercury Hub', 'Neptune Hub', 'Mars Hub']
export const STATUS_FILTERS = ['All', 'Approved', 'Revision', 'Pending']

export const DEMO_XP = 2840
export const DEMO_RANK_IDX = 3

export const COMMUNITY_METRICS = [
  { label: 'Reviews this week', value: '12' },
  { label: 'Approval rate', value: '87%' },
  { label: 'Avg. citation score', value: '8.4' },
  { label: 'Active reviewers', value: '24' },
]
