import { emptyFarmForm, initialState } from '@/src/context/reducer'
import { CROPS, PLANS, RISK_RATES, SEASON_WINDOWS } from '@/src/data/cropConfig'
import type { AppState, AuthState, Farm, Payout, Policy } from '@/src/types'

export const AUTH_KEY = 'agrails_auth'
export const STATE_KEY = 'agrails_state'

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function isAuth(v: unknown): v is AuthState {
  const a = v as AuthState
  return (
    !!a &&
    typeof a.isAuthenticated === 'boolean' &&
    typeof a.isNewUser === 'boolean'
  )
}

type Stored = Omit<AppState, 'auth'>

function isStored(v: unknown): v is Stored {
  const s = v as Stored
  return (
    !!s &&
    typeof s === 'object' &&
    !Array.isArray(s) &&
    Array.isArray(s.farms) &&
    Array.isArray(s.policies) &&
    Array.isArray(s.payouts)
  )
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)
const isKey = (v: unknown, of: object) =>
  isStr(v) && Object.prototype.hasOwnProperty.call(of, v)
const POLICY_STATUSES = ['active', 'expired', 'claimed']
const PAYOUT_STAGES = ['triggered', 'assessed', 'approved', 'sent']

function isFarm(v: unknown): v is Farm {
  return (
    isRec(v) &&
    isStr(v.id) &&
    isStr(v.name) &&
    isKey(v.crop, CROPS) &&
    isKey(v.season, SEASON_WINDOWS) &&
    isKey(v.riskLevel, RISK_RATES) &&
    isStr(v.plantingDate) &&
    Array.isArray(v.boundary) &&
    v.boundary.length >= 3 &&
    v.boundary.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every(isNum),
    ) &&
    isNum(v.areaHa) &&
    isNum(v.healthScore) &&
    isStr(v.county)
  )
}

function isPolicy(v: unknown): v is Policy {
  return (
    isRec(v) &&
    isStr(v.id) &&
    isStr(v.farmId) &&
    isStr(v.policyNumber) &&
    isKey(v.planId, PLANS) &&
    POLICY_STATUSES.includes(v.status as string) &&
    isStr(v.coverageStart) &&
    isStr(v.coverageEnd) &&
    isNum(v.sumInsuredKES) &&
    isNum(v.premiumKES) &&
    isNum(v.subsidyKES) &&
    isNum(v.farmerPremiumKES) &&
    isNum(v.triggerYieldPct)
  )
}

function isPayout(v: unknown): v is Payout {
  return (
    isRec(v) &&
    isStr(v.id) &&
    isStr(v.farmId) &&
    isStr(v.policyId) &&
    isNum(v.amountKES) &&
    PAYOUT_STAGES.includes(v.stage as string) &&
    isRec(v.stageDates) &&
    typeof v.read === 'boolean'
  )
}

export function loadState(): AppState {
  const auth = read(AUTH_KEY)
  const stored = read(STATE_KEY)
  if (!isAuth(auth) || !auth.isAuthenticated || !isStored(stored))
    return initialState
  // A returning user must have a farmer record; otherwise treat as logged out.
  if (!auth.isNewUser && !stored.farmer) return initialState
  return {
    auth,
    farmer: stored.farmer ?? null,
    // one bad record (an old or edited save) is dropped, not allowed to crash a page
    farms: stored.farms.filter(isFarm),
    policies: stored.policies.filter(isPolicy),
    payouts: stored.payouts.filter(isPayout),
    farmForm: { ...emptyFarmForm, ...(stored.farmForm ?? {}) },
  }
}

export function saveState(state: AppState): void {
  try {
    const { auth, ...rest } = state
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
    localStorage.setItem(STATE_KEY, JSON.stringify(rest))
  } catch {
    // Storage blocked or full: the app keeps working in memory.
  }
}
