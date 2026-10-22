import type { SeedData } from '@/src/data/mockData'
import type {
  AppState,
  AuthState,
  Farm,
  Farmer,
  FarmFormData,
  Policy,
} from '@/src/types'

export const emptyFarmForm: FarmFormData = {
  editingFarmId: null,
  name: '',
  crop: null,
  season: null,
  plantingDate: '',
  method: null,
  boundary: [],
}

const loggedOut: AuthState = {
  isAuthenticated: false,
  phone: null,
  isNewUser: false,
}

export const initialState: AppState = {
  auth: loggedOut,
  farmer: null,
  farms: [],
  policies: [],
  payouts: [],
  farmForm: emptyFarmForm,
}

export type Action =
  | { type: 'LOGIN'; phone: string; isNewUser: boolean; data?: SeedData }
  | { type: 'COMPLETE_REGISTRATION'; farmer: Farmer }
  | { type: 'LOGOUT' }
  | { type: 'ADD_FARM'; farm: Farm }
  | { type: 'UPDATE_FARM'; farm: Farm }
  | { type: 'ADD_POLICY'; policy: Policy }
  | { type: 'MARK_PAYOUT_READ'; payoutId: string }
  | { type: 'START_FARM_FORM'; farm?: Farm }
  | { type: 'UPDATE_FARM_FORM'; patch: Partial<FarmFormData> }
  | { type: 'RESET_FARM_FORM' }

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...initialState,
        auth: {
          isAuthenticated: true,
          phone: action.phone,
          isNewUser: action.isNewUser,
        },
        ...(action.data ?? {}),
      }
    case 'COMPLETE_REGISTRATION':
      return {
        ...state,
        farmer: action.farmer,
        auth: { ...state.auth, isNewUser: false },
      }
    case 'LOGOUT':
      return initialState
    case 'ADD_FARM':
      return { ...state, farms: [...state.farms, action.farm] }
    case 'UPDATE_FARM':
      return {
        ...state,
        farms: state.farms.map((f) =>
          f.id === action.farm.id ? action.farm : f,
        ),
      }
    case 'ADD_POLICY':
      if (state.policies.some((p) => p.id === action.policy.id)) return state
      return { ...state, policies: [...state.policies, action.policy] }
    case 'MARK_PAYOUT_READ':
      return {
        ...state,
        payouts: state.payouts.map((p) =>
          p.id === action.payoutId ? { ...p, read: true } : p,
        ),
      }
    case 'START_FARM_FORM': {
      const f = action.farm
      return {
        ...state,
        farmForm: f
          ? {
              editingFarmId: f.id,
              name: f.name,
              crop: f.crop,
              season: f.season,
              plantingDate: f.plantingDate.slice(0, 10),
              method: null,
              boundary: f.boundary,
            }
          : emptyFarmForm,
      }
    }
    case 'UPDATE_FARM_FORM':
      return { ...state, farmForm: { ...state.farmForm, ...action.patch } }
    case 'RESET_FARM_FORM':
      return { ...state, farmForm: emptyFarmForm }
  }
}
