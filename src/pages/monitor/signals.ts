import { t } from '@/src/i18n'
import type { Crop, MonitorSeries, Status } from '@/src/types'
import {
  classifyNdvi,
  classifySpi,
  heatStressWeeks,
  last,
  rainfallDeficitPct,
} from '@/src/utils/monitor'

export interface Signal {
  key: 'ndvi' | 'rain' | 'spi' | 'heat'
  status: Status
  text: string
}

/** Rain this far below normal over the last 4 weeks is a warning / danger. */
export const RAIN_WARNING_PCT = 20
export const RAIN_DANGER_PCT = 40
/** A week with less than this share of normal rain counts as dry. */
export const DRY_WEEK_RATIO = 0.7
/** Very hot weeks in the recent window: any is a warning, this many is danger. */
export const HEAT_DANGER_WEEKS = 3
export const HEAT_WINDOW_WEEKS = 8

export function isDryWeek(actualMm: number, normalMm: number): boolean {
  return actualMm < normalMm * DRY_WEEK_RATIO
}

const RANK: Record<Status, number> = { good: 0, warning: 1, danger: 2 }

export function farmSignals(series: MonitorSeries, crop: Crop): Signal[] {
  const ndvi = classifyNdvi(last(series.ndvi), crop)
  const spi = classifySpi(last(series.spi))
  const deficit = rainfallDeficitPct(series)
  const hot = heatStressWeeks(series).filter(
    (i) => i >= series.weeks.length - HEAT_WINDOW_WEEKS,
  ).length
  return [
    {
      key: 'ndvi',
      status: ndvi.status,
      text: t('mon.signal.ndvi', { label: t(ndvi.label) }),
    },
    {
      key: 'rain',
      status:
        deficit >= RAIN_DANGER_PCT
          ? 'danger'
          : deficit >= RAIN_WARNING_PCT
            ? 'warning'
            : 'good',
      text:
        deficit >= RAIN_WARNING_PCT
          ? t('mon.signal.rainLow', { pct: deficit })
          : deficit <= -RAIN_WARNING_PCT
            ? t('mon.signal.rainHigh', { pct: -deficit })
            : t('mon.signal.rainOk'),
    },
    {
      key: 'spi',
      status: spi.status,
      text: t('mon.signal.spi', { label: t(spi.label) }),
    },
    {
      key: 'heat',
      status:
        hot >= HEAT_DANGER_WEEKS ? 'danger' : hot > 0 ? 'warning' : 'good',
      text: hot > 0 ? t('mon.signal.heat', { n: hot }) : t('mon.signal.noHeat'),
    },
  ]
}

export function worstSignal(signals: Signal[]): Signal {
  return signals.reduce(
    (worst, s) => (RANK[s.status] > RANK[worst.status] ? s : worst),
    signals[0],
  )
}

/** Illustrative "greener than X% of farms nearby" figure derived from the health score. */
export function nearbyPercentile(score: number): number {
  return Math.min(95, Math.max(5, Math.round(score * 0.9)))
}
