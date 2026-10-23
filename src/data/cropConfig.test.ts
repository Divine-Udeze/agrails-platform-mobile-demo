import {
  COUNTIES,
  CROPS,
  KENYA_CENTER,
  PLANS,
  RECOMMENDED_PLAN,
  countyCenter,
} from '@/src/data/cropConfig'

test('lists all 47 Kenyan counties without duplicates', () => {
  expect(COUNTIES).toHaveLength(47)
  expect(new Set(COUNTIES).size).toBe(47)
})

test('plans trigger at 60/70/80 percent and standard is recommended', () => {
  expect(PLANS.basic.triggerYieldPct).toBe(60)
  expect(PLANS.standard.triggerYieldPct).toBe(70)
  expect(PLANS.premium.triggerYieldPct).toBe(80)
  expect(RECOMMENDED_PLAN).toBe('standard')
})

test('every crop has a healthy NDVI range inside 0..1', () => {
  for (const info of Object.values(CROPS)) {
    expect(info.ndviHealthy[0]).toBeGreaterThan(0)
    expect(info.ndviHealthy[1]).toBeLessThan(1)
    expect(info.ndviHealthy[0]).toBeLessThan(info.ndviHealthy[1])
  }
})

test('countyCenter falls back to the centre of Kenya', () => {
  expect(countyCenter('Nakuru')).not.toEqual(KENYA_CENTER)
  expect(countyCenter('Unknown')).toEqual(KENYA_CENTER)
})
