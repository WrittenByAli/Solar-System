import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PERIODIC_ELEMENTS,
  URANUS_PERIODIC_TABLE_BRANCH,
  buildPeriodicElementEntries,
  getElectronShellPopulation,
  isUranusPeriodicTableBranch,
} from './periodicTable.js'

test('catalog contains all 118 elements in atomic-number order', () => {
  assert.equal(PERIODIC_ELEMENTS.length, 118)
  assert.deepEqual(
    PERIODIC_ELEMENTS.map((element) => element.atomicNumber),
    Array.from({ length: 118 }, (_, index) => index + 1),
  )
  assert.equal(PERIODIC_ELEMENTS[0].symbol, 'H')
  assert.equal(PERIODIC_ELEMENTS[117].symbol, 'Og')
})

test('periodic-table display positions are unique and preserve canonical anchors', () => {
  const positions = PERIODIC_ELEMENTS.map((element) => `${element.displayRow},${element.displayColumn}`)
  assert.equal(new Set(positions).size, 118)

  const bySymbol = Object.fromEntries(PERIODIC_ELEMENTS.map((element) => [element.symbol, element]))
  assert.deepEqual([bySymbol.H.displayRow, bySymbol.H.displayColumn], [1, 1])
  assert.deepEqual([bySymbol.He.displayRow, bySymbol.He.displayColumn], [1, 18])
  assert.deepEqual([bySymbol.Fe.displayRow, bySymbol.Fe.displayColumn], [4, 8])
  assert.deepEqual([bySymbol.La.displayRow, bySymbol.La.displayColumn], [8, 3])
  assert.deepEqual([bySymbol.Ac.displayRow, bySymbol.Ac.displayColumn], [9, 3])
  assert.deepEqual([bySymbol.Og.displayRow, bySymbol.Og.displayColumn], [7, 18])
})

test('electron shell populations contain exactly one electron per atomic number', () => {
  for (const element of PERIODIC_ELEMENTS) {
    const electronCount = element.electronShells.reduce((total, shell) => total + shell, 0)
    assert.equal(electronCount, element.atomicNumber, element.name)
    assert.equal(element.electronShells.length, element.period, element.name)
  }

  assert.deepEqual(getElectronShellPopulation(1), [1])
  assert.deepEqual(getElectronShellPopulation(19), [2, 8, 8, 1])
  assert.deepEqual(getElectronShellPopulation(118), [2, 8, 18, 32, 32, 18, 8])
})

test('archive adapter assigns one rich record per element at stable coordinates', () => {
  const entries = buildPeriodicElementEntries({ lx: -84, ly: 39 }, 1920, 1080)
  assert.equal(Object.keys(entries).length, 118)

  const hydrogen = entries['1836,1041']
  const helium = entries['1853,1041']
  assert.equal(hydrogen.element.symbol, 'H')
  assert.equal(helium.element.symbol, 'He')
  assert.match(hydrogen.shortSummary, /element 1/i)
  assert.ok(hydrogen.detail.length > hydrogen.shortSummary.length)
  assert.ok(hydrogen.segments.length >= 8)
  assert.equal(hydrogen.deepFactSources.length, 3)
})

test('branch matcher scopes the override to the exact Uranus topic', () => {
  assert.equal(isUranusPeriodicTableBranch(URANUS_PERIODIC_TABLE_BRANCH), true)
  assert.equal(isUranusPeriodicTableBranch({ ...URANUS_PERIODIC_TABLE_BRANCH, hubId: 'earth' }), false)
  assert.equal(isUranusPeriodicTableBranch({ ...URANUS_PERIODIC_TABLE_BRANCH, topicTitle: 'Periodic Trends' }), false)
})
