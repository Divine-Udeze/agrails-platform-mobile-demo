import {
  generateSeries,
  generateYieldHistory,
  hashString,
  mulberry32,
} from '@/src/data/generators'
import { healthScore, last } from '@/src/utils/monitor'
import { analyzeYield } from '@/src/utils/yield'

const END = new Date('2026-10-22T00:00:00.000Z')

test('PRNG and hash are deterministic', () => {
  expect(mulberry32(7)()).toBe(mulberry32(7)())
  expect(hashString('farm-1')).toBe(hashString('farm-1'))
  expect(hashString('farm-1')).not.toBe(hashString('farm-2'))
})

test('series has 16 aligned weekly points ending on or before endDate', () => {
  const s = generateSeries({
    seed: 1,
    crop: 'maize',
    scenario: 'healthy',
    endDate: END,
  })
  for (const key of [
    'weeks',
    'ndvi',
    'rainfallMm',
    'rainfallNormalMm',
    'spi',
    'tempMinC',
    'tempMaxC',
  ] as const) {
    expect(s[key]).toHaveLength(16)
  }
  expect(new Date(s.weeks[15]).getTime()).toBeLessThanOrEqual(END.getTime())
  expect(new Date(s.weeks[15]).getUTCDay()).toBe(1)
})

test('same seed gives the same series', () => {
  const a = generateSeries({
    seed: 5,
    crop: 'beans',
    scenario: 'normal',
    endDate: END,
  })
  const b = generateSeries({
    seed: 5,
    crop: 'beans',
    scenario: 'normal',
    endDate: END,
  })
  expect(a).toEqual(b)
})

test('scenarios tell different stories', () => {
  const healthy = generateSeries({
    seed: 3,
    crop: 'maize',
    scenario: 'healthy',
    endDate: END,
  })
  const drought = generateSeries({
    seed: 3,
    crop: 'beans',
    scenario: 'drought',
    endDate: END,
  })
  expect(healthScore(healthy, 'maize')).toBeGreaterThanOrEqual(80)
  expect(healthScore(drought, 'beans')).toBeLessThan(45)
  expect(last(drought.spi)).toBeLessThanOrEqual(-1.5)
})

test('yield history marks the requested bad years', () => {
  const h = generateYieldHistory(9, 'beans', [1, 4, 6, 8])
  expect(h.map((y) => y.year)).toEqual([
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
  ])
  expect(analyzeYield(h).belowTriggerYears).toEqual([2017, 2020, 2022, 2024])
})
