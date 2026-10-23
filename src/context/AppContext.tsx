import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { loadState, saveState } from '@/src/context/persistence'
import { resetPaymentSession } from '@/src/services/paymentRegistry'
import { appReducer, type Action } from '@/src/context/reducer'
import type { AppState, Farm, FarmFormData } from '@/src/types'
import { isActiveNow } from '@/src/utils/policy'

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: AppState
}) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState,
    (s) => s ?? loadState(),
  )
  useEffect(() => saveState(state), [state])
  // A different user (login, logout) must never inherit a payment in flight.
  const { phone, isAuthenticated } = state.auth
  useEffect(() => {
    resetPaymentSession()
  }, [phone, isAuthenticated])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export const useAuth = () => useApp().state.auth
export const useFarmer = () => useApp().state.farmer
export const useFarms = () => useApp().state.farms
export const usePolicies = () => useApp().state.policies
export const usePayouts = () => useApp().state.payouts

export function useFarm(id?: string): Farm | undefined {
  const farms = useFarms()
  return farms.find((f) => f.id === id)
}

export function usePolicyForFarm(farmId?: string) {
  const policies = usePolicies().filter((p) => p.farmId === farmId)
  return (
    policies.find((p) => isActiveNow(p)) ??
    [...policies].sort((a, b) =>
      b.coverageStart.localeCompare(a.coverageStart),
    )[0]
  )
}

export function useFarmForm() {
  const { state, dispatch } = useApp()
  const update = useCallback(
    (patch: Partial<FarmFormData>) =>
      dispatch({ type: 'UPDATE_FARM_FORM', patch }),
    [dispatch],
  )
  const start = useCallback(
    (farm?: Farm) => dispatch({ type: 'START_FARM_FORM', farm }),
    [dispatch],
  )
  const reset = useCallback(
    () => dispatch({ type: 'RESET_FARM_FORM' }),
    [dispatch],
  )
  return { form: state.farmForm, update, start, reset }
}
