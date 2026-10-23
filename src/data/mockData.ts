import {
  generateSeries,
  generateYieldHistory,
  hashString,
  type Scenario,
} from '@/src/data/generators'
import type {
  Crop,
  Farm,
  Farmer,
  LatLng,
  Payout,
  Policy,
  Season,
} from '@/src/types'
import { polygonAreaHa, squareAround } from '@/src/utils/geo'
import {
  payoutAmount,
  premiumBreakdown,
  sumInsured,
} from '@/src/utils/insurance'
import { healthScore } from '@/src/utils/monitor'
import { analyzeYield } from '@/src/utils/yield'

export const SEED_PHONE = '+254712345678'
export const MOCK_OTP = '123456'

export const SEED_SCENARIOS: Record<string, Scenario> = {
  'farm-maize': 'healthy',
  'farm-beans': 'drought',
  'farm-tea': 'normal',
  'farm-kip-tea': 'normal',
  'farm-ach-maize': 'drought',
}

export const YIELD_HISTORIES: Record<
  string,
  ReturnType<typeof generateYieldHistory>
> = {
  'Nakuru:maize': generateYieldHistory(11, 'maize', [3]),
  'Machakos:beans': generateYieldHistory(22, 'beans', [1, 4, 6, 8]),
  'Kericho:tea': generateYieldHistory(33, 'tea', [2, 7]),
  'Makueni:maize': generateYieldHistory(44, 'maize', [2, 5, 8]),
}

export interface SeedData {
  farmer: Farmer
  farms: Farm[]
  policies: Policy[]
  payouts: Payout[]
}

function seedFarm(
  id: string,
  name: string,
  crop: Crop,
  season: Season,
  county: string,
  center: LatLng,
  areaHa: number,
  plantingDate: string,
): Farm {
  const boundary = squareAround(center, areaHa)
  const series = generateSeries({
    seed: hashString(id),
    crop,
    scenario: SEED_SCENARIOS[id],
  })
  return {
    id,
    name,
    crop,
    season,
    plantingDate,
    boundary,
    areaHa: Number(polygonAreaHa(boundary).toFixed(2)),
    county,
    riskLevel: analyzeYield(YIELD_HISTORIES[`${county}:${crop}`]).riskLevel,
    healthScore: healthScore(series, crop),
  }
}

function wanjiru(): SeedData {
  const farmer: Farmer = {
    id: 'farmer-1',
    name: 'Wanjiru Kamau',
    phone: SEED_PHONE,
    county: 'Nakuru',
    nationalId: '28765431',
    primaryCrop: 'maize',
  }

  const maize = seedFarm(
    'farm-maize',
    'Lower Shamba',
    'maize',
    'short_rains',
    'Nakuru',
    [-0.2755, 36.0638],
    1.2,
    '2026-10-06T00:00:00.000Z',
  )
  const beans = seedFarm(
    'farm-beans',
    'Machakos Plot',
    'beans',
    'long_rains',
    'Machakos',
    [-1.5091, 37.2712],
    0.8,
    '2026-03-16T00:00:00.000Z',
  )
  const tea = seedFarm(
    'farm-tea',
    'Tea Garden',
    'tea',
    'long_rains',
    'Kericho',
    [-0.3598, 35.2981],
    2,
    '2019-04-01T00:00:00.000Z',
  )

  const maizeSI = sumInsured('maize', maize.areaHa, 'standard')
  const beansSI = sumInsured('beans', beans.areaHa, 'basic')

  const policies: Policy[] = [
    {
      id: 'policy-maize',
      policyNumber: 'AGR-2026-004417',
      farmId: maize.id,
      planId: 'standard',
      sumInsuredKES: maizeSI,
      ...premiumBreakdown(maizeSI, maize.riskLevel),
      triggerYieldPct: 70,
      coverageStart: '2026-10-01T00:00:00.000Z',
      coverageEnd: '2026-12-31T00:00:00.000Z',
      status: 'active',
      mpesaReceipt: 'SJK4H7Q2TZ',
    },
    {
      id: 'policy-beans',
      policyNumber: 'AGR-2026-001982',
      farmId: beans.id,
      planId: 'basic',
      sumInsuredKES: beansSI,
      ...premiumBreakdown(beansSI, beans.riskLevel),
      triggerYieldPct: 60,
      coverageStart: '2026-03-01T00:00:00.000Z',
      coverageEnd: '2026-07-31T00:00:00.000Z',
      status: 'claimed',
      mpesaReceipt: 'SC81LM3XQA',
    },
  ]

  const payouts: Payout[] = [
    {
      id: 'payout-beans',
      policyId: 'policy-beans',
      farmId: beans.id,
      expectedYield: 1.2,
      actualYield: 0.54,
      shortfallPct: 55,
      amountKES: payoutAmount(beansSI, 60, 45),
      stage: 'approved',
      stageDates: {
        triggered: '2026-09-02T00:00:00.000Z',
        assessed: '2026-09-16T00:00:00.000Z',
        approved: '2026-10-14T00:00:00.000Z',
      },
      read: false,
    },
  ]

  return { farmer, farms: [maize, beans, tea], policies, payouts }
}

function kipkoech(): SeedData {
  const farmer: Farmer = {
    id: 'farmer-2',
    name: 'Kipkoech Langat',
    phone: '+254722111222',
    county: 'Kericho',
    nationalId: '31234567',
    primaryCrop: 'tea',
  }
  const tea = seedFarm(
    'farm-kip-tea',
    'Kapsoit Tea',
    'tea',
    'long_rains',
    'Kericho',
    [-0.3912, 35.3127],
    3,
    '2018-04-02T00:00:00.000Z',
  )
  const si = sumInsured('tea', tea.areaHa, 'standard')
  const policies: Policy[] = [
    {
      id: 'policy-kip-tea',
      policyNumber: 'AGR-2025-007731',
      farmId: tea.id,
      planId: 'standard',
      sumInsuredKES: si,
      ...premiumBreakdown(si, tea.riskLevel),
      triggerYieldPct: 70,
      coverageStart: '2025-03-01T00:00:00.000Z',
      coverageEnd: '2025-07-31T00:00:00.000Z',
      status: 'expired',
      mpesaReceipt: 'RB47KQ9WZE',
    },
  ]
  return { farmer, farms: [tea], policies, payouts: [] }
}

function achieng(): SeedData {
  const farmer: Farmer = {
    id: 'farmer-3',
    name: 'Achieng Otieno',
    phone: '+254733444555',
    county: 'Makueni',
    nationalId: '29876543',
    primaryCrop: 'maize',
  }
  const maize = seedFarm(
    'farm-ach-maize',
    'Wote Field',
    'maize',
    'long_rains',
    'Makueni',
    [-1.804, 37.6203],
    1,
    '2026-03-20T00:00:00.000Z',
  )
  const si = sumInsured('maize', maize.areaHa, 'standard')
  const policies: Policy[] = [
    {
      id: 'policy-ach-maize',
      policyNumber: 'AGR-2026-003150',
      farmId: maize.id,
      planId: 'standard',
      sumInsuredKES: si,
      ...premiumBreakdown(si, maize.riskLevel),
      triggerYieldPct: 70,
      coverageStart: '2026-03-01T00:00:00.000Z',
      coverageEnd: '2026-07-31T00:00:00.000Z',
      status: 'claimed',
      mpesaReceipt: 'SH20DN6PLC',
    },
  ]
  const payouts: Payout[] = [
    {
      id: 'payout-ach',
      policyId: 'policy-ach-maize',
      farmId: maize.id,
      expectedYield: 2.5,
      actualYield: 1.25,
      shortfallPct: 50,
      amountKES: payoutAmount(si, 70, 50),
      stage: 'sent',
      stageDates: {
        triggered: '2026-08-20T00:00:00.000Z',
        assessed: '2026-09-03T00:00:00.000Z',
        approved: '2026-09-17T00:00:00.000Z',
        sent: '2026-09-19T00:00:00.000Z',
      },
      read: true,
    },
  ]
  return { farmer, farms: [maize], policies, payouts }
}

/** Every existing policyholder, in a fixed order (Wanjiru first). */
export function buildAccounts(): SeedData[] {
  return [wanjiru(), kipkoech(), achieng()]
}

/** The default account (Wanjiru) used by most tests and the phone demo hint. */
export function buildSeedData(): SeedData {
  return wanjiru()
}
