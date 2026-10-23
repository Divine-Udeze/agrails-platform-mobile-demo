import {
  displayStatus,
  policyChipStatus,
  sortPolicies,
} from '@/src/pages/profile/policyStatus'

const p = (
  status: 'active' | 'expired' | 'claimed',
  start: string,
  end: string,
) => ({
  status,
  coverageStart: start,
  coverageEnd: end,
})
const at = (iso: string) => new Date(iso)

test('active stays active through the whole last day (Nairobi date)', () => {
  const pol = p(
    'active',
    '2026-10-01T00:00:00.000Z',
    '2026-10-22T00:00:00.000Z',
  )
  expect(displayStatus(pol, at('2026-10-22T20:59:59.000Z'))).toBe('active')
  expect(displayStatus(pol, at('2026-10-22T21:00:00.000Z'))).toBe('expired')
  expect(displayStatus(pol, at('2026-12-01T00:00:00.000Z'))).toBe('expired')
})

test('claimed and expired are kept as stored and data is not mutated', () => {
  const claimed = p(
    'claimed',
    '2026-03-01T00:00:00.000Z',
    '2026-07-31T00:00:00.000Z',
  )
  expect(displayStatus(claimed, at('2026-10-23T00:00:00.000Z'))).toBe('claimed')
  const stale = p(
    'active',
    '2026-03-01T00:00:00.000Z',
    '2026-07-31T00:00:00.000Z',
  )
  displayStatus(stale, at('2026-10-23T00:00:00.000Z'))
  expect(stale.status).toBe('active')
})

test('sorting uses the displayed status', () => {
  const stale = p(
    'active',
    '2026-11-01T00:00:00.000Z',
    '2026-10-01T00:00:00.000Z',
  )
  const live = p(
    'active',
    '2026-01-01T00:00:00.000Z',
    '2026-12-31T00:00:00.000Z',
  )
  expect(sortPolicies([stale, live], at('2026-10-23T00:00:00.000Z'))).toEqual([
    live,
    stale,
  ])
})

test('chip colours', () => {
  expect(policyChipStatus('active')).toBe('good')
  expect(policyChipStatus('claimed')).toBe('warning')
  expect(policyChipStatus('expired')).toBe('neutral')
})
