import type { Crop, LatLng, Plan, PlanId, RiskLevel, Season } from '@/src/types'

export interface CropInfo {
  /** Expected harvest value per hectare in KES */
  valuePerHaKES: number
  /** Normal yield in tonnes per hectare */
  expectedYieldTPerHa: number
  /** NDVI range considered healthy mid-season */
  ndviHealthy: [number, number]
}

export const CROPS: Record<Crop, CropInfo> = {
  maize: {
    valuePerHaKES: 120000,
    expectedYieldTPerHa: 2.5,
    ndviHealthy: [0.45, 0.85],
  },
  beans: {
    valuePerHaKES: 90000,
    expectedYieldTPerHa: 1.2,
    ndviHealthy: [0.4, 0.8],
  },
  tea: {
    valuePerHaKES: 300000,
    expectedYieldTPerHa: 2.2,
    ndviHealthy: [0.55, 0.9],
  },
}

export const CROP_LIST: Crop[] = ['maize', 'beans', 'tea']

export const PLANS: Record<PlanId, Plan> = {
  basic: { id: 'basic', triggerYieldPct: 60, coveragePct: 0.6 },
  standard: { id: 'standard', triggerYieldPct: 70, coveragePct: 0.7 },
  premium: { id: 'premium', triggerYieldPct: 80, coveragePct: 0.8 },
}

export const PLAN_LIST: PlanId[] = ['basic', 'standard', 'premium']
export const RECOMMENDED_PLAN: PlanId = 'standard'

export const RISK_RATES: Record<RiskLevel, number> = {
  low: 0.05,
  medium: 0.07,
  high: 0.1,
}

export const SUBSIDY_PCT = 0.5
export const HEAT_STRESS_C = 32
export const BOUNDARY_LIMITS = { minHa: 0.05, maxHa: 50 }

/** Month indexes (0 = January) when each season's cover runs */
export const SEASON_WINDOWS: Record<
  Season,
  { startMonth: number; endMonth: number }
> = {
  long_rains: { startMonth: 2, endMonth: 6 },
  short_rains: { startMonth: 9, endMonth: 11 },
}

export const KENYA_CENTER: LatLng = [0.0236, 37.9062]

export const COUNTIES: string[] = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  "Murang'a",
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
]

export const COUNTY_CENTERS: Record<string, LatLng> = {
  Nakuru: [-0.3031, 36.08],
  Machakos: [-1.5177, 37.2634],
  Kericho: [-0.3689, 35.2863],
  Nairobi: [-1.2921, 36.8219],
  Kiambu: [-1.1714, 36.8356],
  'Uasin Gishu': [0.5143, 35.2698],
  'Trans Nzoia': [1.0567, 34.9507],
  Meru: [0.0463, 37.6559],
  Kisumu: [-0.0917, 34.768],
}

export function countyCenter(county: string): LatLng {
  return COUNTY_CENTERS[county] ?? KENYA_CENTER
}
