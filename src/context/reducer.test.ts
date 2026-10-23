import { appReducer, emptyFarmForm, initialState } from '@/src/context/reducer'
import { buildSeedData } from '@/src/data/mockData'

const seed = buildSeedData()

test('LOGIN as a new user clears data and flags registration', () => {
  const s = appReducer(initialState, {
    type: 'LOGIN',
    phone: '+254700000001',
    isNewUser: true,
  })
  expect(s.auth).toEqual({
    isAuthenticated: true,
    phone: '+254700000001',
    isNewUser: true,
  })
  expect(s.farmer).toBeNull()
  expect(s.farms).toEqual([])
})

test('LOGIN as a returning user loads their data', () => {
  const s = appReducer(initialState, {
    type: 'LOGIN',
    phone: seed.farmer.phone,
    isNewUser: false,
    data: seed,
  })
  expect(s.farmer?.name).toBe('Wanjiru Kamau')
  expect(s.farms).toHaveLength(3)
  expect(s.payouts).toHaveLength(1)
})

test('COMPLETE_REGISTRATION stores the farmer and clears the new-user flag', () => {
  const s1 = appReducer(initialState, {
    type: 'LOGIN',
    phone: '+254700000001',
    isNewUser: true,
  })
  const s2 = appReducer(s1, {
    type: 'COMPLETE_REGISTRATION',
    farmer: { ...seed.farmer, id: 'x' },
  })
  expect(s2.farmer?.id).toBe('x')
  expect(s2.auth.isNewUser).toBe(false)
})

test('ADD_FARM, UPDATE_FARM', () => {
  const s1 = appReducer(initialState, { type: 'ADD_FARM', farm: seed.farms[0] })
  expect(s1.farms).toHaveLength(1)
  const s2 = appReducer(s1, {
    type: 'UPDATE_FARM',
    farm: { ...seed.farms[0], name: 'Renamed' },
  })
  expect(s2.farms[0].name).toBe('Renamed')
})

test('ADD_POLICY ignores a duplicate id (double tap)', () => {
  const p = seed.policies[0]
  const s = appReducer(
    appReducer(initialState, { type: 'ADD_POLICY', policy: p }),
    { type: 'ADD_POLICY', policy: p },
  )
  expect(s.policies).toHaveLength(1)
})

test('MARK_PAYOUT_READ', () => {
  const s = appReducer(
    { ...initialState, payouts: seed.payouts },
    { type: 'MARK_PAYOUT_READ', payoutId: 'payout-beans' },
  )
  expect(s.payouts[0].read).toBe(true)
})

test('farm form start, update, reset', () => {
  const editing = appReducer(initialState, {
    type: 'START_FARM_FORM',
    farm: seed.farms[0],
  })
  expect(editing.farmForm).toMatchObject({
    editingFarmId: 'farm-maize',
    name: 'Lower Shamba',
    crop: 'maize',
  })
  const fresh = appReducer(editing, { type: 'START_FARM_FORM' })
  expect(fresh.farmForm).toEqual(emptyFarmForm)
  const updated = appReducer(fresh, {
    type: 'UPDATE_FARM_FORM',
    patch: { name: 'New' },
  })
  expect(updated.farmForm.name).toBe('New')
  expect(appReducer(updated, { type: 'RESET_FARM_FORM' }).farmForm).toEqual(
    emptyFarmForm,
  )
})

test('LOGOUT returns to the initial state', () => {
  const s = appReducer(initialState, {
    type: 'LOGIN',
    phone: seed.farmer.phone,
    isNewUser: false,
    data: seed,
  })
  expect(appReducer(s, { type: 'LOGOUT' })).toEqual(initialState)
})
