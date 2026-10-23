import { generateSeries } from '@/src/data/generators'
import { HEAT_STRESS_C } from '@/src/data/cropConfig'
import {
  DRY_WEEK_RATIO,
  HEAT_DANGER_WEEKS,
  RAIN_DANGER_PCT,
  RAIN_WARNING_PCT,
  farmSignals,
  isDryWeek,
  nearbyPercentile,
  worstSignal,
  type Signal,
} from '@/src/pages/monitor/signals'
import type { MonitorSeries } from '@/src/types'

const END = new Date('2026-10-22T00:00:00.000Z')
const N = 16

/** A flat, healthy series that individual tests tweak. */
function flat(over: Partial<MonitorSeries> = {}): MonitorSeries {
  return {
    weeks: Array.from(
      { length: N },
      (_, i) => `2026-07-${10 + i}T00:00:00.000Z`,
    ),
    ndvi: Array(N).fill(0.7),
    rainfallMm: Array(N).fill(50),
    rainfallNormalMm: Array(N).fill(50),
    spi: Array(N).fill(0),
    tempMinC: Array(N).fill(14),
    tempMaxC: Array(N).fill(26),
    ...over,
  }
}

const byKey = (signals: Signal[], key: Signal['key']) =>
  signals.find((s) => s.key === key)!

test('a drought farm has a danger signal from the drought index', () => {
  const s = generateSeries({
    seed: 3,
    crop: 'beans',
    scenario: 'drought',
    endDate: END,
  })
  const signals = farmSignals(s, 'beans')
  expect(signals.map((x) => x.key)).toEqual(['ndvi', 'rain', 'spi', 'heat'])
  expect(worstSignal(signals).status).toBe('danger')
})

test('a healthy farm is all good', () => {
  const s = generateSeries({
    seed: 3,
    crop: 'maize',
    scenario: 'healthy',
    endDate: END,
  })
  expect(farmSignals(s, 'maize').every((x) => x.status === 'good')).toBe(true)
})

test('always returns four signals in key order', () => {
  expect(farmSignals(flat(), 'maize').map((x) => x.key)).toEqual([
    'ndvi',
    'rain',
    'spi',
    'heat',
  ])
})

test('ndvi: healthy at the crop low bound, warning and danger below it', () => {
  // maize healthy range starts at 0.45
  expect(
    byKey(farmSignals(flat({ ndvi: Array(N).fill(0.45) }), 'maize'), 'ndvi')
      .status,
  ).toBe('good')
  expect(
    byKey(farmSignals(flat({ ndvi: Array(N).fill(0.4) }), 'maize'), 'ndvi')
      .status,
  ).toBe('warning')
  expect(
    byKey(farmSignals(flat({ ndvi: Array(N).fill(0.29) }), 'maize'), 'ndvi')
      .status,
  ).toBe('danger')
  expect(
    byKey(farmSignals(flat({ ndvi: Array(N).fill(0.4) }), 'maize'), 'ndvi')
      .text,
  ).toBe('Crop: Stressed')
})

test('rain: 19% deficit is fine, 20% warns, 40% is danger', () => {
  const at = (actual: number) =>
    byKey(
      farmSignals(flat({ rainfallMm: Array(N).fill(actual) }), 'maize'),
      'rain',
    )
  expect(at(40.5).status).toBe('good') // 19%
  expect(at(40.5).text).toBe('Rain near normal')
  expect(at(40).status).toBe('warning') // 20%
  expect(at(40).text).toBe('Rain 20% below normal')
  expect(at(31).status).toBe('warning') // 38%
  expect(at(30).status).toBe('danger') // 40%
})

test('rain: a wet spell reads as above normal and stays good', () => {
  const wet = byKey(
    farmSignals(flat({ rainfallMm: Array(N).fill(75) }), 'maize'),
    'rain',
  )
  expect(wet.status).toBe('good')
  expect(wet.text).toBe('Rain 50% above normal')
  const nearWet = byKey(
    farmSignals(flat({ rainfallMm: Array(N).fill(59) }), 'maize'),
    'rain',
  )
  expect(nearWet.text).toBe('Rain near normal')
})

test('spi: drought index drives status and label', () => {
  const at = (v: number) =>
    byKey(farmSignals(flat({ spi: Array(N).fill(v) }), 'maize'), 'spi')
  expect(at(-0.9).status).toBe('good')
  expect(at(-1).status).toBe('warning')
  expect(at(-1.5).status).toBe('danger')
  expect(at(-1.68).text).toBe('Drought index: Severe drought')
})

test('heat: counts only the last 8 weeks; 3 or more is danger', () => {
  const temps = (hot: number[]) =>
    Array.from({ length: N }, (_, i) =>
      hot.includes(i) ? HEAT_STRESS_C + 1 : 26,
    )
  const at = (hot: number[]) =>
    byKey(farmSignals(flat({ tempMaxC: temps(hot) }), 'maize'), 'heat')
  expect(at([]).status).toBe('good')
  expect(at([]).text).toBe('No heat stress')
  expect(at([N - 1]).status).toBe('warning')
  expect(at([N - 1]).text).toBe('1 very hot weeks')
  expect(at([N - 1, N - 2]).status).toBe('warning')
  expect(at([N - 1, N - 2, N - 3]).status).toBe('danger')
  // week 7 is outside the last 8 (indexes 8..15)
  expect(at([7, 6, 5]).status).toBe('good')
  expect(at([8]).status).toBe('warning')
  // exactly at the threshold is not heat stress
  expect(
    byKey(
      farmSignals(flat({ tempMaxC: Array(N).fill(HEAT_STRESS_C) }), 'maize'),
      'heat',
    ).status,
  ).toBe('good')
})

describe('worstSignal', () => {
  const sig = (key: Signal['key'], status: Signal['status']): Signal => ({
    key,
    status,
    text: key,
  })
  test('ranks danger above warning above good', () => {
    expect(
      worstSignal([
        sig('ndvi', 'good'),
        sig('rain', 'warning'),
        sig('spi', 'danger'),
        sig('heat', 'good'),
      ]).key,
    ).toBe('spi')
    expect(
      worstSignal([
        sig('ndvi', 'good'),
        sig('rain', 'good'),
        sig('spi', 'warning'),
        sig('heat', 'good'),
      ]).key,
    ).toBe('spi')
  })
  test('ties keep key order', () => {
    expect(
      worstSignal([
        sig('ndvi', 'warning'),
        sig('rain', 'danger'),
        sig('spi', 'danger'),
        sig('heat', 'warning'),
      ]).key,
    ).toBe('rain')
    expect(
      worstSignal([
        sig('ndvi', 'good'),
        sig('rain', 'good'),
        sig('spi', 'good'),
        sig('heat', 'good'),
      ]).key,
    ).toBe('ndvi')
  })
})

test('nearbyPercentile stays between 5 and 95', () => {
  expect(nearbyPercentile(100)).toBe(90)
  expect(nearbyPercentile(50)).toBe(45)
  expect(nearbyPercentile(0)).toBe(5)
  expect(nearbyPercentile(5)).toBe(5)
  expect(nearbyPercentile(-20)).toBe(5)
  expect(nearbyPercentile(106)).toBe(95)
  expect(nearbyPercentile(500)).toBe(95)
})

test('thresholds are named constants', () => {
  expect(RAIN_WARNING_PCT).toBe(20)
  expect(RAIN_DANGER_PCT).toBe(40)
  expect(HEAT_DANGER_WEEKS).toBe(3)
  expect(DRY_WEEK_RATIO).toBe(0.7)
})

test('isDryWeek: below 70% of normal is dry, exactly 70% is not', () => {
  expect(isDryWeek(34.9, 50)).toBe(true)
  expect(isDryWeek(35, 50)).toBe(false)
  expect(isDryWeek(0, 50)).toBe(true)
  expect(isDryWeek(0, 0)).toBe(false)
})
