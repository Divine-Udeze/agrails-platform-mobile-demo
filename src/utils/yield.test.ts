import { analyzeYield, riskFromBadYears } from '@/src/utils/yield'

const history = [2.5, 2.4, 1.2, 2.6, 2.5, 1.5, 2.7, 2.4, 2.6, 2.5].map(
  (y, i) => ({
    year: 2016 + i,
    yieldTPerHa: y,
    rainfallMm: 600,
  }),
)

test('finds years below 70% of the average', () => {
  const r = analyzeYield(history)
  expect(r.averageYield).toBeCloseTo(2.29, 2)
  expect(r.belowTriggerYears).toEqual([2018, 2021])
  expect(r.riskLevel).toBe('medium')
})

test('risk bands by number of bad years', () => {
  expect(riskFromBadYears(0)).toBe('low')
  expect(riskFromBadYears(1)).toBe('low')
  expect(riskFromBadYears(3)).toBe('medium')
  expect(riskFromBadYears(4)).toBe('high')
})

test('empty history is low risk', () => {
  expect(analyzeYield([])).toEqual({
    history: [],
    averageYield: 0,
    belowTriggerYears: [],
    riskLevel: 'low',
  })
})
