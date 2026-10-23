import type { Policy, PolicyStatus, Status } from '@/src/types'
import { nairobiMidnight } from '@/src/utils/insurance'

/**
 * The status to show: a stored 'active' policy whose cover ended before today
 * (Nairobi date) is shown as expired. Stored data is never changed.
 */
export function displayStatus(
  policy: Pick<Policy, 'status' | 'coverageEnd'>,
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

/**
 * Whether the policy insures its farm now. A paid policy whose cover starts
 * later still counts, so the farm cannot be insured twice.
 */
export function isActiveNow(
  policy: Pick<Policy, 'status' | 'coverageEnd'>,
  today: Date = new Date(),
): boolean {
  return displayStatus(policy, today) === 'active'
}

/** Whether any policy insures this farm now. */
export function isInsured(policies: Policy[], farmId: string): boolean {
  return policies.some((p) => p.farmId === farmId && isActiveNow(p))
}
