import { initialState } from '@/src/context/reducer'
import {
  AUTH_KEY,
  loadState,
  saveState,
  STATE_KEY,
} from '@/src/context/persistence'
import { buildSeedData } from '@/src/data/mockData'

afterEach(() => vi.restoreAllMocks())

test('round-trips state through localStorage', () => {
  const seed = buildSeedData()
  const state = {
    ...initialState,
    auth: { isAuthenticated: true, phone: seed.farmer.phone, isNewUser: false },
    ...seed,
  }
  saveState(state)
  expect(localStorage.getItem(AUTH_KEY)).toContain(seed.farmer.phone)
  expect(loadState()).toEqual(state)
})

test('empty storage gives the initial state', () => {
  expect(loadState()).toEqual(initialState)
})

test('corrupt JSON gives the initial state', () => {
  localStorage.setItem(AUTH_KEY, '{not json')
  localStorage.setItem(STATE_KEY, '[]')
  expect(loadState()).toEqual(initialState)
})

test('wrong shapes are ignored', () => {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      isAuthenticated: true,
      phone: '+254712345678',
      isNewUser: false,
    }),
  )
  localStorage.setItem(
    STATE_KEY,
    JSON.stringify({ farmer: null, farms: 'oops' }),
  )
  expect(loadState()).toEqual(initialState)
})

test('blocked storage does not throw', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(loadState()).toEqual(initialState)
  expect(() => saveState(initialState)).not.toThrow()
})
