import type { PolicyStatus, Status } from '@/src/types'
import { nairobiMidnight } from '@/src/utils/insurance'

interface PolicyDates {
  status: PolicyStatus
  coverageStart: string
  coverageEnd: string
}

/**
 * The status to show: a stored 'active' policy whose cover ended before today
 * (Nairobi date) is shown as expired. Stored data is never changed.
 */
export function displayStatus(
  policy: Pick<PolicyDates, 'status' | 'coverageEnd'>,
  today: Date = new Date(),
): PolicyStatus {
  if (
    policy.status === 'active' &&
    nairobiMidnight(today) > Date.parse(policy.coverageEnd)
  ) {
    return 'expired'
  }
  return policy.status
}

/** Chip colour for a status: active is good, paid out is a warning, expired is neutral. */
export function policyChipStatus(status: PolicyStatus): Status | 'neutral' {
  if (status === 'active') return 'good'
  if (status === 'claimed') return 'warning'
  return 'neutral'
}

/** Active (by display status) first, then the newest start date first. */
export function sortPolicies<P extends PolicyDates>(
  policies: P[],
  today: Date = new Date(),
): P[] {
  const live = (p: P) => Number(displayStatus(p, today) === 'active')
  return [...policies].sort(
    (a, b) =>
      live(b) - live(a) || b.coverageStart.localeCompare(a.coverageStart),
  )
}
