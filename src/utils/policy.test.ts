import { isActiveNow, isInsured } from '@/src/utils/policy'
import type { Policy } from '@/src/types'

const at = (iso: string) => new Date(iso)
const pol = (
  status: Policy['status'],
  coverageStart: string,
  coverageEnd: string,
  farmId = 'f1',
) => ({ status, coverageStart, coverageEnd, farmId }) as Policy

test('a stored active policy is not active after its cover has ended', () => {
  const p = pol(
    'active',
    '2026-03-01T00:00:00.000Z',
    '2026-10-21T00:00:00.000Z',
  )
  expect(isActiveNow(p, at('2026-10-21T12:00:00.000Z'))).toBe(true)
  expect(isActiveNow(p, at('2026-10-23T06:00:00.000Z'))).toBe(false)
})

test('a paid policy whose cover starts later still insures the farm', () => {
  const p = pol(
    'active',
    '2027-03-01T00:00:00.000Z',
    '2027-07-31T00:00:00.000Z',
  )
  expect(isActiveNow(p, at('2026-10-23T06:00:00.000Z'))).toBe(true)
})

test('claimed and expired policies are never active', () => {
  const end = '2027-07-31T00:00:00.000Z'
  const today = at('2026-10-23T06:00:00.000Z')
  expect(isActiveNow(pol('claimed', '2026-03-01', end), today)).toBe(false)
  expect(isActiveNow(pol('expired', '2026-03-01', end), today)).toBe(false)
})

test('isInsured ignores a lapsed policy and other farms', () => {
  const lapsed = pol(
    'active',
    '2020-03-01T00:00:00.000Z',
    '2020-07-31T00:00:00.000Z',
  )
  const other = pol(
    'active',
    '2026-03-01T00:00:00.000Z',
    '2099-07-31T00:00:00.000Z',
    'f2',
  )
  expect(isInsured([lapsed, other], 'f1')).toBe(false)
  expect(isInsured([lapsed, other], 'f2')).toBe(true)
})
