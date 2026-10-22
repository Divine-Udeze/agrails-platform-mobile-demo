import { emptyFarmForm, initialState } from '@/src/context/reducer'
import type { AppState, AuthState } from '@/src/types'

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
    farms: stored.farms,
    policies: stored.policies,
    payouts: stored.payouts,
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
