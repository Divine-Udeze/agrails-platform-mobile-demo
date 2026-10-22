import type { MonitorSeries } from '@/src/types'
import {
  classifyNdvi,
  classifySpi,
  healthScore,
  healthStatus,
  heatStressWeeks,
  last,
  rainfallDeficitPct,
} from '@/src/utils/monitor'

function series(over: Partial<MonitorSeries> = {}): MonitorSeries {
  const n = 4
  return {
    weeks: Array.from({ length: n }, (_, i) => `2026-0${i + 1}-01`),
    ndvi: Array(n).fill(0.7),
    rainfallMm: Array(n).fill(20),
    rainfallNormalMm: Array(n).fill(20),
    spi: Array(n).fill(0.2),
    tempMinC: Array(n).fill(14),
    tempMaxC: Array(n).fill(28),
    ...over,
  }
}

test.each([
  [-2.4, 'spi.extremeDrought', 'danger'],
  [-1.6, 'spi.severeDrought', 'danger'],
  [-1.2, 'spi.moderateDrought', 'warning'],
  [0, 'spi.normal', 'good'],
  [1.2, 'spi.moderatelyWet', 'good'],
  [1.7, 'spi.veryWet', 'good'],
  [2.3, 'spi.extremelyWet', 'warning'],
])('SPI %s is %s', (spi, label, status) => {
  expect(classifySpi(spi)).toEqual({ label, status })
})

test('NDVI classification uses the crop healthy range', () => {
  expect(classifyNdvi(0.5, 'maize')).toEqual({
    label: 'ndvi.healthy',
    status: 'good',
  })
  expect(classifyNdvi(0.35, 'maize')).toEqual({
    label: 'ndvi.stressed',
    status: 'warning',
  })
  expect(classifyNdvi(0.2, 'maize')).toEqual({
    label: 'ndvi.poor',
    status: 'danger',
  })
})

test('last returns the final value or 0', () => {
  expect(last([1, 2, 3])).toBe(3)
  expect(last([])).toBe(0)
})

test('health score is 100 for a healthy farm and 0 for a failing one', () => {
  expect(healthScore(series(), 'maize')).toBe(100)
  expect(
    healthScore(
      series({
        ndvi: Array(4).fill(0.15),
        spi: Array(4).fill(-2.5),
        tempMaxC: Array(4).fill(35),
      }),
      'maize',
    ),
  ).toBe(0)
})

test('health score drops with drought', () => {
  const s = healthScore(series({ spi: [0, 0, -1, -1] }), 'maize')
  expect(s).toBe(85)
})

test('health status bands', () => {
  expect(healthStatus(70)).toBe('good')
  expect(healthStatus(69)).toBe('warning')
  expect(healthStatus(45)).toBe('warning')
  expect(healthStatus(44)).toBe('danger')
})

test('heat stress weeks are those above 32 C', () => {
  expect(heatStressWeeks(series({ tempMaxC: [30, 33, 32, 34] }))).toEqual([
    1, 3,
  ])
})

test('rainfall deficit compares the last weeks with normal', () => {
  expect(rainfallDeficitPct(series({ rainfallMm: [20, 20, 10, 10] }), 2)).toBe(
    50,
  )
  expect(rainfallDeficitPct(series({ rainfallMm: [20, 20, 30, 30] }), 2)).toBe(
    -50,
  )
})
