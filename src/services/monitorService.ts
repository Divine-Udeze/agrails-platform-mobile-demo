import { generateSeries, hashString } from '@/src/data/generators'
import { SEED_SCENARIOS } from '@/src/data/mockData'
import { delay, serviceConfig } from '@/src/services/config'
import type { Farm, MonitorSeries, Weather } from '@/src/types'

export function seriesFor(farm: Pick<Farm, 'id' | 'crop'>): MonitorSeries {
  return generateSeries({
    seed: hashString(farm.id),
    crop: farm.crop,
    scenario: SEED_SCENARIOS[farm.id] ?? 'normal',
  })
}

export async function getSeries(
  farm: Pick<Farm, 'id' | 'crop'>,
): Promise<MonitorSeries> {
  await delay(serviceConfig.latencyMs)
  return seriesFor(farm)
}

export function getWeather(county: string): Weather {
  const day = new Date().toISOString().slice(0, 10)
  const h = hashString(`${county}:${day}`)
  const rainChancePct = h % 91
  return {
    tempC: 18 + (h % 13),
    rainChancePct,
    condition:
      rainChancePct > 60 ? 'rain' : rainChancePct > 30 ? 'cloudy' : 'sunny',
  }
}
