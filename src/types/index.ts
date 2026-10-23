export type Crop = 'maize' | 'beans' | 'tea'
export type Season = 'long_rains' | 'short_rains'
export type RiskLevel = 'low' | 'medium' | 'high'
export type PlanId = 'basic' | 'standard' | 'premium'
export type Status = 'good' | 'warning' | 'danger'
export type BoundaryMethod = 'map' | 'quick' | 'walk' | 'draw'
/** [latitude, longitude] in degrees */
export type LatLng = [number, number]

export interface Farmer {
  id: string
  name: string
  phone: string
  county: string
  nationalId: string
  primaryCrop: Crop
}

export interface Farm {
  id: string
  name: string
  crop: Crop
  season: Season
  plantingDate: string
  boundary: LatLng[]
  areaHa: number
  county: string
  riskLevel: RiskLevel
  healthScore: number
}

export interface Plan {
  id: PlanId
  triggerYieldPct: number
  coveragePct: number
}

export type PolicyStatus = 'active' | 'expired' | 'claimed'

export interface Policy {
  id: string
  policyNumber: string
  farmId: string
  planId: PlanId
  sumInsuredKES: number
  premiumKES: number
  subsidyKES: number
  farmerPremiumKES: number
  triggerYieldPct: number
  coverageStart: string
  coverageEnd: string
  status: PolicyStatus
  mpesaReceipt: string
}

export type PayoutStage = 'triggered' | 'assessed' | 'approved' | 'sent'

export interface Payout {
  id: string
  policyId: string
  farmId: string
  /** tonnes per hectare */
  expectedYield: number
  /** tonnes per hectare */
  actualYield: number
  /** 0–100 */
  shortfallPct: number
  amountKES: number
  stage: PayoutStage
  stageDates: Partial<Record<PayoutStage, string>>
  read: boolean
}

export interface YieldData {
  year: number
  yieldTPerHa: number
  rainfallMm: number
}

export interface YieldAnalysisResult {
  history: YieldData[]
  averageYield: number
  /** years whose yield fell below the trigger share of the average */
  belowTriggerYears: number[]
  riskLevel: RiskLevel
}

export interface MonitorSeries {
  /** ISO date of the Monday of each week, oldest first */
  weeks: string[]
  ndvi: number[]
  rainfallMm: number[]
  rainfallNormalMm: number[]
  spi: number[]
  tempMinC: number[]
  tempMaxC: number[]
}

export interface FarmFormData {
  editingFarmId: string | null
  name: string
  crop: Crop | null
  season: Season | null
  plantingDate: string
  method: BoundaryMethod | null
  boundary: LatLng[]
}

export interface AuthState {
  isAuthenticated: boolean
  phone: string | null
  isNewUser: boolean
}

export interface AppState {
  auth: AuthState
  farmer: Farmer | null
  farms: Farm[]
  policies: Policy[]
  payouts: Payout[]
  farmForm: FarmFormData
}

export interface Quote {
  farmId: string
  planId: PlanId
  sumInsuredKES: number
  premiumKES: number
  subsidyKES: number
  farmerPremiumKES: number
  triggerYieldPct: number
  coverageStart: string
  coverageEnd: string
  /** payout the farmer would get if area yield fell to 50% of normal */
  exampleAt50PctKES: number
}

export interface Weather {
  tempC: number
  rainChancePct: number
  condition: 'sunny' | 'cloudy' | 'rain'
}
