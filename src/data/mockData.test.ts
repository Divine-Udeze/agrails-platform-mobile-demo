import { buildAccounts, buildSeedData, SEED_PHONE } from '@/src/data/mockData'

test('seed farmer has three farms telling different stories', () => {
  const d = buildSeedData()
  expect(d.farmer.phone).toBe(SEED_PHONE)
  const byId = Object.fromEntries(d.farms.map((f) => [f.id, f]))
  expect(byId['farm-maize'].areaHa).toBe(1.2)
  expect(byId['farm-maize'].riskLevel).toBe('low')
  expect(byId['farm-maize'].healthScore).toBeGreaterThanOrEqual(80)
  expect(byId['farm-beans'].riskLevel).toBe('high')
  expect(byId['farm-beans'].healthScore).toBeLessThan(45)
  expect(byId['farm-tea'].riskLevel).toBe('medium')
})

test('maize and beans are insured, tea is not', () => {
  const d = buildSeedData()
  expect(d.policies.map((p) => p.farmId).sort()).toEqual([
    'farm-beans',
    'farm-maize',
  ])
  const maize = d.policies.find((p) => p.id === 'policy-maize')!
  expect(maize.sumInsuredKES).toBe(100800)
  expect(maize.premiumKES).toBe(5040)
  expect(maize.status).toBe('active')
})

test('beans payout is approved and unread', () => {
  const [p] = buildSeedData().payouts
  expect(p).toMatchObject({
    id: 'payout-beans',
    amountKES: 10800,
    stage: 'approved',
    read: false,
  })
})

test('three policyholders with unique phones, IDs and policy numbers', () => {
  const accounts = buildAccounts()
  expect(accounts.map((a) => a.farmer.name)).toEqual([
    'Wanjiru Kamau',
    'Kipkoech Langat',
    'Achieng Otieno',
  ])
  expect(new Set(accounts.map((a) => a.farmer.phone)).size).toBe(3)
  expect(new Set(accounts.map((a) => a.farmer.nationalId)).size).toBe(3)
  const numbers = accounts.flatMap((a) => a.policies.map((p) => p.policyNumber))
  expect(new Set(numbers).size).toBe(numbers.length)
  expect(buildSeedData()).toEqual(accounts[0])
})

test('Kipkoech has only an expired tea policy', () => {
  const kip = buildAccounts()[1]
  expect(kip.farmer).toMatchObject({
    phone: '+254722111222',
    nationalId: '31234567',
    county: 'Kericho',
  })
  expect(kip.farms.map((f) => f.id)).toEqual(['farm-kip-tea'])
  expect(kip.policies).toEqual([
    expect.objectContaining({
      policyNumber: 'AGR-2025-007731',
      status: 'expired',
    }),
  ])
  expect(kip.payouts).toEqual([])
})

test('Achieng has a claimed maize policy whose payout was sent', () => {
  const ach = buildAccounts()[2]
  expect(ach.farmer).toMatchObject({
    phone: '+254733444555',
    nationalId: '29876543',
    county: 'Makueni',
  })
  expect(ach.policies[0]).toMatchObject({
    policyNumber: 'AGR-2026-003150',
    status: 'claimed',
    sumInsuredKES: 84000,
  })
  expect(ach.payouts[0]).toMatchObject({
    id: 'payout-ach',
    amountKES: 24000,
    stage: 'sent',
    read: true,
  })
})
