import type { Farm } from '@/src/types'
import {
  buildQuote,
  coverageWindow,
  payoutAmount,
  premiumBreakdown,
  roundTo10,
  sumInsured,
} from '@/src/utils/insurance'

const maizeFarm: Farm = {
  id: 'f1',
  name: 'Shamba',
  crop: 'maize',
  season: 'long_rains',
  plantingDate: '2027-03-10T00:00:00.000Z',
  boundary: [],
  areaHa: 1.2,
  county: 'Nakuru',
  riskLevel: 'low',
  healthScore: 90,
}

test('roundTo10 rounds to the nearest 10 KES', () => {
  expect(roundTo10(1234)).toBe(1230)
  expect(roundTo10(1235)).toBe(1240)
})

test('sum insured = crop value per ha x area x plan coverage', () => {
  expect(sumInsured('maize', 1.2, 'standard')).toBe(100800)
  expect(sumInsured('beans', 0.8, 'basic')).toBe(43200)
})

test('premium uses the risk rate with a 50% subsidy', () => {
  expect(premiumBreakdown(100800, 'low')).toEqual({
    premiumKES: 5040,
    subsidyKES: 2520,
    farmerPremiumKES: 2520,
  })
  expect(premiumBreakdown(43200, 'high')).toEqual({
    premiumKES: 4320,
    subsidyKES: 2160,
    farmerPremiumKES: 2160,
  })
})

test('payout is zero at or above the trigger and proportional below it', () => {
  expect(payoutAmount(43200, 60, 60)).toBe(0)
  expect(payoutAmount(43200, 60, 75)).toBe(0)
  expect(payoutAmount(43200, 60, 45)).toBe(10800)
  expect(payoutAmount(43200, 60, 0)).toBe(43200)
})

test('coverage window: before the season starts, cover starts on its first day', () => {
  const today = new Date('2026-08-15T10:30:00.000Z')
  expect(coverageWindow('short_rains', today)).toEqual({
    start: '2026-10-01T00:00:00.000Z',
    end: '2026-12-31T00:00:00.000Z',
  })
})

test('coverage window: mid-season, cover starts today at UTC midnight', () => {
  const today = new Date('2026-10-23T14:45:00.000Z')
  expect(coverageWindow('short_rains', today)).toEqual({
    start: '2026-10-23T00:00:00.000Z',
    end: '2026-12-31T00:00:00.000Z',
  })
})

test('coverage window: after the season, rolls to next year from its first day', () => {
  const today = new Date('2026-10-23T00:00:00.000Z')
  expect(coverageWindow('long_rains', today)).toEqual({
    start: '2027-03-01T00:00:00.000Z',
    end: '2027-07-31T00:00:00.000Z',
  })
})

test('coverage window: first day of the season starts that day', () => {
  expect(
    coverageWindow('short_rains', new Date('2026-10-01T09:00:00.000Z')),
  ).toEqual({
    start: '2026-10-01T00:00:00.000Z',
    end: '2026-12-31T00:00:00.000Z',
  })
})

test('coverage window: exactly 30 days left is still this season', () => {
  expect(
    coverageWindow('short_rains', new Date('2026-12-01T09:00:00.000Z')),
  ).toEqual({
    start: '2026-12-01T00:00:00.000Z',
    end: '2026-12-31T00:00:00.000Z',
  })
})

test('coverage window: under 30 days left quotes next year', () => {
  expect(
    coverageWindow('short_rains', new Date('2026-12-15T09:00:00.000Z')),
  ).toEqual({
    start: '2027-10-01T00:00:00.000Z',
    end: '2027-12-31T00:00:00.000Z',
  })
})

test('coverage window uses the Nairobi date, not the UTC date', () => {
  // 01:30 on 23 Oct in Nairobi
  expect(
    coverageWindow('short_rains', new Date('2026-10-22T22:30:00.000Z')).start,
  ).toBe('2026-10-23T00:00:00.000Z')
})

test('buildQuote combines all pricing rules', () => {
  const q = buildQuote(
    maizeFarm,
    'standard',
    new Date('2026-10-22T00:00:00.000Z'),
  )
  expect(q).toEqual({
    farmId: 'f1',
    planId: 'standard',
    sumInsuredKES: 100800,
    premiumKES: 5040,
    subsidyKES: 2520,
    farmerPremiumKES: 2520,
    triggerYieldPct: 70,
    coverageStart: '2027-03-01T00:00:00.000Z',
    coverageEnd: '2027-07-31T00:00:00.000Z',
    exampleAt50PctKES: 28800,
  })
})
