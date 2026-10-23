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

export function coverageWindow(season: Season, today: Date = new Date()) {
  const { startMonth, endMonth } = SEASON_WINDOWS[season]
  const year =
    today.getUTCMonth() > endMonth
      ? today.getUTCFullYear() + 1
      : today.getUTCFullYear()
  return {
    start: new Date(Date.UTC(year, startMonth, 1)).toISOString(),
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
