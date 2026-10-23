import type { RiskLevel, YieldAnalysisResult, YieldData } from '@/src/types'

export function riskFromBadYears(count: number): RiskLevel {
  if (count <= 1) return 'low'
  if (count <= 3) return 'medium'
  return 'high'
}

export function analyzeYield(
  history: YieldData[],
  triggerPct = 70,
): YieldAnalysisResult {
  if (history.length === 0) {
    return { history, averageYield: 0, belowTriggerYears: [], riskLevel: 'low' }
  }
  const average =
    history.reduce((s, y) => s + y.yieldTPerHa, 0) / history.length
  const threshold = (average * triggerPct) / 100
  const belowTriggerYears = history
    .filter((y) => y.yieldTPerHa < threshold)
    .map((y) => y.year)
  return {
    history,
    averageYield: Math.round(average * 100) / 100,
    belowTriggerYears,
    riskLevel: riskFromBadYears(belowTriggerYears.length),
  }
}
