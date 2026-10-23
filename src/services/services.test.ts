import { emptyFarmForm } from '@/src/context/reducer'
import { buildSeedData, MOCK_OTP, SEED_PHONE } from '@/src/data/mockData'
import {
  findPolicyholder,
  normalizePolicyNumber,
  register,
  sendOtp,
  verifyOtp,
} from '@/src/services/authService'
import {
  analyzeFarmYield,
  createFarm,
  getYieldHistory,
  updateFarm,
} from '@/src/services/farmService'
import { getWeather, seriesFor } from '@/src/services/monitorService'
import { requestMpesaPayment } from '@/src/services/paymentService'
import { createPolicy, getQuote } from '@/src/services/policyService'
import { countyCenter } from '@/src/data/cropConfig'
import { squareAround } from '@/src/utils/geo'

test('OTP: hint is the mock code; wrong code fails', async () => {
  expect((await sendOtp(SEED_PHONE)).hint).toBe(MOCK_OTP)
  expect(await verifyOtp(SEED_PHONE, '000000')).toEqual({ ok: false })
})

test('OTP: seeded phone is a returning user with data', async () => {
  const r = await verifyOtp(SEED_PHONE, MOCK_OTP)
  expect(r.ok && !r.isNewUser && r.data.farms.length).toBe(3)
})

test('OTP: any other phone is a new user', async () => {
  expect(await verifyOtp('+254700000001', MOCK_OTP)).toEqual({
    ok: true,
    isNewUser: true,
  })
})

test('OTP: every existing policyholder loads their own account', async () => {
  const kip = await verifyOtp('+254722111222', MOCK_OTP)
  expect(kip.ok && !kip.isNewUser && kip.data.farmer.name).toBe(
    'Kipkoech Langat',
  )
  const ach = await verifyOtp('+254733444555', MOCK_OTP)
  expect(ach.ok && !ach.isNewUser && ach.data.farmer.name).toBe(
    'Achieng Otieno',
  )
})

test('policy numbers normalise case, spaces and dashes', () => {
  expect(normalizePolicyNumber(' agr 2026-004417 ')).toBe('AGR2026004417')
})

test.each([
  ['policy', 'AGR-2026-004417', '+254712345678'],
  ['policy', 'agr 2026 001982', '+254712345678'],
  ['policy', 'AGR2025007731', '+254722111222'],
  ['id', '31234567', '+254722111222'],
  ['id', ' 29876543 ', '+254733444555'],
] as const)(
  'findPolicyholder(%s, %s) finds the phone on file',
  async (type, value, phone) => {
    expect(await findPolicyholder(type, value)).toEqual({ phone })
  },
)

test.each([
  ['policy', 'AGR-2026-999999'],
  ['policy', '   '],
  ['id', '11111111'],
  ['id', '123'],
] as const)('findPolicyholder(%s, %s) finds nobody', async (type, value) => {
  expect(await findPolicyholder(type, value)).toBeNull()
})

test('register trims input and returns a farmer', async () => {
  const f = await register({
    phone: '+254700000001',
    name: '  Otieno Ouma ',
    county: 'Kisumu',
    nationalId: ' 1234567 ',
    primaryCrop: 'maize',
  })
  expect(f).toMatchObject({
    name: 'Otieno Ouma',
    nationalId: '1234567',
    county: 'Kisumu',
  })
  expect(f.id).toMatch(/^farmer-/)
})

test('yield history exists for unknown county/crop and is stable', async () => {
  expect(getYieldHistory('Bomet', 'beans')).toEqual(
    getYieldHistory('Bomet', 'beans'),
  )
  expect(getYieldHistory('Bomet', 'beans')).toHaveLength(10)
  expect(
    (await analyzeFarmYield({ county: 'Machakos', crop: 'beans' })).riskLevel,
  ).toBe('high')
})

test('createFarm builds a complete farm from the form', async () => {
  const farm = await createFarm(
    {
      ...emptyFarmForm,
      name: 'River plot',
      crop: 'beans',
      season: 'short_rains',
      plantingDate: '2026-10-10',
      method: 'map',
      boundary: squareAround(countyCenter('Kisumu'), 0.5),
    },
    'Kisumu',
  )
  expect(farm.id).toMatch(/^farm-/)
  expect(farm.areaHa).toBeCloseTo(0.5, 2)
  expect(farm.healthScore).toBeGreaterThan(0)
  expect(farm.plantingDate).toBe('2026-10-10T00:00:00.000Z')
})

test('createFarm rejects an incomplete form', async () => {
  await expect(
    createFarm({ ...emptyFarmForm, name: 'x' }, 'Kisumu'),
  ).rejects.toThrow('incomplete_form')
})

test('updateFarm applies edited fields but keeps id and boundary', async () => {
  const farm = await createFarm(
    {
      ...emptyFarmForm,
      name: 'A',
      crop: 'maize',
      season: 'long_rains',
      plantingDate: '2027-03-01',
      boundary: squareAround(countyCenter('Meru'), 1),
    },
    'Meru',
  )
  const updated = await updateFarm(farm, {
    ...emptyFarmForm,
    name: 'B',
    crop: 'beans',
    season: 'short_rains',
    plantingDate: '2026-10-05',
  })
  expect(updated).toMatchObject({
    id: farm.id,
    name: 'B',
    crop: 'beans',
    boundary: farm.boundary,
  })
})

test('monitor series and weather are deterministic', () => {
  expect(seriesFor({ id: 'farm-tea', crop: 'tea' })).toEqual(
    seriesFor({ id: 'farm-tea', crop: 'tea' }),
  )
  const w = getWeather('Nakuru')
  expect(w).toEqual(getWeather('Nakuru'))
  expect(['sunny', 'cloudy', 'rain']).toContain(w.condition)
})

test('quote + policy', async () => {
  const tea = buildSeedData().farms.find((f) => f.id === 'farm-tea')!
  const q = await getQuote(tea, 'standard')
  expect(q.farmerPremiumKES).toBeGreaterThan(0)
  const p = await createPolicy(q, 'SAB12CD34E')
  expect(p).toMatchObject({
    farmId: 'farm-tea',
    planId: 'standard',
    status: 'active',
    mpesaReceipt: 'SAB12CD34E',
  })
  expect(p.policyNumber).toMatch(/^AGR-\d{4}-\d{6}$/)
})

test('M-Pesa outcomes depend on the last digit', async () => {
  const ok = await requestMpesaPayment('+254712345678', 2520)
  expect(ok.status).toBe('success')
  if (ok.status === 'success') expect(ok.receipt).toMatch(/^[A-Z0-9]{10}$/)
  expect(await requestMpesaPayment('+254712345670', 2520)).toEqual({
    status: 'failed',
  })
  expect(await requestMpesaPayment('+254712345679', 2520)).toEqual({
    status: 'timeout',
  })
})
