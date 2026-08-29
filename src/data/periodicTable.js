const PERIODIC_TOPIC = "The Periodic Table's History & Organization"

export const URANUS_PERIODIC_TABLE_BRANCH = Object.freeze({
  hubId: 'uranus',
  domainId: 'inorganic-physical-chemistry',
  subfieldId: 'atomic-structure-the-periodic-table',
  topicTitle: PERIODIC_TOPIC,
})

export const ELEMENT_CATEGORIES = Object.freeze({
  'alkali-metal': { label: 'Alkali metal', tone: '#fb7185' },
  'alkaline-earth-metal': { label: 'Alkaline earth', tone: '#fbbf24' },
  'transition-metal': { label: 'Transition metal', tone: '#38bdf8' },
  'post-transition-metal': { label: 'Post-transition', tone: '#2dd4bf' },
  metalloid: { label: 'Metalloid', tone: '#a3e635' },
  nonmetal: { label: 'Reactive nonmetal', tone: '#4ade80' },
  halogen: { label: 'Halogen', tone: '#22d3ee' },
  'noble-gas': { label: 'Noble gas', tone: '#818cf8' },
  lanthanide: { label: 'Lanthanide', tone: '#f472b6' },
  actinide: { label: 'Actinide', tone: '#fb923c' },
})

// symbol, name, mass, period, group, category, phase, display row, display column
// The f-block is shown in its conventional detached rows (8 and 9).
const ELEMENT_ROWS = [
  ['H', 'Hydrogen', '1.008', 1, 1, 'nonmetal', 'gas', 1, 1],
  ['He', 'Helium', '4.0026', 1, 18, 'noble-gas', 'gas', 1, 18],
  ['Li', 'Lithium', '6.94', 2, 1, 'alkali-metal', 'solid', 2, 1],
  ['Be', 'Beryllium', '9.0122', 2, 2, 'alkaline-earth-metal', 'solid', 2, 2],
  ['B', 'Boron', '10.81', 2, 13, 'metalloid', 'solid', 2, 13],
  ['C', 'Carbon', '12.011', 2, 14, 'nonmetal', 'solid', 2, 14],
  ['N', 'Nitrogen', '14.007', 2, 15, 'nonmetal', 'gas', 2, 15],
  ['O', 'Oxygen', '15.999', 2, 16, 'nonmetal', 'gas', 2, 16],
  ['F', 'Fluorine', '18.998', 2, 17, 'halogen', 'gas', 2, 17],
  ['Ne', 'Neon', '20.180', 2, 18, 'noble-gas', 'gas', 2, 18],
  ['Na', 'Sodium', '22.990', 3, 1, 'alkali-metal', 'solid', 3, 1],
  ['Mg', 'Magnesium', '24.305', 3, 2, 'alkaline-earth-metal', 'solid', 3, 2],
  ['Al', 'Aluminium', '26.982', 3, 13, 'post-transition-metal', 'solid', 3, 13],
  ['Si', 'Silicon', '28.085', 3, 14, 'metalloid', 'solid', 3, 14],
  ['P', 'Phosphorus', '30.974', 3, 15, 'nonmetal', 'solid', 3, 15],
  ['S', 'Sulfur', '32.06', 3, 16, 'nonmetal', 'solid', 3, 16],
  ['Cl', 'Chlorine', '35.45', 3, 17, 'halogen', 'gas', 3, 17],
  ['Ar', 'Argon', '39.948', 3, 18, 'noble-gas', 'gas', 3, 18],
  ['K', 'Potassium', '39.098', 4, 1, 'alkali-metal', 'solid', 4, 1],
  ['Ca', 'Calcium', '40.078', 4, 2, 'alkaline-earth-metal', 'solid', 4, 2],
  ['Sc', 'Scandium', '44.956', 4, 3, 'transition-metal', 'solid', 4, 3],
  ['Ti', 'Titanium', '47.867', 4, 4, 'transition-metal', 'solid', 4, 4],
  ['V', 'Vanadium', '50.942', 4, 5, 'transition-metal', 'solid', 4, 5],
  ['Cr', 'Chromium', '51.996', 4, 6, 'transition-metal', 'solid', 4, 6],
  ['Mn', 'Manganese', '54.938', 4, 7, 'transition-metal', 'solid', 4, 7],
  ['Fe', 'Iron', '55.845', 4, 8, 'transition-metal', 'solid', 4, 8],
  ['Co', 'Cobalt', '58.933', 4, 9, 'transition-metal', 'solid', 4, 9],
  ['Ni', 'Nickel', '58.693', 4, 10, 'transition-metal', 'solid', 4, 10],
  ['Cu', 'Copper', '63.546', 4, 11, 'transition-metal', 'solid', 4, 11],
  ['Zn', 'Zinc', '65.38', 4, 12, 'transition-metal', 'solid', 4, 12],
  ['Ga', 'Gallium', '69.723', 4, 13, 'post-transition-metal', 'solid', 4, 13],
  ['Ge', 'Germanium', '72.630', 4, 14, 'metalloid', 'solid', 4, 14],
  ['As', 'Arsenic', '74.922', 4, 15, 'metalloid', 'solid', 4, 15],
  ['Se', 'Selenium', '78.971', 4, 16, 'nonmetal', 'solid', 4, 16],
  ['Br', 'Bromine', '79.904', 4, 17, 'halogen', 'liquid', 4, 17],
  ['Kr', 'Krypton', '83.798', 4, 18, 'noble-gas', 'gas', 4, 18],
  ['Rb', 'Rubidium', '85.468', 5, 1, 'alkali-metal', 'solid', 5, 1],
  ['Sr', 'Strontium', '87.62', 5, 2, 'alkaline-earth-metal', 'solid', 5, 2],
  ['Y', 'Yttrium', '88.906', 5, 3, 'transition-metal', 'solid', 5, 3],
  ['Zr', 'Zirconium', '91.224', 5, 4, 'transition-metal', 'solid', 5, 4],
  ['Nb', 'Niobium', '92.906', 5, 5, 'transition-metal', 'solid', 5, 5],
  ['Mo', 'Molybdenum', '95.95', 5, 6, 'transition-metal', 'solid', 5, 6],
  ['Tc', 'Technetium', '[98]', 5, 7, 'transition-metal', 'solid', 5, 7],
  ['Ru', 'Ruthenium', '101.07', 5, 8, 'transition-metal', 'solid', 5, 8],
  ['Rh', 'Rhodium', '102.91', 5, 9, 'transition-metal', 'solid', 5, 9],
  ['Pd', 'Palladium', '106.42', 5, 10, 'transition-metal', 'solid', 5, 10],
  ['Ag', 'Silver', '107.87', 5, 11, 'transition-metal', 'solid', 5, 11],
  ['Cd', 'Cadmium', '112.41', 5, 12, 'transition-metal', 'solid', 5, 12],
  ['In', 'Indium', '114.82', 5, 13, 'post-transition-metal', 'solid', 5, 13],
  ['Sn', 'Tin', '118.71', 5, 14, 'post-transition-metal', 'solid', 5, 14],
  ['Sb', 'Antimony', '121.76', 5, 15, 'metalloid', 'solid', 5, 15],
  ['Te', 'Tellurium', '127.60', 5, 16, 'metalloid', 'solid', 5, 16],
  ['I', 'Iodine', '126.90', 5, 17, 'halogen', 'solid', 5, 17],
  ['Xe', 'Xenon', '131.29', 5, 18, 'noble-gas', 'gas', 5, 18],
  ['Cs', 'Caesium', '132.91', 6, 1, 'alkali-metal', 'solid', 6, 1],
  ['Ba', 'Barium', '137.33', 6, 2, 'alkaline-earth-metal', 'solid', 6, 2],
  ['La', 'Lanthanum', '138.91', 6, null, 'lanthanide', 'solid', 8, 3],
  ['Ce', 'Cerium', '140.12', 6, null, 'lanthanide', 'solid', 8, 4],
  ['Pr', 'Praseodymium', '140.91', 6, null, 'lanthanide', 'solid', 8, 5],
  ['Nd', 'Neodymium', '144.24', 6, null, 'lanthanide', 'solid', 8, 6],
  ['Pm', 'Promethium', '[145]', 6, null, 'lanthanide', 'solid', 8, 7],
  ['Sm', 'Samarium', '150.36', 6, null, 'lanthanide', 'solid', 8, 8],
  ['Eu', 'Europium', '151.96', 6, null, 'lanthanide', 'solid', 8, 9],
  ['Gd', 'Gadolinium', '157.25', 6, null, 'lanthanide', 'solid', 8, 10],
  ['Tb', 'Terbium', '158.93', 6, null, 'lanthanide', 'solid', 8, 11],
  ['Dy', 'Dysprosium', '162.50', 6, null, 'lanthanide', 'solid', 8, 12],
  ['Ho', 'Holmium', '164.93', 6, null, 'lanthanide', 'solid', 8, 13],
  ['Er', 'Erbium', '167.26', 6, null, 'lanthanide', 'solid', 8, 14],
  ['Tm', 'Thulium', '168.93', 6, null, 'lanthanide', 'solid', 8, 15],
  ['Yb', 'Ytterbium', '173.05', 6, null, 'lanthanide', 'solid', 8, 16],
  ['Lu', 'Lutetium', '174.97', 6, null, 'lanthanide', 'solid', 8, 17],
  ['Hf', 'Hafnium', '178.49', 6, 4, 'transition-metal', 'solid', 6, 4],
  ['Ta', 'Tantalum', '180.95', 6, 5, 'transition-metal', 'solid', 6, 5],
  ['W', 'Tungsten', '183.84', 6, 6, 'transition-metal', 'solid', 6, 6],
  ['Re', 'Rhenium', '186.21', 6, 7, 'transition-metal', 'solid', 6, 7],
  ['Os', 'Osmium', '190.23', 6, 8, 'transition-metal', 'solid', 6, 8],
  ['Ir', 'Iridium', '192.22', 6, 9, 'transition-metal', 'solid', 6, 9],
  ['Pt', 'Platinum', '195.08', 6, 10, 'transition-metal', 'solid', 6, 10],
  ['Au', 'Gold', '196.97', 6, 11, 'transition-metal', 'solid', 6, 11],
  ['Hg', 'Mercury', '200.59', 6, 12, 'transition-metal', 'liquid', 6, 12],
  ['Tl', 'Thallium', '204.38', 6, 13, 'post-transition-metal', 'solid', 6, 13],
  ['Pb', 'Lead', '207.2', 6, 14, 'post-transition-metal', 'solid', 6, 14],
  ['Bi', 'Bismuth', '208.98', 6, 15, 'post-transition-metal', 'solid', 6, 15],
  ['Po', 'Polonium', '[209]', 6, 16, 'post-transition-metal', 'solid', 6, 16],
  ['At', 'Astatine', '[210]', 6, 17, 'halogen', 'solid', 6, 17],
  ['Rn', 'Radon', '[222]', 6, 18, 'noble-gas', 'gas', 6, 18],
  ['Fr', 'Francium', '[223]', 7, 1, 'alkali-metal', 'solid', 7, 1],
  ['Ra', 'Radium', '[226]', 7, 2, 'alkaline-earth-metal', 'solid', 7, 2],
  ['Ac', 'Actinium', '[227]', 7, null, 'actinide', 'solid', 9, 3],
  ['Th', 'Thorium', '232.04', 7, null, 'actinide', 'solid', 9, 4],
  ['Pa', 'Protactinium', '231.04', 7, null, 'actinide', 'solid', 9, 5],
  ['U', 'Uranium', '238.03', 7, null, 'actinide', 'solid', 9, 6],
  ['Np', 'Neptunium', '[237]', 7, null, 'actinide', 'solid', 9, 7],
  ['Pu', 'Plutonium', '[244]', 7, null, 'actinide', 'solid', 9, 8],
  ['Am', 'Americium', '[243]', 7, null, 'actinide', 'solid', 9, 9],
  ['Cm', 'Curium', '[247]', 7, null, 'actinide', 'solid', 9, 10],
  ['Bk', 'Berkelium', '[247]', 7, null, 'actinide', 'solid', 9, 11],
  ['Cf', 'Californium', '[251]', 7, null, 'actinide', 'solid', 9, 12],
  ['Es', 'Einsteinium', '[252]', 7, null, 'actinide', 'solid', 9, 13],
  ['Fm', 'Fermium', '[257]', 7, null, 'actinide', 'solid', 9, 14],
  ['Md', 'Mendelevium', '[258]', 7, null, 'actinide', 'solid', 9, 15],
  ['No', 'Nobelium', '[259]', 7, null, 'actinide', 'solid', 9, 16],
  ['Lr', 'Lawrencium', '[266]', 7, null, 'actinide', 'solid', 9, 17],
  ['Rf', 'Rutherfordium', '[267]', 7, 4, 'transition-metal', 'unknown', 7, 4],
  ['Db', 'Dubnium', '[268]', 7, 5, 'transition-metal', 'unknown', 7, 5],
  ['Sg', 'Seaborgium', '[269]', 7, 6, 'transition-metal', 'unknown', 7, 6],
  ['Bh', 'Bohrium', '[270]', 7, 7, 'transition-metal', 'unknown', 7, 7],
  ['Hs', 'Hassium', '[277]', 7, 8, 'transition-metal', 'unknown', 7, 8],
  ['Mt', 'Meitnerium', '[278]', 7, 9, 'transition-metal', 'unknown', 7, 9],
  ['Ds', 'Darmstadtium', '[281]', 7, 10, 'transition-metal', 'unknown', 7, 10],
  ['Rg', 'Roentgenium', '[282]', 7, 11, 'transition-metal', 'unknown', 7, 11],
  ['Cn', 'Copernicium', '[285]', 7, 12, 'transition-metal', 'unknown', 7, 12],
  ['Nh', 'Nihonium', '[286]', 7, 13, 'post-transition-metal', 'unknown', 7, 13],
  ['Fl', 'Flerovium', '[289]', 7, 14, 'post-transition-metal', 'unknown', 7, 14],
  ['Mc', 'Moscovium', '[290]', 7, 15, 'post-transition-metal', 'unknown', 7, 15],
  ['Lv', 'Livermorium', '[293]', 7, 16, 'post-transition-metal', 'unknown', 7, 16],
  ['Ts', 'Tennessine', '[294]', 7, 17, 'halogen', 'unknown', 7, 17],
  ['Og', 'Oganesson', '[294]', 7, 18, 'noble-gas', 'unknown', 7, 18],
]

// Electrons are assigned by the conventional Aufbau filling order. The shell
// totals drive the archive visualization; their sum always equals atomic number.
const ORBITAL_FILLING_ORDER = Object.freeze([
  [1, 2], [2, 2], [2, 6], [3, 2], [3, 6], [4, 2], [3, 10],
  [4, 6], [5, 2], [4, 10], [5, 6], [6, 2], [4, 14], [5, 10],
  [6, 6], [7, 2], [5, 14], [6, 10], [7, 6],
])

export function getElectronShellPopulation(atomicNumber) {
  let remaining = Math.max(0, Math.trunc(atomicNumber))
  const shells = []

  for (const [shellNumber, capacity] of ORBITAL_FILLING_ORDER) {
    if (remaining === 0) break
    const electrons = Math.min(capacity, remaining)
    shells[shellNumber - 1] = (shells[shellNumber - 1] || 0) + electrons
    remaining -= electrons
  }

  return shells
}

function elementBlock(period, group, category, symbol) {
  if (category === 'lanthanide' || category === 'actinide') return 'f'
  if (symbol === 'He' || group <= 2) return 's'
  if (group >= 13) return 'p'
  return 'd'
}

export const PERIODIC_ELEMENTS = Object.freeze(ELEMENT_ROWS.map((row, index) => {
  const [symbol, name, atomicMass, period, group, category, phase, displayRow, displayColumn] = row
  const atomicNumber = index + 1
  return Object.freeze({
    atomicNumber,
    symbol,
    name,
    atomicMass,
    period,
    group,
    block: elementBlock(period, group, category, symbol),
    category,
    phase,
    displayRow,
    displayColumn,
    electronShells: Object.freeze(getElectronShellPopulation(atomicNumber)),
  })
}))

export function isUranusPeriodicTableBranch({ hubId, domainId, subfieldId, topicTitle }) {
  return String(hubId || '').toLowerCase() === URANUS_PERIODIC_TABLE_BRANCH.hubId &&
    domainId === URANUS_PERIODIC_TABLE_BRANCH.domainId &&
    subfieldId === URANUS_PERIODIC_TABLE_BRANCH.subfieldId &&
    topicTitle === URANUS_PERIODIC_TABLE_BRANCH.topicTitle
}

function articleFor(label) {
  return /^[aeiou]/i.test(label) ? 'an' : 'a'
}

function buildElementEntry(element, lx, ly) {
  const category = ELEMENT_CATEGORIES[element.category]
  const groupText = element.group ? `group ${element.group}` : 'the detached f-block'
  const phaseText = element.phase === 'unknown' ? 'has no experimentally established bulk phase' : `is a ${element.phase} under standard conditions`
  const massNote = element.atomicMass.startsWith('[')
    ? `The bracketed mass ${element.atomicMass} identifies a representative isotope because ${element.name} has no standard atomic weight.`
    : `Its standard atomic weight is ${element.atomicMass}.`
  const summary = `${element.name} (${element.symbol}) is element ${element.atomicNumber}: ${articleFor(category.label)} ${category.label.toLowerCase()} in period ${element.period}, ${groupText}.`
  const segments = [
    `${element.name} has atomic number ${element.atomicNumber}, so every neutral atom contains ${element.atomicNumber} protons and ${element.atomicNumber} electrons.`,
    `${element.symbol} occupies period ${element.period} and ${groupText} in the long-form periodic table.`,
    `${element.name} belongs to the ${category.label.toLowerCase()} family and ${phaseText}.`,
    `${massNote}`,
    `Its placement in the ${element.block}-block identifies the subshell type receiving the differentiating electron in the conventional ground-state classification.`,
    `Periodic position links ${element.name} to neighboring elements through recurring valence-electron structure rather than through atomic mass alone.`,
    `Atomic number, not atomic weight, is the modern ordering principle that fixes ${element.name}'s position in the table.`,
    `Detailed isotope, oxidation-state, bonding, and materials data can extend this static archive record later without changing its atomic-number identity or grid coordinate.`,
  ].map((text, index) => ({ text, difficulty: Math.min(5, 1 + Math.floor(index / 2)) }))
  const detail = segments.map((segment) => segment.text).join(' ')
  const rscSlug = element.name.toLowerCase().replace(/\s+/g, '-')
  const sources = [
    {
      label: 'IUPAC Periodic Table',
      url: 'https://iupac.org/what-we-do/periodic-table-of-elements/',
      fact: `${element.name} is listed by IUPAC with atomic number ${element.atomicNumber} and symbol ${element.symbol}.`,
    },
    {
      label: `Royal Society of Chemistry: ${element.name}`,
      url: `https://www.rsc.org/periodic-table/element/${element.atomicNumber}/${rscSlug}`,
      fact: `The RSC element profile documents physical, chemical, historical, and atomic data for ${element.name}.`,
    },
    {
      label: `PubChem: ${element.name}`,
      url: `https://pubchem.ncbi.nlm.nih.gov/element/${encodeURIComponent(element.name)}`,
      fact: `PubChem provides a machine-readable reference record for elemental ${element.name}.`,
    },
  ]

  return {
    id: `periodic-element-${element.atomicNumber}`,
    title: `${element.name} (${element.symbol})`,
    shortSummary: summary,
    detail,
    content: detail,
    segments,
    attachments: sources.map(({ label, url }) => ({ label, url })),
    tags: ['uranus', 'chemistry', 'periodic-table', element.category, element.block],
    alternatePerspectives: [],
    element,
    deepFactSources: sources.map((source) => ({
      coordLabel: `${lx},${ly}`,
      title: `${element.name} evidence record`,
      fact: source.fact,
      sourceLabel: source.label,
      sourceHref: source.url,
    })),
    foundationMeta: {
      domainId: URANUS_PERIODIC_TABLE_BRANCH.domainId,
      subfieldId: URANUS_PERIODIC_TABLE_BRANCH.subfieldId,
      topicTitle: URANUS_PERIODIC_TABLE_BRANCH.topicTitle,
    },
  }
}

export function buildPeriodicElementEntries(anchor, halfW, halfH) {
  const entries = {}
  if (!anchor || !Number.isFinite(anchor.lx) || !Number.isFinite(anchor.ly)) return entries

  for (const element of PERIODIC_ELEMENTS) {
    const lx = anchor.lx + element.displayColumn - 1
    const ly = anchor.ly - element.displayRow + 1
    const gx = lx + halfW
    const gy = halfH - ly
    entries[`${gx},${gy}`] = buildElementEntry(element, lx, ly)
  }
  return entries
}
