import { CROPS, HEAT_STRESS_C } from '@/src/data/cropConfig'
import type { StringKey } from '@/src/i18n'
import type { Crop, MonitorSeries, Status } from '@/src/types'

export interface Classification {
  label: StringKey
  status: Status
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function last(values: number[]): number {
  return values.length ? values[values.length - 1] : 0
}

export function classifySpi(spi: number): Classification {
  if (spi <= -2) return { label: 'spi.extremeDrought', status: 'danger' }
  if (spi <= -1.5) return { label: 'spi.severeDrought', status: 'danger' }
  if (spi <= -1) return { label: 'spi.moderateDrought', status: 'warning' }
  if (spi < 1) return { label: 'spi.normal', status: 'good' }
  if (spi < 1.5) return { label: 'spi.moderatelyWet', status: 'good' }
  if (spi < 2) return { label: 'spi.veryWet', status: 'good' }
  return { label: 'spi.extremelyWet', status: 'warning' }
}

export function classifyNdvi(ndvi: number, crop: Crop): Classification {
  const low = CROPS[crop].ndviHealthy[0]
  if (ndvi >= low) return { label: 'ndvi.healthy', status: 'good' }
  if (ndvi >= low - 0.15) return { label: 'ndvi.stressed', status: 'warning' }
  return { label: 'ndvi.poor', status: 'danger' }
}

export function heatStressWeeks(series: MonitorSeries): number[] {
  return series.tempMaxC.flatMap((t, i) => (t > HEAT_STRESS_C ? [i] : []))
}

/**
 * 50% crop greenness, 30% drought index, 20% heat stress in the last 4 weeks.
 */
export function healthScore(series: MonitorSeries, crop: Crop): number {
  const low = CROPS[crop].ndviHealthy[0]
  const ndviScore = clamp01((last(series.ndvi) - (low - 0.25)) / 0.25)
  const spiScore = clamp01((last(series.spi) + 2) / 2)
  const recentMax = series.tempMaxC.slice(-4)
  const hotWeeks = recentMax.filter((t) => t > HEAT_STRESS_C).length
  const heatScore = recentMax.length ? 1 - hotWeeks / recentMax.length : 1
  return Math.round(100 * (0.5 * ndviScore + 0.3 * spiScore + 0.2 * heatScore))
}

export function healthStatus(score: number): Status {
  if (score >= 70) return 'good'
  if (score >= 45) return 'warning'
  return 'danger'
}

export function rainfallDeficitPct(series: MonitorSeries, lastN = 4): number {
  const actual = series.rainfallMm.slice(-lastN).reduce((s, n) => s + n, 0)
  const normal = series.rainfallNormalMm
    .slice(-lastN)
    .reduce((s, n) => s + n, 0)
  if (normal === 0) return 0
  return Math.round(((normal - actual) / normal) * 100)
}
