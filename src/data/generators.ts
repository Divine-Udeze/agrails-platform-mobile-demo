import { CROPS } from '@/src/data/cropConfig'
import type { Crop, MonitorSeries, YieldData } from '@/src/types'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type Scenario = 'healthy' | 'drought' | 'normal'

const r2 = (n: number) => Math.round(n * 100) / 100
const r1 = (n: number) => Math.round(n * 10) / 10

function mondayOnOrBefore(d: Date): Date {
  const day = d.getUTCDay()
  const diff = (day + 6) % 7
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff),
  )
}

export function generateSeries(opts: {
  seed: number
  crop: Crop
  scenario: Scenario
  weeks?: number
  endDate?: Date
}): MonitorSeries {
  const { seed, crop, scenario, weeks: n = 16, endDate = new Date() } = opts
  const rand = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + (hi - lo) * rand()
  const lastMonday = mondayOnOrBefore(endDate)
  const out: MonitorSeries = {
    weeks: [],
    ndvi: [],
    rainfallMm: [],
    rainfallNormalMm: [],
    spi: [],
    tempMinC: [],
    tempMaxC: [],
  }
  const peak =
    scenario === 'healthy' ? 0.75 : scenario === 'normal' ? 0.66 : 0.6
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1)
    const week = new Date(lastMonday.getTime() - (n - 1 - i) * 7 * 86400000)
    out.weeks.push(week.toISOString())

    // Greenness: annual crops grow then plateau; tea stays green all year.
    let ndvi =
      crop === 'tea'
        ? 0.68
        : 0.25 + (peak - 0.25) * Math.sin((Math.min(1, t * 1.3) * Math.PI) / 2)
    if (scenario === 'drought' && i >= n - 6) ndvi -= (i - (n - 7)) * 0.05
    out.ndvi.push(r2(ndvi + between(-0.02, 0.02)))

    const normal = 10 + 30 * Math.sin(Math.PI * t)
    out.rainfallNormalMm.push(r1(normal))
    const rainFactor =
      scenario === 'healthy'
        ? between(0.9, 1.2)
        : scenario === 'normal'
          ? between(0.8, 1.15)
          : i < n - 8
            ? between(0.8, 1)
            : between(0.1, 0.4)
    out.rainfallMm.push(r1(normal * rainFactor))

    const spi =
      scenario === 'healthy'
        ? between(0.2, 0.8)
        : scenario === 'normal'
          ? between(-0.4, 0.4)
          : i < n - 8
            ? between(-0.3, 0.3)
            : -(i - (n - 9)) * 0.21
    out.spi.push(r2(spi))

    out.tempMinC.push(r1(between(12, 15)))
    const max =
      scenario === 'healthy'
        ? between(25, 29)
        : scenario === 'normal'
          ? between(26, 30)
          : i >= n - 6
            ? 30 + (i - (n - 7)) * 0.8
            : between(27, 30)
    out.tempMaxC.push(r1(max))
  }
  return out
}

export function generateYieldHistory(
  seed: number,
  crop: Crop,
  badYearIndexes: number[],
  startYear = 2016,
  years = 10,
): YieldData[] {
  const rand = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + (hi - lo) * rand()
  const expected = CROPS[crop].expectedYieldTPerHa
  return Array.from({ length: years }, (_, i) => {
    const bad = badYearIndexes.includes(i)
    return {
      year: startYear + i,
      yieldTPerHa: r2(
        expected * (bad ? between(0.35, 0.45) : between(0.9, 1.1)),
      ),
      rainfallMm: Math.round(bad ? between(300, 420) : between(650, 850)),
    }
  })
}
