import { generateYieldHistory, hashString } from '@/src/data/generators'
import { YIELD_HISTORIES } from '@/src/data/mockData'
import { delay, newId, serviceConfig } from '@/src/services/config'
import { seriesFor } from '@/src/services/monitorService'
import type {
  Crop,
  Farm,
  FarmFormData,
  YieldAnalysisResult,
  YieldData,
} from '@/src/types'
import { validateBoundary } from '@/src/utils/geo'
import { healthScore } from '@/src/utils/monitor'
import { analyzeYield } from '@/src/utils/yield'

export function getYieldHistory(county: string, crop: Crop): YieldData[] {
  const key = `${county}:${crop}`
  if (YIELD_HISTORIES[key]) return YIELD_HISTORIES[key]
  const h = hashString(key)
  const badYears = [(h >>> 3) % 10, (h >>> 7) % 10].slice(0, h % 3)
  return generateYieldHistory(h, crop, badYears)
}

export async function analyzeFarmYield(
  farm: Pick<Farm, 'county' | 'crop'>,
): Promise<YieldAnalysisResult> {
  await delay(serviceConfig.latencyMs)
  return analyzeYield(getYieldHistory(farm.county, farm.crop))
}

const toIso = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00.000Z`).toISOString()

export async function createFarm(
  form: FarmFormData,
  county: string,
): Promise<Farm> {
  await delay(serviceConfig.latencyMs)
  const check = validateBoundary(form.boundary)
  if (
    !form.name.trim() ||
    !form.crop ||
    !form.season ||
    !form.plantingDate ||
    !check.ok
  ) {
    throw new Error('incomplete_form')
  }
  const id = newId('farm')
  const crop = form.crop
  return {
    id,
    name: form.name.trim(),
    crop,
    season: form.season,
    plantingDate: toIso(form.plantingDate),
    boundary: form.boundary,
    areaHa: Number(check.areaHa.toFixed(2)),
    county,
    riskLevel: analyzeYield(getYieldHistory(county, crop)).riskLevel,
    healthScore: healthScore(seriesFor({ id, crop }), crop),
  }
}

export async function updateFarm(
  farm: Farm,
  form: FarmFormData,
): Promise<Farm> {
  await delay(serviceConfig.latencyMs)
  const crop = form.crop ?? farm.crop
  return {
    ...farm,
    name: form.name.trim() || farm.name,
    crop,
    season: form.season ?? farm.season,
    plantingDate: form.plantingDate
      ? toIso(form.plantingDate)
      : farm.plantingDate,
    riskLevel: analyzeYield(getYieldHistory(farm.county, crop)).riskLevel,
  }
}
