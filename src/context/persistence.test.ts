import { initialState } from '@/src/context/reducer'
import {
  AUTH_KEY,
  loadState,
  saveState,
  STATE_KEY,
} from '@/src/context/persistence'
import { buildAccounts, buildSeedData } from '@/src/data/mockData'

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

test('every seeded account survives the record checks', () => {
  for (const data of buildAccounts()) {
    const state = {
      ...initialState,
      auth: {
        isAuthenticated: true,
        phone: data.farmer.phone,
        isNewUser: false,
      },
      ...data,
    }
    saveState(state)
    expect(loadState()).toEqual(state)
  }
})

test('corrupt farms, policies and payouts are dropped one by one', () => {
  const seed = buildSeedData()
  const [farm, ...farms] = seed.farms
  const [policy, ...policies] = seed.policies
  const [payout, ...payouts] = seed.payouts
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      isAuthenticated: true,
      phone: seed.farmer.phone,
      isNewUser: false,
    }),
  )
  localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      ...seed,
      farms: [
        farm,
        null,
        { ...farm, id: 'bad-crop', crop: 'coffee' },
        {
          ...farm,
          id: 'bad-boundary',
          boundary: [
            [0, 0],
            [1, 1],
          ],
        },
        {
          ...farm,
          id: 'bad-point',
          boundary: [
            [0, 0],
            [1, 'x'],
            [2, 2],
          ],
        },
        { ...farm, id: 'bad-area', areaHa: '1.2' },
        { ...farm, id: 'bad-season', season: 'dry' },
        ...farms,
      ],
      policies: [
        policy,
        { ...policy, id: 'bad-status', status: 'lapsed' },
        { ...policy, id: 'bad-sum', sumInsuredKES: null },
        { ...policy, id: 'bad-end', coverageEnd: 5 },
        ...policies,
      ],
      payouts: [
        payout,
        { ...payout, id: 'bad-stage', stage: 'paid' },
        { ...payout, id: 'bad-read', read: 'yes' },
        { ...payout, id: 'bad-amount', amountKES: '10800' },
        ...payouts,
      ],
    }),
  )
  const loaded = loadState()
  expect(loaded.farms).toEqual(seed.farms)
  expect(loaded.policies).toEqual(seed.policies)
  expect(loaded.payouts).toEqual(seed.payouts)
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
