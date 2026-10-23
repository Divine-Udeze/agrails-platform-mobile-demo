import {
  CROPS,
  PLANS,
  RISK_RATES,
  SEASON_WINDOWS,
  SUBSIDY_PCT,
} from '@/src/data/cropConfig'
import type { Crop, Farm, PlanId, Quote, RiskLevel, Season } from '@/src/types'

export function roundTo10(n: number): number {
  return Math.round(n / 10) * 10
}

export function sumInsured(crop: Crop, areaHa: number, planId: PlanId): number {
  return roundTo10(
    CROPS[crop].valuePerHaKES * areaHa * PLANS[planId].coveragePct,
  )
}

export function premiumBreakdown(sumInsuredKES: number, risk: RiskLevel) {
  const premiumKES = roundTo10(sumInsuredKES * RISK_RATES[risk])
  const subsidyKES = roundTo10(premiumKES * SUBSIDY_PCT)
  return { premiumKES, subsidyKES, farmerPremiumKES: premiumKES - subsidyKES }
}

export function payoutAmount(
  sumInsuredKES: number,
  triggerYieldPct: number,
  actualYieldPct: number,
): number {
  if (actualYieldPct >= triggerYieldPct) return 0
  const share =
    (triggerYieldPct - Math.max(0, actualYieldPct)) / triggerYieldPct
  return roundTo10(sumInsuredKES * share)
}

/** Kenya is UTC+3 all year (no daylight saving). */
const NAIROBI_OFFSET_MS = 3 * 3600_000
const DAY_MS = 86_400_000
/** With less cover than this left in the running season, quote next season. */
const MIN_COVER_DAYS = 30

/**
 * The cover period to quote. Cover starts today (Nairobi date, at UTC
 * midnight) when the season is running with at least 30 days left; otherwise
 * it is the season's first day, next year if this season is over or nearly so.
 */
export function coverageWindow(season: Season, today: Date = new Date()) {
  const { startMonth, endMonth } = SEASON_WINDOWS[season]
  const local = new Date(today.getTime() + NAIROBI_OFFSET_MS)
  const month = local.getUTCMonth()
  const todayMidnight = Date.UTC(
    local.getUTCFullYear(),
    month,
    local.getUTCDate(),
  )
  let year = local.getUTCFullYear()
  let start = Date.UTC(year, startMonth, 1)
  if (month > endMonth) {
    year += 1
    start = Date.UTC(year, startMonth, 1)
  } else if (month >= startMonth) {
    const end = Date.UTC(year, endMonth + 1, 0)
    if (end - todayMidnight < MIN_COVER_DAYS * DAY_MS) {
      year += 1
      start = Date.UTC(year, startMonth, 1)
    } else {
      start = todayMidnight
    }
  }
  return {
    start: new Date(start).toISOString(),
    end: new Date(Date.UTC(year, endMonth + 1, 0)).toISOString(),
  }
}

export function buildQuote(
  farm: Farm,
  planId: PlanId,
  today: Date = new Date(),
): Quote {
  const plan = PLANS[planId]
  const si = sumInsured(farm.crop, farm.areaHa, planId)
  const window = coverageWindow(farm.season, today)
  return {
    farmId: farm.id,
    planId,
    sumInsuredKES: si,
    ...premiumBreakdown(si, farm.riskLevel),
    triggerYieldPct: plan.triggerYieldPct,
    coverageStart: window.start,
    coverageEnd: window.end,
    exampleAt50PctKES: payoutAmount(si, plan.triggerYieldPct, 50),
  }
}
